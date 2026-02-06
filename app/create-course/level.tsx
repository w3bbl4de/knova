import { router } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips";
import { useCreateCourse } from "../../context/CreateCourseContext";

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export default function LevelStep() {
  const { data, setData } = useCreateCourse();

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>Your level</Text>
        <Text style={s.subtitle}>Pick what best matches you</Text>

        <OptionChips
          options={LEVELS}
          value={data.level}
          onChange={(v) => setData((p) => ({ ...p, level: v as any }))}
        />
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.button} onPress={() => router.push("/create-course/pace")}>
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
  footer: { padding: 16, backgroundColor: "#000" },
  button: { backgroundColor: "#fff", paddingVertical: 16, borderRadius: 32, alignItems: "center" },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
