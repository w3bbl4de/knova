import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getLiveToken } from "../lib/getLiveToken";


import { base64ToBytes, decodePcm16ToFloat32, f32ToPcm16Base64 } from "../lib/audio/pcm";
import { drawOrb2D } from "../lib/visual/orb2d";

type Props = {
  lessonContextText: string;
  onClose: () => void;
};

type Status = "idle" | "connecting" | "listening" | "speaking" | "error";

export default function LiveTutorWeb({ lessonContextText, onClose }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const statusRef = useRef<Status>("idle");
  const [err, setErr] = useState<string>("");

  const sessionRef = useRef<Session | null>(null);

  // Mic capture
  const micStreamRef = useRef<MediaStream | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const srcNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);

  // Output playback + queueing
  const outputCtxRef = useRef<AudioContext | null>(null);
  const nextStartRef = useRef<number>(0);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Analysers
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  // Visualiser (orb canvas)
  const orbCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const inBinsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const outBinsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const orbPhaseRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const [inLevel, setInLevel] = useState(0);
  const [outLevel, setOutLevel] = useState(0);
  const [paused, setPaused] = useState(false);

  const isListening = status === "listening";
  const isSpeaking = status === "speaking";
  const isConnecting = status === "connecting";

  // ---- Control bar UI state ----
const [tooltip, setTooltip] = useState<
  null | "Reset" | "Start Teaching" | "Pause Teaching"
>(null);

