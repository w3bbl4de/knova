// /app/onboarding/age.tsx
import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useOnboarding } from "../../context/OnboardingContext";
import OptionChips from "../../components/OptionChips";
import { ob } from "../../components/onboardingStyles";

const OPTIONS = ["13–17", "18–24", "25–34", "35+"];

export default function AgeStep() {
  const { data, setData } = useOnboarding();
  const [age, setAge] = useState(data.age);

  return (
    <SafeAreaView style={ob.container}>
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
