import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Course, getCourseById } from "../../../../lib/courses";
import { generateLesson } from "../../../../lib/generateLesson";
import { supabase } from "../../../../lib/supabase";

export default function LessonScreen() {
  const { courseId, lessonId } = useLocalSearchParams<{ courseId: string; lessonId: string }>();
  const cid = String(courseId ?? "");
  const lid = String(lessonId ?? "");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      console.log("has session:", !!data.session);
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

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.breadcrumb}>
          Module {moduleIndex + 1}: {module.title}
        </Text>

        <Text style={s.title}>
          {moduleIndex + 1}.{lessonIndex + 1} {lesson.title}
        </Text>

        {/* If you later add objective/duration to your TOC, show it here */}
        {/* <Text style={s.meta}>{lesson.objective}</Text> */}

        <View style={s.card}>
          <Text style={s.cardTitle}>Lesson content</Text>
          <Text style={s.muted}>
            Not generated yet. Next we’ll add a “Generate lesson” button and store content per-lesson.
          </Text>

          <TouchableOpacity
            style={[s.button, { marginTop: 12, opacity: generating ? 0.7 : 1 }]}
            disabled={generating}
            onPress={async () => {
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
            }}
          >
            <Text style={s.buttonText}>{generating ? "Generating..." : "Generate lesson"}</Text>
          </TouchableOpacity>

          {lesson.content?.content_blocks?.length ? (
            <View style={{ marginTop: 14 }}>
              {lesson.content.content_blocks.map((b: any, idx: number) => (
                <View key={idx} style={{ marginTop: 12 }}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>{b.title}</Text>
                  <Text style={{ color: "#cfcfcf", marginTop: 6, lineHeight: 20 }}>{b.content}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.muted}>No generated content yet.</Text>
          )}

          <TouchableOpacity
            style={[s.ghostBtn, { marginTop: 12, opacity: 0.5 }]}
            disabled
            onPress={() => {}}
          >
            <Text style={s.ghostText}>Start Live Tutor (next step)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },

  breadcrumb: { color: "#9a9a9a", fontSize: 12, marginBottom: 10 },
  title: { color: "#fff", fontSize: 22, fontWeight: "800" },
  meta: { color: "#9a9a9a", marginTop: 10 },
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
