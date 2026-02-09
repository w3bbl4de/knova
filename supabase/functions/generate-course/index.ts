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

function isQuotaError(status: number, bodyText: string) {
  const t = bodyText.toLowerCase();
  return (
    status === 429 ||
    t.includes("quota") ||
    t.includes("rate limit") ||
    t.includes("resource_exhausted") ||
    t.includes("exceeded")
  );
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

// Merge lesson patch into ai_plan safely
function applyLessonPatch(aiPlan: any, patch: any) {
  const mi = (patch?.module_index ?? 1) - 1;
  const li = (patch?.lesson_index ?? 1) - 1;

  if (!aiPlan?.modules?.[mi]?.lessons?.[li]) {
    throw new Error("Patch refers to missing module/lesson index");
  }

  const existing = aiPlan.modules[mi].lessons[li];
  aiPlan.modules[mi].lessons[li] = {
    ...existing,
    ...patch.lesson,
    status: "ready",
  };

  // also mark module status ready if all lessons ready
  const allReady = aiPlan.modules[mi].lessons.every((l: any) => l?.status === "ready");
  aiPlan.modules[mi].status = allReady ? "ready" : "generating";

  return aiPlan;
}

async function geminiGenerateJSON(geminiKey: string, model: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
      },
    }),
  });

  const txt = await res.text();
  if (!res.ok) {
    return { ok: false as const, status: res.status, text: txt };
  }

  // parse response JSON, then extract candidate text
  let parsed: any;
  try {
    parsed = JSON.parse(txt);
  } catch {
    return { ok: false as const, status: 500, text: `Non-JSON Gemini response: ${txt}` };
  }

  const outText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!outText) {
    return { ok: false as const, status: 500, text: `Empty Gemini content: ${txt}` };
  }

  // parse the model-produced JSON (strip fences just in case)
  try {
    const json = JSON.parse(stripJsonFences(outText));
    return { ok: true as const, json };
  } catch {
    return { ok: false as const, status: 500, text: `Invalid JSON payload: ${outText}` };
  }
}

function buildTocPrompt(profile: any, course: any) {
  return `
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

You are generating Stage-1A (TOC only). Do NOT generate lesson content_blocks yet.

JSON schema:
{
  "schema_version": "course_v1_stage1",
  "overview": {
    "summary": string,
    "learning_outcomes": string[],
    "duration": string
  },
  "modules": [
    {
      "index": number,              // 1..N
      "title": string,
      "objective": string,
      "status": "pending",          // keep pending at TOC stage
      "lessons": [
        {
          "index": number,          // 1..M
          "title": string,
          "objective": string,
          "duration_minutes": number,
          "status": "pending"
        }
      ]
    }
  ]
}

Constraints:
- 4 to 6 modules
- Module 1 should have 4 to 6 lessons (keep it manageable)
- Other modules: 3 to 7 lessons
- Keep titles short and clear.
`.trim();
}

