// lib/generateCourse.ts
import { supabase } from "./supabase";

export async function generateCourse(courseId: string) {
  const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;

  const token = sessionRes.session?.access_token;
  if (!token) throw new Error("No session access token (not logged in)");

  // Get your project's URL + anon key from the already-configured Supabase client
  const url = (supabase as any).supabaseUrl as string;
  const anonKey = (supabase as any).supabaseKey as string;

  const res = await fetch(`${url}/functions/v1/generate-course`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ course_id: courseId }),
  });

  const text = await res.text();
  if (!res.ok) {
    // This will finally show the real reason instead of generic "non-2xx"
    throw new Error(`Edge function error ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}
