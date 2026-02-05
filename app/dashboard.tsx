import { router } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Dashboard</Text>
        <Text style={styles.subtitle}>Create your personalized course</Text>

        {/* Add Course Button */}
        <TouchableOpacity
          style={styles.addCard}
          onPress={() => router.push("/create-course/subject")} // you can create this later
        >
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.addText}>Add Course</Text>
        </TouchableOpacity>
        <TouchableOpacity
  onPress={async () => {
    await supabase.auth.signOut();
    router.replace("/");
  }}
>
  <Text style={{ color: "#ff6b6b", marginTop: 20 }}>Logout</Text>
</TouchableOpacity>

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
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#9a9a9a",
    marginBottom: 24,
  },

  addCard: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    fontSize: 36,
    color: "#fff",
    marginBottom: 6,
  },
  addText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
