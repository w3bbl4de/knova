// /app/onboarding/education.tsx
import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import OptionChips from "../../components/OptionChips";
import SegmentedProgress from "../../components/SegmentedProgress";
import { ob } from "../../components/onboardingStyles";
import { useOnboarding } from "../../context/OnboardingContext";

const OPTIONS = ["School", "College/Uni", "Self-taught", "Professional"] as const;
type Education = (typeof OPTIONS)[number];

export default function EducationStep() {
  const { data, setData } = useOnboarding();
  const [education, setEducation] = useState<Education | "">(data.education as any);

  return (
  
    <SafeAreaView style={ob.container}>
      <SegmentedProgress total={6} current={4} />
      {/* TOP CONTENT */}
      <View style={ob.content}>
        <Text style={ob.title}>Education level?</Text>
        <Text style={ob.subtitle}>Pick one</Text>

        <OptionChips
          options={OPTIONS}
          value={(education || OPTIONS[0]) as Education}
          onChange={setEducation}
        />
      </View>

      {/* FIXED BOTTOM BUTTON */}
      <View style={ob.footer}>
        <TouchableOpacity
          style={[ob.button, !education && ob.disabled]}
          disabled={!education}
          onPress={() => {
            setData((p) => ({ ...p, education }));
            router.push("./goal"); // or "/onboarding/goal" if your project accepts absolute routes
          }}
        >
          <Text style={ob.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
