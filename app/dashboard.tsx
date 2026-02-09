import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
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
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>("Explorer");

  // ✅ Onboarding guard (keep this)
  useEffect(() => {
    (async () => {
      const profile = await getMyProfile();
      if (!profile?.onboarded_at) {
        router.replace("/onboarding/name");
        return;
      }
      if (profile?.name) setUserName(profile.name);
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
        if (active) {
          setLoadingCourses(false);
          setRefreshing(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(loadCourses);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadCourses();
  }, [loadCourses]);

  const handleAddCourse = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/create-course/subject");
  };

  const handleLogout = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>Hello, {userName}</Text>
          <Text style={styles.subGreeting}>Ready to learn today?</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="log-out-outline" size={24} color="#ff6b6b" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={handleAddCourse} style={styles.addCourseContainer}>
        <LinearGradient
          colors={["#2a2a2a", "#1a1a1a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addCourseGradient}
        >
          <View style={styles.addCourseContent}>
            <View style={styles.addIconContainer}>
              <Ionicons name="add" size={28} color="#fff" />
            </View>

            <View style={styles.addTextContainer}>
              <Text style={styles.addTitle}>Start a New Journey</Text>
              <Text style={styles.addSubtitle}>Create a personalized course</Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My Courses</Text>
    </View>
  );

  const renderCourseItem = ({ item }: { item: Course }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.courseCard}
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync();
        router.push({ pathname: "/course/[id]", params: { id: item.id } });
      }}
    >
      <LinearGradient
        colors={["#1e1e1e", "#121212"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.courseGradient}
      >
        <View style={styles.courseHeader}>
          <View style={styles.iconPlaceholder}>
            <Text style={styles.iconText}>
              {(item.subject?.slice(0, 2) ?? "CO").toUpperCase()}
            </Text>
          </View>

          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{item.level}</Text>
          </View>
        </View>

        <Text style={styles.courseSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        <Text style={styles.courseGoal} numberOfLines={2}>
          {item.goal}
        </Text>

        <View style={styles.courseFooter}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: "0%" }]} />
          </View>
          <Text style={styles.progressText}>0%</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {loadingCourses && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.id}
          renderItem={renderCourseItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No courses yet</Text>
              <Text style={styles.emptySubtext}>Tap the card above to create one!</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={["#fff"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },

  listContent: {
    padding: 24,
    paddingBottom: 40,
  },

  header: { marginBottom: 20 },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },

  subGreeting: { fontSize: 14, color: "#888", marginTop: 4 },

  logoutButton: {
    padding: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
  },

  addCourseContainer: {
    borderRadius: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  addCourseGradient: {
    borderRadius: 20,
    padding: 1,
    borderWidth: 1,
    borderColor: "#333",
  },

  addCourseContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 19,
    backgroundColor: "#111",
  },

  addIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "#333",
  },

  addTextContainer: { flex: 1 },

  addTitle: { fontSize: 16, fontWeight: "600", color: "#fff" },

  addSubtitle: { fontSize: 12, color: "#888", marginTop: 2 },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },

  courseCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  courseGradient: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
  },

  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  iconPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },

  iconText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  levelBadge: {
    backgroundColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },

  levelText: {
    fontSize: 10,
    color: "#aaa",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  courseSubject: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 6 },

  courseGoal: { fontSize: 14, color: "#999", lineHeight: 20, marginBottom: 20 },

  courseFooter: { flexDirection: "row", alignItems: "center" },

  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#222",
    borderRadius: 3,
    marginRight: 12,
  },

  progressBarFill: { height: "100%", backgroundColor: "#fff", borderRadius: 3 },

  progressText: { fontSize: 12, color: "#666", fontWeight: "600" },

  emptyContainer: {
    padding: 40,
    alignItems: "center",
    marginTop: 20,
    opacity: 0.7,
  },

  emptyText: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 16 },

  emptySubtext: { color: "#666", fontSize: 14, marginTop: 4, textAlign: "center" },
});
