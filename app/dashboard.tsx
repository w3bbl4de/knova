import React from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";
import { useOnboarding } from "../context/OnboardingContext";

export default function Dashboard() {
  const { data } = useOnboarding();
  return (
    <SafeAreaView style={s.container}>
      <Text style={s.text}>Welcome, {data.name} 👋</Text>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", padding: 24 },
  text: { color: "#fff", fontSize: 22, fontWeight: "700" },
});
