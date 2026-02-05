// /app/onboarding/age.tsx
import SegmentedProgress from "@/components/SegmentedProgress";
import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips";
import { ob } from "../../components/onboardingStyles";
import { useOnboarding } from "../../context/OnboardingContext";

const OPTIONS = ["13–17", "18–24", "25–34", "35+"];

export default function AgeStep() {
  const { data, setData } = useOnboarding();
  const [age, setAge] = useState(data.age);

  return (
    <SafeAreaView style={ob.container}>
      <SegmentedProgress total={6} current={2} />
      <View style={ob.content}>
        <Text style={ob.title}>Your age range?</Text>
        <Text style={ob.subtitle}>Pick one</Text>

        <OptionChips options={OPTIONS} value={age} onChange={setAge} />

        <TouchableOpacity
          style={[ob.button, !age && ob.disabled]}
          disabled={!age}
          onPress={() => {
            setData((p) => ({ ...p, age }));
            router.push("/onboarding/status");
          }}
        >
          <Text style={ob.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