function buildLessonPrompt(profile: any, course: any, aiPlan: any, moduleIndex: number, lessonIndex: number) {
  const module = aiPlan.modules[moduleIndex - 1];
  const lesson = module.lessons[lessonIndex - 1];

  return `
Return ONLY valid JSON (no markdown, no backticks).

You are generating Stage-1B for ONE lesson only: Module ${moduleIndex}, Lesson ${lessonIndex}.
Generate full teaching content suitable for voice tutoring.

User profile (for personalization):
- name: ${profile?.name ?? ""}
- age: ${profile?.age ?? ""}
- status: ${profile?.status ?? ""}
- education: ${profile?.education ?? ""}
- time_per_day: ${profile?.time_per_day ?? ""}

Course:
- subject: ${course.subject}
- course_goal: ${course.goal}
- level: ${course.level}
- pace: ${course.pace ?? ""}
- prior_knowledge: ${course.prior_knowledge ?? ""}

Overview summary:
${aiPlan.overview?.summary ?? ""}

Module context:
- module_title: ${module.title}
- module_objective: ${module.objective}

Lesson context:
- lesson_title: ${lesson.title}
- lesson_objective: ${lesson.objective}
- duration_minutes: ${lesson.duration_minutes}

JSON schema:
{
  "module_index": ${moduleIndex},
  "lesson_index": ${lessonIndex},
  "lesson": {
    "status": "ready",
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
}

Hard limits (VERY IMPORTANT for quota):
- content_blocks: 5 to 8 blocks
- exercises: 2 to 3
- checkpoint_questions: 4 to 6
- Keep each content block content concise (voice tutor can elaborate live).
`.trim();
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
    if (!supabaseUrl || !anonKey) return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500);
    if (!serviceRoleKey) return jsonResponse({ error: "Missing SERVICE_ROLE_KEY" }, 500);
    if (!geminiKey) return jsonResponse({ error: "Missing GEMINI_API_KEY" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = userRes.user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: course, error: courseErr } = await admin
      .from("courses")
      .select("id, owner_id, subject, goal, level, pace, prior_knowledge, status, ai_plan")
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

    // If already fully ready, return immediately
    if (course.status === "ready" && course.ai_plan) {
      return jsonResponse({ ok: true, course_id, status: "ready", progress: { toc: true, module1: "complete" } }, 200);
    }

    // Set generating (do not mark failed for quota mid-way)
    await admin.from("courses").update({ status: "generating", ai_error: null }).eq("id", course_id);

    const model = "gemini-3-flash-preview";

    // 1) Ensure TOC exists
    let aiPlan = course.ai_plan;
    const hasToc =
      aiPlan?.schema_version === "course_v1_stage1" &&
      Array.isArray(aiPlan?.modules) &&
      aiPlan.modules.length > 0 &&
      aiPlan.modules[0]?.lessons?.length > 0;

    if (!hasToc) {
      const tocPrompt = buildTocPrompt(profile, course);

      const tocRes = await geminiGenerateJSON(geminiKey, model, tocPrompt);
      if (!tocRes.ok) {
        // Quota: keep generating and return partial progress
        if (isQuotaError(tocRes.status, tocRes.text)) {
          await admin.from("courses").update({ ai_error: `Gemini quota while generating TOC: ${tocRes.text}` }).eq("id", course_id);
          return jsonResponse(
            { ok: false, course_id, status: "generating", reason: "quota", progress: { toc: false, module1_ready: 0 } },
            200,
          );
        }

        await admin.from("courses").update({ status: "failed", ai_error: `Gemini TOC error: ${tocRes.text}` }).eq("id", course_id);
        return jsonResponse({ error: "Gemini TOC request failed", detail: tocRes.text }, 500);
      }

      aiPlan = tocRes.json;

      // Force module statuses per your staged rule:
      // Module 1 will be generated into "ready" lessons; modules 2..N remain pending titles only
      if (Array.isArray(aiPlan.modules)) {
        for (let i = 0; i < aiPlan.modules.length; i++) {
          aiPlan.modules[i].status = "pending";
          if (Array.isArray(aiPlan.modules[i].lessons)) {
            for (let j = 0; j < aiPlan.modules[i].lessons.length; j++) {
              aiPlan.modules[i].lessons[j].status = "pending";
            }
          }
        }
      }

      const { error: saveTocErr } = await admin
        .from("courses")
        .update({ ai_plan: aiPlan, ai_error: null })
        .eq("id", course_id);

      if (saveTocErr) return jsonResponse({ error: saveTocErr.message }, 500);
    }

    // 2) Generate Module 1 lessons sequentially (resumable)
    const moduleIndex = 1;
    const module1 = aiPlan.modules?.[0];
    if (!module1?.lessons?.length) {
      await admin.from("courses").update({ status: "failed", ai_error: "TOC missing Module 1 lessons" }).eq("id", course_id);
      return jsonResponse({ error: "TOC invalid: Module 1 lessons missing" }, 500);
    }

    let readyCount = 0;
    for (let i = 0; i < module1.lessons.length; i++) {
      if (aiPlan.modules[0].lessons[i]?.status === "ready") {
        readyCount++;
        continue;
      }

      const lessonIndex = i + 1;
      const lessonPrompt = buildLessonPrompt(profile, course, aiPlan, moduleIndex, lessonIndex);

      // small retry on quota only
      let attempt = 0;
      let lessonRes: any = null;

      while (attempt < 3) {
        attempt++;
        lessonRes = await geminiGenerateJSON(geminiKey, model, lessonPrompt);
        if (lessonRes.ok) break;

        if (isQuotaError(lessonRes.status, lessonRes.text)) {
          // backoff: 10s then 30s
          await sleep(attempt === 1 ? 10_000 : 30_000);
          continue;
        }
        break; // non-quota error -> stop
      }

      if (!lessonRes.ok) {
        if (isQuotaError(lessonRes.status, lessonRes.text)) {
          // stop here, do NOT fail course; user can resume later
          await admin
            .from("courses")
            .update({ ai_plan: aiPlan, ai_error: `Gemini quota during Module 1 Lesson ${lessonIndex}: ${lessonRes.text}` })
            .eq("id", course_id);

          return jsonResponse(
            {
              ok: false,
              course_id,
              status: "generating",
              reason: "quota",
              progress: { toc: true, module1_ready: readyCount, module1_total: module1.lessons.length },
            },
            200,
          );
        }

        // non-quota errors: mark failed (you can choose to keep generating too)
        await admin
          .from("courses")
          .update({ status: "failed", ai_error: `Gemini lesson error (M1L${lessonIndex}): ${lessonRes.text}` })
          .eq("id", course_id);

        return jsonResponse({ error: "Gemini lesson request failed", detail: lessonRes.text }, 500);
      }

      // Patch merge and persist after each lesson
      try {
        aiPlan = applyLessonPatch(aiPlan, lessonRes.json);
      } catch (e: any) {
        await admin
          .from("courses")
          .update({ status: "failed", ai_error: `Patch merge error: ${e?.message ?? "unknown"}` })
          .eq("id", course_id);
        return jsonResponse({ error: "Patch merge failed", detail: e?.message }, 500);
      }

      const { error: saveLessonErr } = await admin
        .from("courses")
        .update({ ai_plan: aiPlan, ai_error: null })
        .eq("id", course_id);

      if (saveLessonErr) return jsonResponse({ error: saveLessonErr.message }, 500);

      readyCount++;
    }

    // 3) If Module 1 complete, mark course ready
    await admin
      .from("courses")
      .update({
        status: "ready",
        generated_at: new Date().toISOString(),
        ai_error: null,
      })
      .eq("id", course_id);

    return jsonResponse(
      { ok: true, course_id, status: "ready", progress: { toc: true, module1_ready: readyCount, module1_total: module1.lessons.length } },
      200,
    );
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? "Unknown error" }, 500);
  }
});
