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
    const { course_id, lesson_id } = await req.json().catch(() => ({}));
    if (!course_id) return jsonResponse({ error: "course_id is required" }, 400);
    if (!lesson_id) return jsonResponse({ error: "lesson_id is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !anonKey) return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);
    if (!serviceRoleKey) return jsonResponse({ error: "Missing SERVICE_ROLE_KEY" }, 500);
    if (!geminiKey) return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);

    // Auth user from incoming headers
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    // Admin client for DB write
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: course, error: courseErr } = await admin
      .from("courses")
      .select("id, owner_id, subject, goal, level, pace, prior_knowledge, ai_plan")
      .eq("id", course_id)
      .single();

    if (courseErr || !course) return jsonResponse({ error: "Course not found" }, 404);
    if (course.owner_id !== userId) return jsonResponse({ error: "Forbidden" }, 403);

    const aiPlan = course.ai_plan;
    if (!aiPlan?.modules?.length) return jsonResponse({ error: "Course has no ai_plan/modules yet" }, 400);

    // Find lesson in ai_plan
    let mi = -1;
    let li = -1;
    for (let m = 0; m < aiPlan.modules.length; m++) {
      const lessons = aiPlan.modules[m].lessons ?? [];
      const idx = lessons.findIndex((x: any) => x?.id === lesson_id);
      if (idx !== -1) {
        mi = m;
        li = idx;
        break;
      }
    }
    if (mi === -1 || li === -1) return jsonResponse({ error: "Lesson not found in ai_plan" }, 404);

    const module = aiPlan.modules[mi];
    const lesson = module.lessons[li];

    // Idempotent: if already has content, return
    if (lesson?.status === "ready" && lesson?.content?.content_blocks?.length) {
      return jsonResponse({ ok: true, course_id, lesson_id, reused: true }, 200);
    }

    const prompt = `
Return ONLY valid JSON (no markdown, no backticks).

Generate full teaching content for ONE lesson only. Keep it concise for voice tutoring.

Course:
- subject: ${course.subject}
- goal: ${course.goal}
- level: ${course.level}
- pace: ${course.pace ?? ""}
- prior_knowledge: ${course.prior_knowledge ?? ""}

Module:
- title: ${module.title}
- objective: ${module.objective ?? ""}

Lesson:
- title: ${lesson.title}
- objective: ${lesson.objective ?? ""}
- duration_minutes: ${lesson.duration_minutes ?? 20}

JSON schema:
{
  "content_blocks": [
    { "type": "explain" | "example" | "activity" | "recap", "title": string, "content": string }
  ],
  "exercises": [
    { "type": "short_answer" | "mcq" | "practice", "prompt": string, "solution": string }
  ],
  "checkpoint_questions": [
    { "q": string, "choices": string[], "answer_index": number, "explanation": string }
  ]
}

Hard limits:
- content_blocks: 5 to 8
- exercises: 2 to 3
- checkpoint_questions: 4 to 6
- Keep each content block concise (max ~120 words).
`.trim();

    const model =
      Deno.env.get("GEMINI_LESSON_MODEL") ??
      Deno.env.get("GEMINI_MODEL") ??
        "gemini-3-flash-preview";


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

      // Mark that lesson failed (without touching other lessons)
      aiPlan.modules[mi].lessons[li] = {
        ...lesson,
        status: "failed",
        ai_error: txt,
      };

      await admin.from("courses").update({ ai_plan: aiPlan }).eq("id", course_id);

      return jsonResponse({ error: "Gemini request failed", detail: txt }, 500);
    }

    const geminiJson = await geminiRes.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawText) return jsonResponse({ error: "Empty Gemini response" }, 500);

    let lessonContent: any;
    try {
      lessonContent = JSON.parse(stripJsonFences(rawText));
    } catch {
      return jsonResponse({ error: "Invalid JSON from Gemini", raw: rawText }, 500);
    }

    // Patch only this lesson
    aiPlan.modules[mi].lessons[li] = {
      ...lesson,
      status: "ready",
      content: lessonContent,
      ai_error: null,
      generated_at: new Date().toISOString(),
    };

    const { error: saveErr } = await admin
      .from("courses")
      .update({ ai_plan: aiPlan })
      .eq("id", course_id);

    if (saveErr) return jsonResponse({ error: saveErr.message }, 500);

    return jsonResponse({ ok: true, course_id, lesson_id }, 200);
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
