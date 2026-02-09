import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 150000,
        easing: Easing.linear,
      }),
      -1, // Infinite
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const handlePress = (route: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.glowContainer}>
        <View style={styles.glow} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>

          {/* Hero Image Section */}
          <View style={styles.imageContainer}>
            <Animated.View style={[styles.spiralContainer, animatedStyle]}>
              <Image
                source={require("../assets/images/spiral-universe.png")}
                style={styles.spiral}
                resizeMode="contain"
              />
            </Animated.View>
            <View style={styles.core} />
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            

            <Animated.Text
              entering={FadeInDown.delay(400).springify()}
              style={styles.title}
            >
              Master Any Subject{"\n"}
              <Text style={styles.titleGradient}>Learn Anything</Text>
            </Animated.Text>

            <Animated.Text
              entering={FadeInDown.delay(500).springify()}
              style={styles.subtitle}
            >
              Your personalized AI tutor that adapts to your learning style and pace.
            </Animated.Text>
          </View>

          {/* Buttons */}
          <Animated.View
            entering={FadeInUp.delay(600).springify()}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
  if (typeof window !== "undefined") {
    window.alert(
      "Registration disabled.\n\nThis app is in demo mode. Please use Dev / Judge Login to continue."
    );
  }
}}
            >
              <LinearGradient
                colors={["#fff", "#e0e0e0"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
  activeOpacity={0.85}
  style={styles.devJudgeButton}
  onPress={() => handlePress("/dev-login")} // will change once I see your auth flow
>
  <Text style={styles.devJudgeText}>Dev / Judge Login</Text>
</TouchableOpacity>


            <Text style={styles.terms}>
              By continuing, you agree to our{" "}
              <Text style={styles.link}>Terms</Text> &{" "}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1,
  },
  glow: {
  width: width * 2.2,
  height: width * 2.2,
  borderRadius: width * 1.1,
  backgroundColor: "rgba(100, 50, 255, 0.06)",
  shadowColor: "#6432ff",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.35,
  shadowRadius: 80,
  elevation: 12,
},
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  spiralContainer: {
    width: width * 0.5,
    height: width * 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  spiral: {
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  core: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 10,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#a78bfa", // Light purple
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  titleGradient: {
    color: "#c084fc", // Lighter purple/pinkish
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
    marginBottom: 10,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 100,
    gap: 8,
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#d1d5db",
  },
  terms: {
    marginTop: 8,
    fontSize: 11,
    color: "#4b5563", // Gray 600
    textAlign: "center",
    lineHeight: 16,
  },
  devJudgeButton: {
  width: "100%",
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: "center",
  backgroundColor: "rgba(239, 68, 68, 0.22)", // light red, semi-opaque
  borderWidth: 1,
  borderColor: "rgba(239, 68, 68, 0.35)",
},
devJudgeText: {
  fontSize: 16,
  fontWeight: "700",
  color: "#fecaca", // light red text
},
  link: {
    color: "#6b7280", // Gray 500
    textDecorationLine: "underline",
  },
});