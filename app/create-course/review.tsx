import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useCreateCourse } from "../../context/CreateCourseContext";
import { createCourse } from "../../lib/courses";

export default function ReviewStep() {
  const { data, reset } = useCreateCourse();
  const [saving, setSaving] = useState(false);

  const canCreate = data.subject.trim() && data.goal.trim() && !saving;

  const onCreate = async () => {
    try {
      setSaving(true);

      await createCourse({
        subject: data.subject,
        goal: data.goal,
        level: data.level,
        pace: data.pace,
        prior_knowledge: data.prior_knowledge,
      });

      reset();
      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert("Create course failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>Review</Text>
        <Text style={s.subtitle}>Confirm before creating the course</Text>

        <View style={s.card}>
          <Text style={s.row}><Text style={s.k}>Subject:</Text> {data.subject}</Text>
          <Text style={s.row}><Text style={s.k}>Goal:</Text> {data.goal}</Text>
          <Text style={s.row}><Text style={s.k}>Level:</Text> {data.level}</Text>
          <Text style={s.row}><Text style={s.k}>Pace:</Text> {data.pace}</Text>
          {!!data.prior_knowledge?.trim() && (
            <Text style={s.row}><Text style={s.k}>You know:</Text> {data.prior_knowledge}</Text>
          )}
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.button, !canCreate && s.disabled]}
          disabled={!canCreate}
          onPress={onCreate}
        >
          <Text style={s.buttonText}>{saving ? "Saving..." : "Create Course"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  title: { color: "#fff", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#9a9a9a", marginTop: 8, marginBottom: 18 },
  card: {
    backgroundColor: "#121212",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222",
  },
  row: { color: "#fff", marginBottom: 10, lineHeight: 20 },
  k: { color: "#9a9a9a" },
  footer: { padding: 16, backgroundColor: "#000" },
  button: { backgroundColor: "#fff", paddingVertical: 16, borderRadius: 32, alignItems: "center" },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
