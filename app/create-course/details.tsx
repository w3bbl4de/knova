import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips";
import { createCourse } from "../../lib/courses";

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
type Level = (typeof LEVELS)[number];

const PACES = ["Relaxed", "Normal", "Fast"] as const;
type Pace = (typeof PACES)[number];

export default function DetailsScreen() {
  const { subject } = useLocalSearchParams<{ subject: string }>();

  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("Beginner"); // default avoids empty state issues
  const [pace, setPace] = useState<Pace>("Normal");      // optional but useful default
  const [notes, setNotes] = useState("");                // prior_knowledge
  const [saving, setSaving] = useState(false);

  const subjectStr = String(subject ?? "").trim();
  const canContinue = subjectStr.length > 0 && goal.trim().length > 0 && !saving;

  const onCreate = async () => {
    try {
      setSaving(true);

      await createCourse({
        subject: subjectStr,
        goal,
        level,
        pace, // optional in DB but good to store
        prior_knowledge: notes,
      });

      // For now, skip Gemini. Just go back and show it on dashboard.
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
        <Text style={s.title}>About your {subjectStr} course</Text>
        <Text style={s.subtitle}>This helps personalize it</Text>

        <Text style={s.label}>What’s your goal? *</Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder='Example: "Build apps", "Pass my exam", "Learn fundamentals"'
          placeholderTextColor="#666"
          style={s.input}
        />

        <Text style={s.label}>Your level</Text>
        <OptionChips options={LEVELS} value={level} onChange={setLevel as any} />

        <Text style={s.label}>Pace</Text>
        <OptionChips options={PACES} value={pace} onChange={setPace as any} />

        <Text style={s.label}>What do you already know? (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder='Example: "I know variables and loops, but not async/await"'
          placeholderTextColor="#666"
          style={[s.input, { height: 110 }]}
          multiline
        />
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.button, !canContinue && s.disabled]}
          disabled={!canContinue}
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
  content: { flex: 1, padding: 24 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginTop: 12 },
  subtitle: { color: "#9a9a9a", marginTop: 8, marginBottom: 18 },
  label: { color: "#fff", marginTop: 18, marginBottom: 10, fontSize: 14 },
  input: {
    backgroundColor: "#121212",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 14,
  },
  footer: { padding: 16, backgroundColor: "#000" },
  button: { backgroundColor: "#fff", paddingVertical: 16, borderRadius: 32, alignItems: "center" },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
