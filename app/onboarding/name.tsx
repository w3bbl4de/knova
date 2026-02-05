// /app/onboarding/name.tsx
import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ob } from "../../components/onboardingStyles";
import SegmentedProgress from "../../components/SegmentedProgress";
import { useOnboarding } from "../../context/OnboardingContext";

export default function NameStep() {
  const { data, setData } = useOnboarding();
  const [name, setName] = useState(data.name);

  const canContinue = name.trim().length > 0;

  return (
    <SafeAreaView style={ob.container}>
      <SegmentedProgress total={6} current={1} />
      <View style={ob.content}>
        <Text style={ob.title}>What’s your name?</Text>
        <Text style={ob.subtitle}>So we can personalize your course</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Alex"
          placeholderTextColor="#666"
          style={ob.input}
        />

        <TouchableOpacity
          style={[ob.button, !canContinue && ob.disabled]}
          disabled={!canContinue}
          onPress={() => {
            setData((p) => ({ ...p, name: name.trim() }));
            router.push("/onboarding/age");
          }}
        >
          <Text style={ob.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
