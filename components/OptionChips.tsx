import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ob } from "./onboardingStyles";

export default function OptionChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={ob.wrap}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[ob.chip, selected && ob.chipOn]}
            onPress={() => onChange(opt)}
          >
            <Text style={[ob.chipText, selected && ob.chipTextOn]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
