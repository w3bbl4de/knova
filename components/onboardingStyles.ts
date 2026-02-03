import { StyleSheet } from "react-native";

export const ob = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, padding: 24, justifyContent: "center" },

  title: { color: "#fff", fontSize: 28, fontWeight: "700" },
  subtitle: { color: "#9a9a9a", marginTop: 8, marginBottom: 18 },

  input: {
    backgroundColor: "#121212",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 16,
  },

  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#222",
  },
  chipOn: { backgroundColor: "#fff", borderColor: "#fff" },
  chipText: { color: "#fff" },
  chipTextOn: { color: "#000", fontWeight: "700" },

  button: {
    marginTop: 18,
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "700" },
});