// Pulse animation for the red record button
const pulseScale = useRef(new Animated.Value(1)).current;
const pulseOpacity = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (!isListening) {
    pulseScale.stopAnimation();
    pulseOpacity.stopAnimation();
    pulseScale.setValue(1);
    pulseOpacity.setValue(0);
    return;
  }

  pulseScale.setValue(1);
  pulseOpacity.setValue(0.85);

  const loop = Animated.loop(
    Animated.parallel([
      Animated.timing(pulseScale, {
        toValue: 1.6,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pulseOpacity, {
        toValue: 0,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ])
  );

  loop.start();
  return () => loop.stop();
}, [isListening]);


  useEffect(() => {
    statusRef.current = status;
  }, [status]);

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

  // init canvas ctx once
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (orbCanvasRef.current) {
      orbCtxRef.current = orbCanvasRef.current.getContext("2d");
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAll();
      stopVisualLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function makeAnalyser(ctx: AudioContext) {
    const a = ctx.createAnalyser();
    a.fftSize = 256;
    a.smoothingTimeConstant = 0.9;
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

      const inL = ia ? analyserLevel(ia) : 0;
      const outL = oa ? analyserLevel(oa) : 0;

      setInLevel(inL);
      setOutLevel(outL);

      // allocate & fill bins for “edge texture”
      if (ia && !inBinsRef.current) inBinsRef.current = new Uint8Array(ia.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      if (oa && !outBinsRef.current) outBinsRef.current = new Uint8Array(oa.frequencyBinCount) as Uint8Array<ArrayBuffer>;


      // ✅ fix: non-null assertions to satisfy TS narrowing
      if (ia && inBinsRef.current) ia.getByteFrequencyData(inBinsRef.current);
      if (oa && outBinsRef.current) oa.getByteFrequencyData(outBinsRef.current);


      const ctx = orbCtxRef.current;
      const canvas = orbCanvasRef.current;
      if (ctx && canvas) {
        drawOrb2D(ctx, canvas, {
          inLevel: inL,
          outLevel: outL,
          inBins: inBinsRef.current,
          outBins: outBinsRef.current,
          phaseRef: orbPhaseRef,
          active:
            statusRef.current === "listening" ||
            statusRef.current === "speaking" ||
            statusRef.current === "connecting",
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }

  function stopVisualLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  async function connect() {
    try {
      setErr("");
      setStatus("connecting");

      const token = await getLiveToken();

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      // output audio context (24k)
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      outputCtxRef.current = outputCtx;
      nextStartRef.current = outputCtx.currentTime;

      // output analyser chain: source -> analyser -> destination
      const outputAnalyser = makeAnalyser(outputCtx);
      outputAnalyserRef.current = outputAnalyser;
      outputAnalyser.connect(outputCtx.destination);

      startVisualLoop();

      const model = "gemini-2.5-flash-native-audio-preview-12-2025";

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
              setStatus((prev) => (prev === "listening" ? prev : "speaking"));

              const bytes = base64ToBytes(audio.data);
              const f32 = decodePcm16ToFloat32(bytes);
              const ctx = outputCtxRef.current;

              // Create AudioBuffer at 24k, mono
              const buffer = ctx.createBuffer(1, f32.length, 24000);

              // ✅ fix: avoid copyToChannel typing/runtime issues
              buffer.getChannelData(0).set(f32);

              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAnalyserRef.current!);

              source.addEventListener("ended", () => {
                playingSourcesRef.current.delete(source);
                if (playingSourcesRef.current.size === 0 && statusRef.current !== "listening") {
                  setStatus((prev) => (prev === "speaking" ? "idle" : prev));
                }
              });

              const startAt = Math.max(nextStartRef.current, ctx.currentTime);
              source.start(startAt);
              nextStartRef.current = startAt + buffer.duration;
              playingSourcesRef.current.add(source);
            }
          },
          onerror: (e: any) => {
            setErr(e?.message ?? "Live error");
            setStatus("error");
          },
          onclose: () => {
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
      try {
        source.stop();
      } catch {}
      playingSourcesRef.current.delete(source);
    }
    nextStartRef.current = 0;
  }

  async function startMic() {
    try {
      if (paused) return;

      if (!sessionRef.current) await connect();
      if (!sessionRef.current) throw new Error("No live session");

      // interrupt model audio if user starts talking
      stopPlayback();

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      inputCtxRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;

      const src = inputCtx.createMediaStreamSource(stream);
      srcNodeRef.current = src;

      // input analyser (mic)
      const inputAnalyser = makeAnalyser(inputCtx);
      inputAnalyserRef.current = inputAnalyser;
      src.connect(inputAnalyser);

      const proc = inputCtx.createScriptProcessor(256, 1, 1);
      procRef.current = proc;

      proc.onaudioprocess = (evt) => {
        const s = sessionRef.current;
        if (!s) return;

        const pcm = evt.inputBuffer.getChannelData(0);
        s.sendRealtimeInput({
          audio: { data: f32ToPcm16Base64(pcm), mimeType: "audio/pcm;rate=16000" },
        });
      };

      // Avoid echo: connect processor to a zero-gain node (not speakers)
      const zero = inputCtx.createGain();
      zero.gain.value = 0;

      src.connect(proc);
      proc.connect(zero);
      zero.connect(inputCtx.destination);

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

      try {
        inputAnalyserRef.current?.disconnect();
      } catch {}
      inputAnalyserRef.current = null;

      try {
        inputCtxRef.current?.close();
      } catch {}
      inputCtxRef.current = null;

      setStatus("idle");
    } catch {}
  }

  function stopAll() {
    stopMic();
    stopPlayback();

    try {
      sessionRef.current?.close();
    } catch {}
    sessionRef.current = null;

    try {
      outputCtxRef.current?.close();
    } catch {}
    outputCtxRef.current = null;

    try {
      outputAnalyserRef.current?.disconnect();
    } catch {}
    outputAnalyserRef.current = null;

    inBinsRef.current = null;
    outBinsRef.current = null;

    setStatus("idle");
  }

async function resetSession() {
  try {
    setErr("");
    setStatus("connecting");

    // fully tear down audio + session
    stopAll();

    // create a brand-new live session
    await connect();

    setStatus("idle");
  } catch (e: any) {
    setErr(e?.message ?? "Reset failed");
    setStatus("error");
  }
}


  function pauseAll() {
    setPaused(true);
    stopMic();
    stopPlayback();
  }

  function resumeAll() {
    setPaused(false);
  }

  function stopSession() {
    setPaused(false);
    stopAll();
    stopVisualLoop();
  }

  if (Platform.OS !== "web") return null;

  const scale = 1 + (isListening ? inLevel : 0) * 0.25 + (isSpeaking ? outLevel : 0) * 0.35;

  return (
    <View style={st.overlay}>
      <View style={st.sheet}>
        <View style={st.headerRow}>
          <Text style={st.hTitle}>Live Tutor</Text>
          <TouchableOpacity
            onPress={() => {
              stopAll();
              onClose();
            }}
          >
            <Text style={st.close}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={st.orbWrap}>
          <View style={{ transform: [{ scale }] }}>
            <canvas
              ref={orbCanvasRef}
              width={260}
              height={260}
              style={{
                width: 110,
                height: 110,
                borderRadius: 999,
                display: "block",
              }}
            />
          </View>

          <Text style={st.stateText}>
            {isConnecting
              ? "Connecting…"
              : isListening
              ? "Listening…"
              : isSpeaking
              ? "Tutor speaking…"
              : paused
              ? "Paused"
              : "Ready"}
          </Text>
          {!!err && <Text style={st.err}>{err}</Text>}
        </View>

       <View style={st.controlsWrap}>
  {/* tooltip */}
  {!!tooltip && (
    <View style={st.tooltip}>
      <Text style={st.tooltipText}>{tooltip}</Text>
    </View>
  )}

  <View style={[st.controls, isListening && st.controlsRecording]}>
    {/* Reset */}
    <Pressable
      onPress={resetSession}
      disabled={isConnecting}
      onHoverIn={() => setTooltip("Reset")}
      onHoverOut={() => setTooltip(null)}
      onPressIn={() => setTooltip("Reset")}
      onPressOut={() => setTooltip(null)}
      style={({ pressed }) => [
        st.ctrlBtn,
        pressed && st.ctrlBtnPressed,
        isConnecting && st.ctrlBtnDisabled,
      ]}
      accessibilityLabel="Reset Session"
    >
      <Text style={st.ctrlIcon}>↻</Text>
    </Pressable>

    {/* Start Teaching */}
    <View style={{ position: "relative" }}>
      {isListening && (
        <Animated.View
          pointerEvents="none"
          style={[
            st.pulseRing,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
      )}

      <Pressable
        onPress={startMic}
        disabled={paused || isListening || isConnecting}
        onHoverIn={() => setTooltip("Start Teaching")}
        onHoverOut={() => setTooltip(null)}
        onPressIn={() => setTooltip("Start Teaching")}
        onPressOut={() => setTooltip(null)}
        style={({ pressed }) => [
          st.ctrlBtn,
          pressed && st.ctrlBtnPressed,
          (paused || isListening || isConnecting) && st.ctrlBtnDisabled,
        ]}
        accessibilityLabel="Start Teaching"
      >
        <View style={st.redDot} />
      </Pressable>
    </View>

    {/* Pause Teaching */}
    <Pressable
      onPress={() => {
        // “Pause teaching”: stop mic and stop playback, keep session open
        stopMic();
        stopPlayback();
        setStatus("idle");
      }}
      disabled={!isListening && !isSpeaking}
      onHoverIn={() => setTooltip("Pause Teaching")}
      onHoverOut={() => setTooltip(null)}
      onPressIn={() => setTooltip("Pause Teaching")}
      onPressOut={() => setTooltip(null)}
      style={({ pressed }) => [
        st.ctrlBtn,
        pressed && st.ctrlBtnPressed,
        (!isListening && !isSpeaking) && st.ctrlBtnDisabled,
      ]}
      accessibilityLabel="Pause Teaching"
    >
      <Text style={st.ctrlIcon}>■</Text>
    </Pressable>
  </View>
</View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 16,
  },

controlsWrap: {
  alignItems: "center",
  marginTop: 10,
  marginBottom: 6,
},

tooltip: {
  marginBottom: 10,
  backgroundColor: "rgba(0,0,0,0.65)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 8,
},

tooltipText: {
  color: "#fff",
  fontSize: 13,
  fontWeight: "700",
},

controls: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 18,
  paddingVertical: 14,
  paddingHorizontal: 22,
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.06)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
  // RN Web supports these two via style passthrough:
  // @ts-ignore
  backdropFilter: "blur(10px)",
  // @ts-ignore
  boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
},

controlsRecording: {
  borderColor: "rgba(255,77,77,0.35)",
},

ctrlBtn: {
  width: 58,
  height: 58,
  borderRadius: 999,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.08)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.10)",
},

ctrlBtnPressed: {
  transform: [{ scale: 0.96 }],
},

ctrlBtnDisabled: {
  opacity: 0.35,
},

ctrlIcon: {
  color: "#fff",
  fontSize: 22,
  fontWeight: "800",
  lineHeight: 22,
},

redDot: {
  width: 22,
  height: 22,
  borderRadius: 999,
  backgroundColor: "#ff4d4d",
},

pulseRing: {
  position: "absolute",
  left: 0,
  top: 0,
  width: 58,
  height: 58,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: "#ff4d4d",
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
