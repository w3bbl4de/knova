import React from "react";
import { router } from "expo-router";

import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Spiral Image */}
        <Image
          source={require("../assets/images/spiral-universe.png")}
          style={styles.spiral}
          resizeMode="contain"
        />

        {/* Text */}
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Your journey starts from here</Text>

        {/* Buttons */}
        <TouchableOpacity
  style={styles.primaryButton}
  onPress={() => router.push("./onboarding/name")}
>
  <Text style={styles.primaryText}>Continue with Phone</Text>
</TouchableOpacity>


        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Continue with Apple</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.terms}>
          By pressing on “Continue”, you agree to our{" "}
          <Text style={styles.link}>Terms of Service</Text> and{" "}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  spiral: {
    width: 260,
    height: 260,
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9a9a9a",
    marginBottom: 40,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "#1c1c1e",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  terms: {
    marginTop: 24,
    fontSize: 12,
    color: "#6e6e6e",
    textAlign: "center",
  },
  link: {
    color: "#fff",
    textDecorationLine: "underline",
  },
});