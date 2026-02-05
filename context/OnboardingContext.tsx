import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type Status = "" | "Studying" | "Working" | "Both";

type OnboardingData = {
  name: string;
  age: string;
  status: Status;   // ✅ changed
  education: string;
  goal: string;
  timePerDay: string;
  completed: boolean;
};


const defaultData: OnboardingData = {
  name: "",
  age: "",
  status: "",
  education: "",
  goal: "",
  timePerDay: "",
  completed: false,
};

const STORAGE_KEY = "nova_quest_user";

const Ctx = createContext<{
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  loading: boolean;
} | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [loading, setLoading] = useState(true);

  // Load saved data on app start
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setData(JSON.parse(saved));
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (!loading) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, loading]);

  return (
    <Ctx.Provider value={{ data, setData, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboarding must be used inside provider");
  return ctx;
}
