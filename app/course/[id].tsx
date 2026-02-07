// app/course/[id].tsx
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Course, getCourseById } from "../../lib/courses";
import { generateCourse } from "../../lib/generateCourse";


export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = String(id ?? "");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const c = await getCourseById(courseId);
      setCourse(c);
    } catch (e: any) {
      Alert.alert("Failed to load course", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator />
          <Text style={s.muted}>Loading course…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <Text style={s.title}>Course not found</Text>
          <TouchableOpacity style={s.button} onPress={() => router.back()}>
            <Text style={s.buttonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{course.subject}</Text>
        <Text style={s.subtitle}>{course.goal}</Text>

        <Text style={s.meta}>
          {course.level}
          {course.pace ? ` • ${course.pace}` : ""}
        </Text>

        {/* Status-based UI */}
        {course.status === "draft" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Not generated yet</Text>
            <Text style={s.muted}>
              Next step: generate modules and lessons with AI.
            </Text>

            {/* For Step 3 we’ll wire this button to start Gemini */}
            <TouchableOpacity
              style={[s.button, { marginTop: 12 }]}
              onPress={async () => {
  try {
    await generateCourse(course.id);
    await load(); // re-fetch course → status should now be "generating"
  } catch (e: any) {
    Alert.alert(
      "Generation failed",
      String(e?.message ?? e)
    );
  }
}}

            >
              <Text style={s.buttonText}>Generate course</Text>
            </TouchableOpacity>
          </View>
        )}

        {course.status === "generating" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Generating…</Text>
            <Text style={s.muted}>
              Your course is being created. You can leave this screen and come back.
            </Text>

            <TouchableOpacity style={[s.ghostBtn, { marginTop: 12 }]} onPress={load}>
              <Text style={s.ghostText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {course.status === "failed" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Generation failed</Text>
            {!!course.ai_error && <Text style={s.errorText}>{course.ai_error}</Text>}

            {/* Step 3 will turn this into a real retry */}
            <TouchableOpacity
              style={[s.button, { marginTop: 12 }]}
              onPress={() => Alert.alert("Next step", "We will implement retry in Step 3.")}
            >
              <Text style={s.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {course.status === "ready" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Modules</Text>

            {course.ai_plan?.modules?.length ? (
              course.ai_plan.modules.map((m, i) => (
                <View key={m.id ?? `${i}-${m.title}`} style={s.module}>
                  <Text style={s.moduleTitle}>
                    {i + 1}. {m.title}
                  </Text>

                  {!!m.lessons?.length ? (
                    m.lessons.map((l, j) => (
                      <Text key={l.id ?? `${i}-${j}-${l.title}`} style={s.lesson}>
                        • {l.title}
                      </Text>
                    ))
                  ) : (
                    <Text style={s.muted}>No lessons in this module.</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={s.muted}>No plan found.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },

  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 8 },
  subtitle: { color: "#9a9a9a", marginTop: 8, fontSize: 14 },
  meta: { color: "#6f6f6f", marginTop: 10, fontSize: 12 },

  card: {
    marginTop: 18,
    backgroundColor: "#121212",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 14,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  muted: { color: "#9a9a9a", marginTop: 8 },

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

  errorText: { color: "#ff6b6b", marginTop: 8 },

  module: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#222" },
  moduleTitle: { color: "#fff", fontWeight: "700" },
  lesson: { color: "#9a9a9a", marginTop: 6, marginLeft: 6 },
});
