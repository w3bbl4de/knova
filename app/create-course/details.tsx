import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips"; // your card-style options

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
type Level = (typeof LEVELS)[number];

export default function DetailsScreen() {
  const { subject } = useLocalSearchParams<{ subject: string }>();

  const [level, setLevel] = useState<Level | "">("");
  const [notes, setNotes] = useState("");

  const canContinue = !!subject && !!level;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>About your {subject} course</Text>
        <Text style={s.subtitle}>This helps Gemini personalize it</Text>

        <Text style={s.label}>Your level</Text>
        <OptionChips options={LEVELS} value={(level || LEVELS[0]) as Level} onChange={setLevel} />

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
          onPress={() => {
            // Next step later: call Gemini API
            router.push({
              pathname: "/create-course/generate",
              params: { subject: String(subject), level, notes },
            });
          }}
        >
          <Text style={s.buttonText}>Generate Course</Text>
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
