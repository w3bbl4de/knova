import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Course, listMyCourses } from "../lib/courses";
import { getMyProfile } from "../lib/profile";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // ✅ Onboarding guard (keep this)
  useEffect(() => {
    (async () => {
      const profile = await getMyProfile();
      if (!profile?.onboarded_at) router.replace("/onboarding/name");
    })();
  }, []);

  // ✅ Load courses whenever dashboard is focused (after creating a course)
  const loadCourses = useCallback(() => {
    let active = true;
    setLoadingCourses(true);

    listMyCourses()
      .then((rows) => {
        if (active) setCourses(rows);
      })
      .catch(() => {
        if (active) setCourses([]);
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(loadCourses);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Dashboard</Text>
        <Text style={styles.subtitle}>Create your personalized course</Text>

        {/* Add Course Button */}
        <TouchableOpacity
          style={styles.addCard}
          onPress={() => router.push("/create-course/subject")}
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.addText}>Add Course</Text>
        </TouchableOpacity>

        {/* Courses List */}
        <View style={{ marginTop: 16, flex: 1 }}>
          {loadingCourses ? (
            <Text style={{ color: "#9a9a9a", marginTop: 10 }}>Loading courses…</Text>
          ) : courses.length === 0 ? (
            <Text style={{ color: "#9a9a9a", marginTop: 10 }}>
              No courses yet. Tap “Add Course” to create one.
            </Text>
          ) : (
            <FlatList
              data={courses}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.courseCard}
                  onPress={() => {
                    router.push(`/course/${item.id}`);
                  }}
                >
                  <Text style={styles.courseSubject}>{item.subject}</Text>
                  <Text style={styles.courseMeta}>{item.goal}</Text>
                  <Text style={styles.courseMetaSmall}>
                    {item.level}
                    {item.pace ? ` • ${item.pace}` : ""}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
        >
          <Text style={{ color: "#ff6b6b", marginTop: 12 }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, padding: 24 },

  title: { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#9a9a9a", marginBottom: 24 },

  addCard: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  plus: { fontSize: 36, color: "#fff", marginBottom: 6 },
  addText: { fontSize: 16, fontWeight: "600", color: "#fff" },

  courseCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#121212",
    marginBottom: 10,
  },
  courseSubject: { color: "#fff", fontSize: 16, fontWeight: "700" },
  courseMeta: { color: "#9a9a9a", marginTop: 6 },
  courseMetaSmall: { color: "#6f6f6f", marginTop: 6, fontSize: 12 },
});
