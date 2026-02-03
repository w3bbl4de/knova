// /app/onboarding/time.tsx
import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useOnboarding } from "../../context/OnboardingContext";
import OptionChips from "../../components/OptionChips";
import { ob } from "../../components/onboardingStyles";

const OPTIONS = ["15 min", "30 min", "1 hour", "Flexible"];

export default function TimeStep() {
  const { data, setData } = useOnboarding();
  const [timePerDay, setTimePerDay] = useState(data.timePerDay);

  return (
    <SafeAreaView style={ob.container}>
      <View style={ob.content}>
        <Text style={ob.title}>Time per day?</Text>
        <Text style={ob.subtitle}>Pick one</Text>

        <OptionChips options={OPTIONS} value={timePerDay} onChange={setTimePerDay} />

        <TouchableOpacity
          style={[ob.button, !timePerDay && ob.disabled]}
          disabled={!timePerDay}
          onPress={() => {
            setData((p) => ({ ...p, timePerDay }));
            router.replace("/dashboard");
          }}
        >
          <Text style={ob.buttonText}>Finish</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
