import { supabase } from "./supabase";

export async function getLiveToken(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("mint-live-token");

  if (error) throw error;
  if (!data?.ok || !data?.token) {
    throw new Error(data?.error ?? "Failed to mint live token");
  }
  return data.token as string;
}
