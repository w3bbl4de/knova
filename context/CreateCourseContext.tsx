// context/CreateCourseContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

type CreateCourseData = {
  subject: string;
  goal: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  pace: "Relaxed" | "Normal" | "Fast";
  prior_knowledge: string;
};

type CreateCourseCtx = {
  data: CreateCourseData;
  setData: React.Dispatch<React.SetStateAction<CreateCourseData>>;
  reset: () => void;
};

const DEFAULT: CreateCourseData = {
  subject: "",
  goal: "",
  level: "Beginner",
  pace: "Normal",
  prior_knowledge: "",
};

const Ctx = createContext<CreateCourseCtx | null>(null);

export function CreateCourseProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CreateCourseData>(DEFAULT);

  const value = useMemo(
    () => ({
      data,
      setData,
      reset: () => setData(DEFAULT),
    }),
    [data]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCreateCourse() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCreateCourse must be used within CreateCourseProvider");
  return v;
}
