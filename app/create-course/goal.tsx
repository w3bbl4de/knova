import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useCreateCourse } from "../../context/CreateCourseContext";

export default function GoalStep() {
  const { data, setData } = useCreateCourse();
  const [goal, setGoal] = useState(data.goal ?? "");

  const canContinue = goal.trim().length > 0;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>Your goal</Text>
        <Text style={s.subtitle}>What outcome do you want from {data.subject}?</Text>

        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder='Example: "Build apps", "Pass my exam", "Get interview-ready"'
          placeholderTextColor="#666"
          style={s.input}
        />
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.button, !canContinue && s.disabled]}
          disabled={!canContinue}
          onPress={() => {
            setData((p) => ({ ...p, goal: goal.trim() }));
            router.push("/create-course/level");
          }}
        >
          <Text style={s.buttonText}>Next</Text>
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
  input: {
    backgroundColor: "#121212",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 16,
  },
  footer: { padding: 16, backgroundColor: "#000" },
  button: { backgroundColor: "#fff", paddingVertical: 16, borderRadius: 32, alignItems: "center" },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
