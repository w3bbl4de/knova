// app/course/[id].tsx
import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Course, getCourseById } from "../../lib/courses";
import { generateCourse } from "../../lib/generateCourse";

export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const courseId = String(id ?? "");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);

  const load = async () => {
    try {
    const { data } = await supabase.auth.getSession();
    console.log("has session:", !!data.session);
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

  const onGenerate = async () => {
    if (!course) return;
    try {
      await generateCourse(course.id);
      await load();
    } catch (e: any) {
      Alert.alert("Generation failed", String(e?.message ?? e));
    }
  };

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

        {course.status === "draft" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Not generated yet</Text>
            <TouchableOpacity style={[s.button, { marginTop: 12 }]} onPress={onGenerate}>
              <Text style={s.buttonText}>Generate course</Text>
            </TouchableOpacity>
          </View>
        )}

        {course.status === "generating" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Generating…</Text>
            <TouchableOpacity style={[s.ghostBtn, { marginTop: 12 }]} onPress={load}>
              <Text style={s.ghostText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {course.status === "failed" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Generation failed</Text>
            {!!course.ai_error && <Text style={s.errorText}>{course.ai_error}</Text>}
            <TouchableOpacity style={[s.button, { marginTop: 12 }]} onPress={onGenerate}>
              <Text style={s.buttonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {course.status === "ready" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Modules</Text>

            {course.ai_plan?.modules?.length ? (
              course.ai_plan.modules.map((m, i) => {
                const moduleKey = m.id ?? `mod-${i}`;
                const isOpen = openModuleId === moduleKey;

                return (
                  <View key={moduleKey} style={s.moduleWrap}>
                    {/* Module “folder” button */}
                    <TouchableOpacity
                      style={s.moduleBtn}
                      onPress={() => setOpenModuleId(isOpen ? null : moduleKey)}
                      activeOpacity={0.85}
                    >
                      <Text style={s.moduleBtnTitle}>
                        {i + 1}. {m.title}
                      </Text>
                      <Text style={s.moduleBtnMeta}>
                        {isOpen ? "▼" : "▶"} {m.lessons?.length ?? 0} lessons
                      </Text>
                    </TouchableOpacity>

                    {/* Expand to show lessons */}
                    {isOpen && (
                      <View style={s.lessonList}>
                        {!!m.lessons?.length ? (
                          m.lessons.map((l, j) => (
                            <TouchableOpacity
                              key={l.id ?? `${moduleKey}-les-${j}`}
                              style={s.lessonBtn}
                              onPress={() => {
                                if (!l.id) {
                                Alert.alert("Missing lesson id", "This lesson has no id yet.");
                                return;
                                }

                                router.push({
                                pathname: "/course/[courseId]/lesson/[lessonId]",
                                params: {
                                courseId: course.id,
                                lessonId: l.id,
                                },
                                });
                                }}

                            >
                              <Text style={s.lessonText}>
                                {i + 1}.{j + 1} {l.title}
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={s.muted}>No lessons.</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
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

  moduleWrap: { marginTop: 12 },

  moduleBtn: {
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  moduleBtnTitle: { color: "#fff", fontWeight: "800" },
  moduleBtnMeta: { color: "#9a9a9a", marginTop: 6, fontSize: 12 },

  lessonList: {
    marginTop: 10,
    marginLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#222",
    paddingLeft: 10,
  },

  lessonBtn: { paddingVertical: 10 },
  lessonText: { color: "#cfcfcf" },

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
