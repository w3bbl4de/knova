import { router } from "expo-router";
import React, { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

// 🔐 Demo-only built-in judge credentials (web app: anyone can view bundle)
// Replace password with your real Supabase user's password.
const JUDGE_EMAIL = "judge@knova.com";
const JUDGE_PASSWORD = "user@123";

export default function DevLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const canLogin = username.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    setError("");

    // map username -> email (simple)
    const email =
      username.trim().toLowerCase() === "judge"
        ? JUDGE_EMAIL
        : username.trim(); // allow typing email directly too

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    else router.replace("/dashboard");
  };

  // ✅ One-tap judge login (no username/password UI needed)
  const handleJudgeLogin = async () => {
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: JUDGE_EMAIL,
      password: JUDGE_PASSWORD,
    });

    if (error) setError(error.message);
    else router.replace("/dashboard");
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>Dev / Judge Login</Text>

        {/* One-tap judge login */}
        <TouchableOpacity
          style={s.judgeButton}
          onPress={handleJudgeLogin}
          activeOpacity={0.85}
        >
          <Text style={s.judgeButtonText}>Login as Judge</Text>
        </TouchableOpacity>

        <Text style={s.or}>or login manually</Text>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="username (judge) or email"
          placeholderTextColor="#666"
          style={s.input}
          autoCapitalize="none"
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="password"
          placeholderTextColor="#666"
          style={s.input}
          secureTextEntry
        />

        {!!error && <Text style={s.error}>{error}</Text>}
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.button, !canLogin && s.disabled]}
          disabled={!canLogin}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          <Text style={s.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "700", marginBottom: 14 },

  judgeButton: {
    backgroundColor: "rgba(239, 68, 68, 0.22)", // light red, semi-opaque
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  judgeButtonText: {
    color: "#fecaca",
    fontSize: 16,
    fontWeight: "800",
  },
  or: {
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 12,
    fontSize: 12,
  },

  input: {
    backgroundColor: "#121212",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 12,
  },
  error: { color: "#ff6b6b", marginTop: 8 },
  footer: { padding: 16, backgroundColor: "#000" },

  button: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
