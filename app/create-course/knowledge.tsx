import { router } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCreateCourse } from "../../context/CreateCourseContext";

export default function KnowledgeStep() {
  const { data, setData } = useCreateCourse();
  const [notes, setNotes] = useState(data.prior_knowledge ?? "");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>What do you already know?</Text>
          <Text style={styles.subtitle}>
            Optional — helps personalize the course
          </Text>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder='Example: "I know variables and loops, but not async/await"'
            placeholderTextColor="#666"
            style={styles.input}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        {/* Footer stays visible above keyboard */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setData((p) => ({ ...p, prior_knowledge: notes.trim() }));
              router.push("/create-course/review");
            }}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9a9a9a",
    marginTop: 8,
    marginBottom: 18,
  },
  input: {
    backgroundColor: "#121212",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 14,
    minHeight: 140,
  },
  footer: {
    padding: 16,
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderColor: "#1f1f1f",
  },
  button: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 32,
    alignItems: "center",
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
});
