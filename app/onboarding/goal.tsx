// /app/onboarding/goal.tsx
import SegmentedProgress from "@/components/SegmentedProgress";
import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips";
import { ob } from "../../components/onboardingStyles";
import { useOnboarding } from "../../context/OnboardingContext";

const OPTIONS = ["Learn basics", "Build projects", "Get a job", "Upskill"];

export default function GoalStep() {
  const { data, setData } = useOnboarding();
  const [goal, setGoal] = useState(data.goal);

  return (
    <SafeAreaView style={ob.container}>
      <SegmentedProgress total={6} current={5} />
      <View style={ob.content}>
        <Text style={ob.title}>What’s your goal?</Text>
        <Text style={ob.subtitle}>Pick one</Text>

        <OptionChips options={OPTIONS} value={goal} onChange={setGoal} />

        <TouchableOpacity
          style={[ob.button, !goal && ob.disabled]}
          disabled={!goal}
          onPress={() => {
            setData((p) => ({ ...p, goal }));
            router.push("/onboarding/time");
          }}
        >
          <Text style={ob.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
