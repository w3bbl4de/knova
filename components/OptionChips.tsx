import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function OptionChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.list}>
      {options.map((opt) => {
        const selected = value === opt;

        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                selected
                  ? ["#7CF7D4", "#B38BFF", "#FF7BD5"]
                  : ["#2a2a2a", "#2a2a2a"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.border}
            >
              <View style={[s.card, selected && s.cardSelected]}>
                <Text style={s.title}>{opt}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: 14, marginTop: 14 },
  border: { borderRadius: 18, padding: 2 },
  card: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: "#0f0f10",
    borderWidth: 1,
    borderColor: "#1f1f22",
  },
  cardSelected: {
    backgroundColor: "#141417",
    borderColor: "transparent",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6,textAlign: "center" },
  desc: { color: "#9a9a9a", fontSize: 13, lineHeight: 18 },
});
