import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useCreateCourse } from "../../context/CreateCourseContext";

export default function KnowledgeStep() {
  const { data, setData } = useCreateCourse();
  const [notes, setNotes] = useState(data.prior_knowledge ?? "");

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>What do you already know?</Text>
        <Text style={s.subtitle}>Optional — helps personalize the course</Text>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder='Example: "I know variables and loops, but not async/await"'
          placeholderTextColor="#666"
          style={[s.input, { height: 130 }]}
          multiline
        />
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={s.button}
          onPress={() => {
            setData((p) => ({ ...p, prior_knowledge: notes.trim() }));
            router.push("/create-course/review");
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
    fontSize: 14,
  },
  footer: { padding: 16, backgroundColor: "#000" },
  button: { backgroundColor: "#fff", paddingVertical: 16, borderRadius: 32, alignItems: "center" },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
