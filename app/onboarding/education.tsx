// /app/onboarding/education.tsx
import React, { useState } from "react";
import { SafeAreaView, View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useOnboarding } from "../../context/OnboardingContext";
import OptionChips from "../../components/OptionChips";
import { ob } from "../../components/onboardingStyles";

const OPTIONS = ["School", "College/Uni", "Self-taught", "Professional"];

export default function EducationStep() {
  const { data, setData } = useOnboarding();
  const [education, setEducation] = useState(data.education);

  return (
    <SafeAreaView style={ob.container}>
      <View style={ob.content}>
        <Text style={ob.title}>Education level?</Text>
        <Text style={ob.subtitle}>Pick one</Text>

        <OptionChips options={OPTIONS} value={education} onChange={setEducation} />

        <TouchableOpacity
          style={[ob.button, !education && ob.disabled]}
          disabled={!education}
          onPress={() => {
            setData((p) => ({ ...p, education }));
            router.push("/onboarding/goal");
          }}
        >
          <Text style={ob.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
