import React, { createContext, useContext, useState } from "react";

type OnboardingData = {
  name: string;
  age: string;
  status: "Studying" | "Working" | "Both" | "";
  education: string;
  goal: string;
  timePerDay: string;
};

const defaultData: OnboardingData = {
  name: "",
  age: "",
  status: "",
  education: "",
  goal: "",
  timePerDay: "",
};

const Ctx = createContext<{
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
} | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  return <Ctx.Provider value={{ data, setData }}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}
