// app/course/[id].tsx
import { supabase } from "@/lib/supabase";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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
  const [refreshing, setRefreshing] = useState(false);
  const [openModuleId, setOpenModuleId] = useState<string | null>(null);
  const [generatingNow, setGeneratingNow] = useState(false);

  const metaChips = useMemo(() => {
    if (!course) return [];
    const chips = [course.level].filter(Boolean) as string[];
    if (course.pace) chips.push(course.pace);
    return chips;
  }, [course]);

  const load = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const { data } = await supabase.auth.getSession();
      console.log("has session:", !!data.session);

      const c = await getCourseById(courseId);
      setCourse(c);
    } catch (e: any) {
      Alert.alert("Failed to load course", e?.message ?? "Unknown error");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!courseId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  };

  const onGenerate = async () => {
    if (!course) return;
    try {
      setGeneratingNow(true);
      await generateCourse(course.id);
      await load({ silent: true });
    } catch (e: any) {
      Alert.alert("Generation failed", String(e?.message ?? e));
    } finally {
      setGeneratingNow(false);
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
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.back()}>
            <Text style={s.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{course.subject}</Text>
          {!!course.goal && <Text style={s.subtitle}>{course.goal}</Text>}

          {!!metaChips.length && (
            <View style={s.chipRow}>
              {metaChips.map((t) => (
                <View key={t} style={s.chip}>
                  <Text style={s.chipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Status cards */}
        {course.status === "draft" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Not generated yet</Text>
            <Text style={s.cardBody}>Generate the plan so modules and lessons appear here.</Text>

            <TouchableOpacity
  style={[s.primaryBtn, { marginTop: 12 }, generatingNow && s.btnDisabled]}
  onPress={onGenerate}
  disabled={generatingNow}
  activeOpacity={0.85}
>

              {generatingNow ? (
                <View style={s.btnRow}>
                  <ActivityIndicator />
                  <Text style={s.primaryBtnText}>Generating…</Text>
                </View>
              ) : (
                <Text style={s.primaryBtnText}>Generate course</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {course.status === "generating" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Generating…</Text>
            <Text style={s.cardBody}>This can take a minute. Pull to refresh, or tap below.</Text>

            <TouchableOpacity style={[s.secondaryBtn, { marginTop: 12 }]} onPress={onRefresh} activeOpacity={0.85}>
              <Text style={s.secondaryBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {course.status === "failed" && (
          <View style={[s.card, s.cardDanger]}>
            <Text style={s.cardTitle}>Generation failed</Text>
            {!!course.ai_error && <Text style={s.errorText}>{course.ai_error}</Text>}

            <TouchableOpacity
              style={[s.primaryBtn, { marginTop: 12 }]}
              onPress={onGenerate}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modules */}
        {course.status === "ready" && (
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.cardTitle}>Modules</Text>
              <Text style={s.cardMeta}>
                {course.ai_plan?.modules?.length ?? 0} total
              </Text>
            </View>

            {course.ai_plan?.modules?.length ? (
              course.ai_plan.modules.map((m, i) => {
                const moduleKey = m.id ?? `mod-${i}`;
                const isOpen = openModuleId === moduleKey;
                const lessonCount = m.lessons?.length ?? 0;

                return (
                  <View key={moduleKey} style={s.moduleWrap}>
                    <TouchableOpacity
                      style={[s.moduleBtn, isOpen && s.moduleBtnOpen]}
                      onPress={() => setOpenModuleId(isOpen ? null : moduleKey)}
                      activeOpacity={0.85}
                    >
                      <View style={s.moduleTopRow}>
                        <Text style={s.moduleBtnTitle} numberOfLines={2}>
                          {i + 1}. {m.title}
                        </Text>

                        <View style={s.moduleRight}>
                          <View style={s.badge}>
                            <Text style={s.badgeText}>{lessonCount}</Text>
                          </View>
                          <Text style={s.chevron}>{isOpen ? "⌄" : "›"}</Text>
                        </View>
                      </View>

                      <Text style={s.moduleBtnMeta}>
                        {isOpen ? "Tap to collapse" : "Tap to expand"}
                      </Text>
                    </TouchableOpacity>

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
                                  params: { courseId: course.id, lessonId: l.id },
                                });
                              }}
                              activeOpacity={0.85}
                            >
                              <View style={s.lessonRow}>
                                <Text style={s.lessonText} numberOfLines={2}>
                                  {i + 1}.{j + 1} {l.title}
                                </Text>
                                <Text style={s.lessonChevron}>›</Text>
                              </View>
                              <View style={s.divider} />
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
  container: { flex: 1, backgroundColor: "#0B0B0B" },
  content: { padding: 20, paddingBottom: 44 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },

  header: { paddingTop: 6, paddingBottom: 6 },

  title: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: 0.2 },
  subtitle: { color: "#B5B5B5", marginTop: 10, fontSize: 14, lineHeight: 20 },
  muted: { color: "#9A9A9A", marginTop: 8 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#242424",
  },
  chipText: { color: "#CFCFCF", fontSize: 12, fontWeight: "700" },

  card: {
    marginTop: 16,
    backgroundColor: "#111111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardDanger: { borderColor: "#3A1A1A" },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cardBody: { color: "#B5B5B5", marginTop: 8, lineHeight: 20 },
  cardHeaderRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  cardMeta: { color: "#8D8D8D", fontSize: 12, fontWeight: "700" },

  errorText: { color: "#FF7A7A", marginTop: 10, lineHeight: 18 },

  moduleWrap: { marginTop: 12 },

  moduleBtn: {
    backgroundColor: "#0E0E0E",
    borderWidth: 1,
    borderColor: "#1F1F1F",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  moduleBtnOpen: { borderColor: "#2A2A2A", backgroundColor: "#101010" },

  moduleTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  moduleBtnTitle: { color: "#fff", fontWeight: "900", flex: 1, lineHeight: 20 },
  moduleBtnMeta: { color: "#9A9A9A", marginTop: 8, fontSize: 12 },

  moduleRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    minWidth: 28,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#171717",
    borderWidth: 1,
    borderColor: "#242424",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#E6E6E6", fontWeight: "900", fontSize: 12 },
  chevron: { color: "#BDBDBD", fontSize: 18, marginTop: -2 },

  lessonList: {
    marginTop: 10,
    marginLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#1F1F1F",
    paddingLeft: 10,
  },

  lessonBtn: { paddingVertical: 2 },
  lessonRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 10 },
  lessonText: { color: "#D6D6D6", flex: 1, lineHeight: 20, fontWeight: "600" },
  lessonChevron: { color: "#8F8F8F", fontSize: 18 },
  divider: { height: 1, backgroundColor: "#171717", marginTop: 10 },

  primaryBtn: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#000", fontSize: 15, fontWeight: "900" },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0E0E0E",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "800" },

  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  btnDisabled: { opacity: 0.65 },
});
