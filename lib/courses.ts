// lib/courses.ts
import { supabase } from "./supabase";

export type CourseStatus = "draft" | "generating" | "ready" | "failed";

// Minimal JSON shape we’ll render in UI (titles only for now)
export type CoursePlan = {
  overview?: string;
  modules?: Array<{
    id?: string;
    title: string;
    lessons?: Array<{
      id?: string;
      title: string;
    }>;
  }>;
};

export type Course = {
  id: string;
  owner_id: string;
  subject: string;
  goal: string;
  level: string;
  pace: string | null;
  prior_knowledge: string | null;
  created_at: string;

  // ✅ new fields you added in Supabase
  status: CourseStatus;
  ai_plan: CoursePlan | null;
  ai_error: string | null;
  generated_at: string | null;
};

export async function createCourse(input: {
  subject: string;
  goal: string;
  level: string;
  pace?: string;
  prior_knowledge?: string;
}): Promise<Course> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userRes.user) throw new Error("Not authenticated");

  const subject = input.subject.trim();
  const goal = input.goal.trim();
  const level = input.level.trim();

  if (!subject) throw new Error("Subject is required");
  if (!goal) throw new Error("Goal is required");
  if (!level) throw new Error("Level is required");

  const { data, error } = await supabase
    .from("courses")
    .insert({
      owner_id: userRes.user.id,
      subject,
      goal,
      level,
      pace: input.pace?.trim() || null,
      prior_knowledge: input.prior_knowledge?.trim() || null,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Course;
}

export async function listMyCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourseById(id: string): Promise<Course> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Course;
}
