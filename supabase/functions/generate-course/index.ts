/// <reference lib="deno.ns" />

import { createClient } from "npm:@supabase/supabase-js@2";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

function stripJsonFences(s: string) {
  return s
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return jsonResponse({ ok: true }, 200);
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

  try {
    const { course_id } = await req.json().catch(() => ({}));
    if (!course_id) return jsonResponse({ error: "course_id is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !anonKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);
    }
    if (!serviceRoleKey) return jsonResponse({ error: "Missing SERVICE_ROLE_KEY" }, 500);
    if (!geminiKey) return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);

    // This client reads the auth context from the incoming request headers.
    // This is the correct pattern for functions invoked via supabase-js.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    // Admin client for DB writes (bypass RLS), but enforce ownership manually.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: course, error: courseErr } = await admin
      .from("courses")
      .select("id, owner_id, subject, goal, level, pace, prior_knowledge, status")
      .eq("id", course_id)
      .single();

    if (courseErr || !course) return jsonResponse({ error: "Course not found" }, 404);
    if (course.owner_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("name, age, status, education, goal, time_per_day, onboarded_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) return jsonResponse({ error: profileErr.message }, 400);

    await admin
      .from("courses")
      .update({ status: "generating", ai_error: null })
      .eq("id", course_id);

    const prompt = `
Return ONLY valid JSON (no markdown, no backticks).

User profile:
- name: ${profile?.name ?? ""}
- age: ${profile?.age ?? ""}
- status: ${profile?.status ?? ""}
- education: ${profile?.education ?? ""}
- life_goal: ${profile?.goal ?? ""}
- time_per_day: ${profile?.time_per_day ?? ""}

Course request:
- subject: ${course.subject}
- course_goal: ${course.goal}
- level: ${course.level}
- pace: ${course.pace ?? ""}
- prior_knowledge: ${course.prior_knowledge ?? ""}

JSON schema:
{
  "overview": string,
  "modules": [
    {
      "id": string,
      "title": string,
      "description": string,
      "lessons": [
        {
          "id": string,
          "title": string,
          "objective": string,
          "duration_minutes": number,
          "content_blocks": [
            { "type": "paragraph", "text": string }
          ]
        }
      ]
    }
  ]
}

Constraints:
- 4 to 6 modules
- 4 to 8 lessons per module
- content_blocks: 3–8 per lesson
`.trim();

    const model = "gemini-3-pro-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    });

    if (!geminiRes.ok) {
      const txt = await geminiRes.text();
      await admin
        .from("courses")
        .update({ status: "failed", ai_error: `Gemini error: ${txt}` })
        .eq("id", course_id);
      return jsonResponse({ error: "Gemini request failed", detail: txt }, 500);
    }

    const geminiJson = await geminiRes.json();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!text) {
      await admin
        .from("courses")
        .update({ status: "failed", ai_error: "Gemini returned empty content" })
        .eq("id", course_id);
      return jsonResponse({ error: "Empty Gemini response" }, 500);
    }

    let plan: any;
    try {
      plan = JSON.parse(stripJsonFences(text));
    } catch {
      await admin
        .from("courses")
        .update({ status: "failed", ai_error: "Could not parse Gemini JSON" })
        .eq("id", course_id);
      return jsonResponse({ error: "Invalid JSON from Gemini", raw: text }, 500);
    }

    const { error: saveErr } = await admin
      .from("courses")
      .update({
        status: "ready",
        ai_plan: plan,
        generated_at: new Date().toISOString(),
        ai_error: null,
      })
      .eq("id", course_id);

    if (saveErr) return jsonResponse({ error: saveErr.message }, 500);

    return jsonResponse({ ok: true, course_id, status: "ready" }, 200);
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
