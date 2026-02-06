import { supabase } from "./supabase";

export type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  status: string | null;
  education: string | null;
  goal: string | null;
  time_per_day: string | null;
  onboarded_at: string | null;
};

export async function getMyProfile(): Promise<Profile | null> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userRes.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userRes.user.id)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function saveOnboarding(input: {
  name: string;
  age: number;
  status: string;
  education: string;
  goal: string;
  time_per_day: string;
}) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!userRes.user) throw new Error("Not authenticated");

  const { error } = await supabase.from("profiles").upsert({
    id: userRes.user.id,
    ...input,
    onboarded_at: new Date().toISOString(),
  });

  if (error) throw error;
}
