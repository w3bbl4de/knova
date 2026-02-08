import { supabase } from "./supabase";

export async function generateLesson(courseId: string, lessonId: string) {
  const { data, error } = await supabase.functions.invoke("generate-lesson", {
    body: { course_id: courseId, lesson_id: lessonId },
  });

  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "Lesson generation failed");
  return data;
}
