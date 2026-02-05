import { router } from "expo-router";
import React, { useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function DevLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const canLogin = username.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    setError("");

    // map username -> email (simple)
    const email = username.trim().toLowerCase() === "judge"
      ? "judge@novaquest.dev"
      : username.trim(); // allow typing email directly too

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError(error.message);
    else router.replace("/dashboard");
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <Text style={s.title}>Dev / Judge Login</Text>

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
  button: { backgroundColor: "#fff", paddingVertical: 16, borderRadius: 32, alignItems: "center" },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
