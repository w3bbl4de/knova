// app/create-course/_layout.tsx
import { Stack } from "expo-router";
import React from "react";
import { CreateCourseProvider } from "../../context/CreateCourseContext";

export default function CreateCourseLayout() {
  return (
    <CreateCourseProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CreateCourseProvider>
  );
}
