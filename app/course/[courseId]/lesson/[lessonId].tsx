import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LiveTutorWeb from "../../../../components/LiveTutorWeb";
import { Course, getCourseById } from "../../../../lib/courses";
import { generateLesson } from "../../../../lib/generateLesson";

export default function LessonScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const cid = String(courseId ?? "");
  const lid = String(lessonId ?? "");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showTutor, setShowTutor] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const c = await getCourseById(cid);
      setCourse(c);
    } catch (e: any) {
      Alert.alert("Failed to load lesson", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cid || !lid) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, lid]);

  const resolved = useMemo(() => {
    const modules = course?.ai_plan?.modules ?? [];
    for (let mi = 0; mi < modules.length; mi++) {
      const m = modules[mi];
      const lessons = m.lessons ?? [];
      for (let li = 0; li < lessons.length; li++) {
        const l = lessons[li];
        if (l.id === lid) {
          return { moduleIndex: mi, lessonIndex: li, module: m, lesson: l };
        }
      }
    }
    return null;
  }, [course, lid]);

  const lessonContextText = useMemo(() => {
    if (!resolved) return "";
    const { lesson, module } = resolved;

    const blocks = (lesson as any)?.content?.content_blocks ?? [];
    const compactBlocks = blocks
      .slice(0, 8)
      .map((b: any) => `- ${b.title}: ${String(b.content ?? "").slice(0, 140)}`)
      .join("\n");

    return `
Course: ${course?.subject} (${course?.level})
Module: ${module.title}
Lesson: ${lesson.title}

Key points:
${compactBlocks || "- (No generated blocks yet)"}
`.trim();
  }, [resolved, course]);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={s.muted}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course || !resolved) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.title}>Lesson not found</Text>
          <TouchableOpacity style={s.button} onPress={() => router.back()}>
            <Text style={s.buttonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { module, lesson, moduleIndex, lessonIndex } = resolved;

  // ✅ single source of truth
  const hasGeneratedLesson = !!lesson.content?.content_blocks?.length;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.breadcrumb}>
          Module {moduleIndex + 1}: {module.title}
        </Text>

        <Text style={s.title}>
          {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
        </Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>Lesson content</Text>

          {!hasGeneratedLesson && (
            <Text style={s.muted}>
              Not generated yet. Generate the lesson to unlock the Live Tutor.
            </Text>
          )}

          {/* ✅ SINGLE PRIMARY ACTION BUTTON */}
          <TouchableOpacity
            style={[
              hasGeneratedLesson ? s.ghostBtn : s.button,
              { marginTop: 12, opacity: generating ? 0.7 : 1 },
            ]}
            disabled={generating}
            onPress={async () => {
              if (!hasGeneratedLesson) {
                try {
                  if (!cid || !lid) throw new Error("Missing route params");
                  setGenerating(true);
                  await generateLesson(cid, lid);
                  await load();
                } catch (e: any) {
                  Alert.alert("Generate lesson failed", e?.message ?? "Unknown error");
                } finally {
                  setGenerating(false);
                }
                return;
              }

              if (Platform.OS !== "web") {
                Alert.alert(
                  "Live Tutor (Web only)",
                  "Open this lesson on the web version to use Live Tutor."
                );
                return;
              }

              setShowTutor(true);
            }}
          >
            <Text style={hasGeneratedLesson ? s.ghostText : s.buttonText}>
              {hasGeneratedLesson
                ? "Start Live Tutor"
                : generating
                ? "Generating..."
                : "Generate lesson"}
            </Text>
          </TouchableOpacity>

          {/* Render generated content */}
          {hasGeneratedLesson && (
            <View style={{ marginTop: 16 }}>
              {lesson.content!.content_blocks.map((b: any, idx: number) => (
                <View key={idx} style={{ marginTop: 12 }}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>{b.title}</Text>
                  <Text style={{ color: "#cfcfcf", marginTop: 6, lineHeight: 20 }}>
                    {b.content}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {showTutor && Platform.OS === "web" && (
        <LiveTutorWeb
          lessonContextText={lessonContextText}
          onClose={() => setShowTutor(false)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },

  breadcrumb: { color: "#9a9a9a", fontSize: 12, marginBottom: 10 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  muted: { color: "#9a9a9a", marginTop: 8 },

  card: {
    marginTop: 18,
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

  button: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  buttonText: { color: "#000", fontSize: 15, fontWeight: "700" },

  ghostBtn: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 12,
    borderRadius: 28,
    alignItems: "center",
  },
  ghostText: { color: "#fff", fontWeight: "700" },
});
