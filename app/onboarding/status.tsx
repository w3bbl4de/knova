// /app/onboarding/status.tsx
import SegmentedProgress from "@/components/SegmentedProgress";
import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips";
import { ob } from "../../components/onboardingStyles";
import { useOnboarding } from "../../context/OnboardingContext";

const OPTIONS = ["Studying", "Working", "Both"];

export default function StatusStep() {
  const { data, setData } = useOnboarding();
  const [status, setStatus] = useState<"Studying" | "Working" | "Both" | "">(data.status);

  return (
    <SafeAreaView style={ob.container}>
      <SegmentedProgress total={6} current={3} />
      <View style={ob.content}>
        <Text style={ob.title}>Are you studying or working?</Text>
        <Text style={ob.subtitle}>Pick one</Text>

        <OptionChips options={OPTIONS} value={status} onChange={(v) => setStatus(v as "Studying" | "Working" | "Both" | "")} />

        <TouchableOpacity
          style={[ob.button, !status && ob.disabled]}
          disabled={!status}
          onPress={() => {
            setData((p) => ({ ...p, status }));
            router.push("/onboarding/education");
          }}
        >
          <Text style={ob.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
