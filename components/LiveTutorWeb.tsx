import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getLiveToken } from "../lib/getLiveToken";

// --- minimal PCM helpers (based on your demo utils.ts) ---
function f32ToPcmBlobBase64(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const v = Math.max(-1, Math.min(1, data[i]));
    int16[i] = v < 0 ? v * 32768 : v * 32767;
  }
  const bytes = new Uint8Array(int16.buffer);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function decodePcm16ToAudioBuffer(
  pcmBytes: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  channels: number
) {
  const buffer = ctx.createBuffer(channels, pcmBytes.length / 2 / channels, sampleRate);
  const int16 = new Int16Array(pcmBytes.buffer);
  const f32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) f32[i] = int16[i] / 32768.0;
  if (channels === 1) {
    buffer.copyToChannel(f32, 0);
  } else {
    for (let ch = 0; ch < channels; ch++) {
      const channel = f32.filter((_, idx) => idx % channels === ch);
      buffer.copyToChannel(channel, ch);
    }
  }
  return buffer;
}

type Props = {
  lessonContextText: string; // already compact
  onClose: () => void;
};

export default function LiveTutorWeb({ lessonContextText, onClose }: Props) {
  const [status, setStatus] = useState<"idle" | "connecting" | "listening" | "speaking" | "error">("idle");
  const [err, setErr] = useState<string>("");

  const sessionRef = useRef<Session | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const srcNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartRef = useRef<number>(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const [inLevel, setInLevel] = useState(0);
  const [outLevel, setOutLevel] = useState(0);
  const [paused, setPaused] = useState(false);

  const systemInstruction = useMemo(() => {
    return `
You are a real-time voice tutor.
Teach the student using the lesson context below.
Be interactive: ask short check questions.
If the student interrupts, adapt and continue.
Keep responses concise and spoken-friendly.

LESSON CONTEXT:
${lessonContextText}
`.trim();
  }, [lessonContextText]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopAll();
      stopVisualLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    try {
      setErr("");
      setStatus("connecting");

      const token = await getLiveToken();
      const ai = new GoogleGenAI({
  apiKey: token,
  httpOptions: { apiVersion: "v1alpha" },
});

      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputCtxRef.current = outputCtx;
      nextStartRef.current = outputCtx.currentTime;

      // create output analyser and hook visualiser
      const outputAnalyser = makeAnalyser(outputCtx);
      outputAnalyserRef.current = outputAnalyser;
      // route: source -> analyser -> destination
      outputAnalyser.connect(outputCtx.destination);

      startVisualLoop();

      const model = "gemini-2.5-flash-native-audio-preview-12-2025"; // keep for now (audio-native live)
      const s = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => setStatus("idle"),
          onmessage: async (message: LiveServerMessage) => {
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              stopPlayback();
              return;
            }

            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio?.data && outputCtxRef.current) {
              setStatus("speaking");

              const bytes = base64ToBytes(audio.data);
              const audioBuffer = await decodePcm16ToAudioBuffer(bytes, outputCtxRef.current, 24000, 1);

              const source = outputCtxRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAnalyserRef.current!);
              source.addEventListener("ended", () => {
                playingSourcesRef.current.delete(source);
                if (playingSourcesRef.current.size === 0 && status !== "listening") {
                  // if user isn't talking, return to idle
                  setStatus((prev) => (prev === "speaking" ? "idle" : prev));
                }
              });

              // schedule sequential playback
              const startAt = Math.max(nextStartRef.current, outputCtxRef.current.currentTime);
              source.start(startAt);
              nextStartRef.current = startAt + audioBuffer.duration;
              playingSourcesRef.current.add(source);
            }
          },
          onerror: (e: any) => {
            setErr(e?.message ?? "Live error");
            setStatus("error");
          },
          onclose: (e: any) => {
            // do not hard-error; allow reconnect
            setStatus("idle");
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } },
          },
        },
      });

      sessionRef.current = s;
      setStatus("idle");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to connect");
      setStatus("error");
    }
  }

  function stopPlayback() {
    for (const source of playingSourcesRef.current.values()) {
      try { source.stop(); } catch {}
      playingSourcesRef.current.delete(source);
    }
    nextStartRef.current = 0;
  }

  function makeAnalyser(ctx: AudioContext) {
    const a = ctx.createAnalyser();
    a.fftSize = 256;
    a.smoothingTimeConstant = 0.85;
    return a;
  }

  function analyserLevel(a: AnalyserNode) {
    const arr = new Uint8Array(a.frequencyBinCount);
    a.getByteFrequencyData(arr);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    const avg = sum / (arr.length * 255);
    return Math.min(1, avg * 1.6);
  }

  function startVisualLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = () => {
      const ia = inputAnalyserRef.current;
      const oa = outputAnalyserRef.current;
      if (ia) setInLevel(analyserLevel(ia));
      if (oa) setOutLevel(analyserLevel(oa));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  function stopVisualLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  async function startMic() {
    try {
      if (!sessionRef.current) await connect();
      if (!sessionRef.current) throw new Error("No live session");

      // interrupt model audio if user starts talking
      stopPlayback();

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const src = inputCtx.createMediaStreamSource(stream);
      srcNodeRef.current = src;

      // input analyser for mic visualisation
      const inputAnalyser = makeAnalyser(inputCtx);
      inputAnalyserRef.current = inputAnalyser;

      // route: mic source -> analyser -> (existing chain)
      src.connect(inputAnalyser);

      const proc = inputCtx.createScriptProcessor(256, 1, 1);
      procRef.current = proc;

      proc.onaudioprocess = (evt) => {
        if (!sessionRef.current) return;
        const pcm = evt.inputBuffer.getChannelData(0);
        sessionRef.current.sendRealtimeInput({
          audio: { data: f32ToPcmBlobBase64(pcm), mimeType: "audio/pcm;rate=16000" },
        });
      };

      src.connect(proc);
      proc.connect(inputCtx.destination);

      setStatus("listening");
    } catch (e: any) {
      setErr(e?.message ?? "Mic failed");
      setStatus("error");
    }
  }

  function stopMic() {
    try {
      procRef.current?.disconnect();
      srcNodeRef.current?.disconnect();
      procRef.current = null;
      srcNodeRef.current = null;

      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;

      // clear input analyser
      try { inputAnalyserRef.current?.disconnect(); } catch {}
      inputAnalyserRef.current = null;

      setStatus("idle");
    } catch {}
  }

  function stopAll() {
    stopMic();
    stopPlayback();
    try { sessionRef.current?.close(); } catch {}
    sessionRef.current = null;

    try { outputCtxRef.current?.close(); } catch {}
    outputCtxRef.current = null;
    // clear output analyser and visual loop
    try { outputAnalyserRef.current?.disconnect(); } catch {}
    outputAnalyserRef.current = null;
    stopVisualLoop();
  }

  function pauseAll() {
    setPaused(true);
    stopMic();
    stopPlayback();
    // keep session open
  }

  function resumeAll() {
    setPaused(false);
    // don't auto-start mic; user taps Talk
  }

  function stopSession() {
    setPaused(false);
    stopAll();
    stopVisualLoop();
  }

  if (Platform.OS !== "web") return null;

  const isListening = status === "listening";
  const isSpeaking = status === "speaking";
  const isConnecting = status === "connecting";

  const scale = 1 + (isListening ? inLevel : 0) * 0.25 + (isSpeaking ? outLevel : 0) * 0.35;

  return (
    <View style={st.overlay}>
      <View style={st.sheet}>
        <View style={st.headerRow}>
          <Text style={st.hTitle}>Live Tutor</Text>
          <TouchableOpacity onPress={() => { stopAll(); onClose(); }}>
            <Text style={st.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={st.orbWrap}>
          <View style={[st.orb, { transform: [{ scale }] }, (isListening || isSpeaking || isConnecting) && st.orbActive]} />
          <Text style={st.stateText}>
            {isConnecting ? "Connecting…" : isListening ? "Listening…" : isSpeaking ? "Tutor speaking…" : paused ? "Paused" : "Ready"}
          </Text>
          {!!err && <Text style={st.err}>{err}</Text>}
        </View>

        <View style={st.row}>
          {!isListening ? (
            <TouchableOpacity style={st.btn} onPress={startMic} disabled={paused}>
              <Text style={st.btnText}>{paused ? "Paused" : "Talk"}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={st.btn} onPress={stopMic}>
              <Text style={st.btnText}>Stop Talk</Text>
            </TouchableOpacity>
          )}

          {!paused ? (
            <TouchableOpacity style={st.btnGhost} onPress={pauseAll}>
              <Text style={st.btnGhostText}>Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={st.btnGhost} onPress={resumeAll}>
              <Text style={st.btnGhostText}>Resume</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={st.btnDanger} onPress={stopSession}>
            <Text style={st.btnDangerText}>Stop</Text>
          </TouchableOpacity>
        </View>

        <Text style={st.tip}>Tip: You can interrupt the tutor by tapping Talk while it’s speaking.</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  close: { color: "#fff", fontSize: 18, padding: 6 },

  orbWrap: { alignItems: "center", paddingVertical: 18 },
  orb: {
    width: 74, height: 74, borderRadius: 999,
    backgroundColor: "#2a2a2a",
    transform: [{ scale: 1 }],
  },
  orbActive: {
    backgroundColor: "#3a3a3a",
    transform: [{ scale: 1.06 }],
  },
  stateText: { color: "#cfcfcf", marginTop: 10 },
  err: { color: "#ff6b6b", marginTop: 8, textAlign: "center" },

  row: { flexDirection: "row", gap: 10, justifyContent: "center" },
  btn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  btnText: { color: "#000", fontWeight: "800" },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  btnGhostText: { color: "#fff", fontWeight: "800" },
  tip: { color: "#9a9a9a", marginTop: 10, textAlign: "center", fontSize: 12 },
  btnDanger: {
    borderWidth: 1,
    borderColor: "#552222",
    backgroundColor: "#1a0f0f",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  btnDangerText: { color: "#ff6b6b", fontWeight: "800" },
});
