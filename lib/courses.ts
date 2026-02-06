// lib/courses.ts
import { supabase } from "./supabase";

export type Course = {
  id: string;
  owner_id: string;
  subject: string;
  goal: string;
  level: string;
  pace: string | null;
  prior_knowledge: string | null;
  created_at: string;
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
