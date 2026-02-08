import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

const storage =
  Platform.OS === "web"
    ? {
        getItem: (key: string) => Promise.resolve(globalThis?.localStorage?.getItem(key) ?? null),
        setItem: (key: string, value: string) => Promise.resolve(globalThis?.localStorage?.setItem(key, value)),
        removeItem: (key: string) => Promise.resolve(globalThis?.localStorage?.removeItem(key)),
      }
    : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    storageKey: "adaptive_learning_auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
