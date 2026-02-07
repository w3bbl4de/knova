// app/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { CreateCourseProvider } from "../context/CreateCourseContext";
import { OnboardingProvider } from "../context/OnboardingContext";

export default function Layout() {
  return (
    <OnboardingProvider>
      <CreateCourseProvider>
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      </CreateCourseProvider>
    </OnboardingProvider>
  );
}
