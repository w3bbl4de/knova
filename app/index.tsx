import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { getMyProfile } from "../lib/profile";
import { supabase } from "../lib/supabase";

export default function IndexGate() {
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        // if you have WelcomePage as public landing:
        router.replace("/WelcomePage");
        return;
      }

      const profile = await getMyProfile();
      const onboarded = !!profile?.onboarded_at;

      if (!onboarded) {
        router.replace("/onboarding/name"); // start onboarding flow
      } else {
        router.replace("/dashboard");
      }
    };

    run().catch(() => {
      // if something fails, safest default is onboarding
      router.replace("/onboarding/name");
    });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
