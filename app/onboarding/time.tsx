// app/onboarding/time.tsx
import SegmentedProgress from "@/components/SegmentedProgress";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips";
import { ob } from "../../components/onboardingStyles";
import { useOnboarding } from "../../context/OnboardingContext";
import { saveOnboarding } from "../../lib/profile";

const OPTIONS = ["15 min", "30 min", "1 hour", "Flexible"];

export default function TimeStep() {
  const { data, setData } = useOnboarding();

  // Keep it strictly string because OptionChips expects string.
  // Use "" to represent "not selected".
  const [timePerDay, setTimePerDay] = useState<string>(data.timePerDay ?? "");
  const [saving, setSaving] = useState(false);

  const canFinish = timePerDay.trim().length > 0 && !saving;

  const finish = async () => {
    if (!timePerDay.trim()) return;

    try {
      setSaving(true);

      // Update context so app state matches what we save
      setData((prev) => ({
        ...prev,
        timePerDay,
        completed: true,
      }));

      await saveOnboarding({
        name: data.name,
        age: Number(data.age),
        status: data.status,
        education: data.education,
        goal: data.goal,
        time_per_day: timePerDay,
      });

      router.replace("/dashboard");
    } catch (e: any) {
      Alert.alert("Onboarding failed", e?.message ?? "Could not save your data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={ob.container}>
      <SegmentedProgress total={6} current={6} />

      <View style={ob.content}>
        <Text style={ob.title}>Time per day?</Text>
        <Text style={ob.subtitle}>Pick one</Text>

        <OptionChips options={OPTIONS} value={timePerDay} onChange={setTimePerDay} />

        <TouchableOpacity
          style={[ob.button, !canFinish && ob.disabled]}
          disabled={!canFinish}
          onPress={finish}
        >
          <Text style={ob.buttonText}>{saving ? "Saving..." : "Finish"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
