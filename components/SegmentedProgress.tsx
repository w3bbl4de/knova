import React from "react";
import { StyleSheet, View } from "react-native";

export default function SegmentedProgress({
  total,
  current, // 1-based: 1..total
}: {
  total: number;
  current: number;
}) {
  return (
    <View style={s.row}>
      {Array.from({ length: total }).map((_, i) => {
        const done = i < current;
        return <View key={i} style={[s.seg, done ? s.on : s.off]} />;
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  seg: {
    height: 6,
    flex: 1,
    borderRadius: 999,
  },
  on: { backgroundColor: "#22c55e" },  // green
  off: { backgroundColor: "#2a2a2a" }, // gray
});
