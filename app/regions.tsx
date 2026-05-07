import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { RegionCard } from "@/components/RegionCard";
import { FranceMapWithFallback } from "@/components/FranceMap";
import { RegionDetailModal } from "@/components/RegionDetailModal";
import { RegionId } from "@/data/regions";
import ScreenHeroHeader from "@/components/ScreenHeroHeader";
import { REGIONS_HEADER } from "@/data/regionImages";

export default function RegionsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const [selectedId, setSelectedId] = useState<RegionId | null>(null);

  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const sorted = [...state.regions].sort((a, b) => b.tension - a.tension);
  const avg =
    state.regions.reduce((s, r) => s + r.tension, 0) /
    Math.max(1, state.regions.length);

  const selectedRegion =
    selectedId != null
      ? state.regions.find((r) => r.id === selectedId) ?? null
      : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeroHeader
        source={REGIONS_HEADER}
        kicker="CARTE DE CRISE"
        title="Régions de France"
        subtitle={`Tension territoriale moyenne · ${Math.round(avg)} / 100`}
        onClose={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.avgCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.avgLabel, { color: colors.mutedForeground }]}>
            TENSION TERRITORIALE MOYENNE
          </Text>
          <Text style={[styles.avgValue, { color: colors.foreground }]}>
            {Math.round(avg)}
            <Text style={[styles.avgUnit, { color: colors.mutedForeground }]}>
              {" "}
              / 100
            </Text>
          </Text>
        </View>

        <FranceMapWithFallback
          regions={state.regions}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />

        <Text style={[styles.listLabel, { color: colors.mutedForeground }]}>
          DÉTAIL PAR RÉGION
        </Text>

        {sorted.map((r) => (
          <Pressable key={r.id} onPress={() => setSelectedId(r.id)}>
            <RegionCard region={r} />
          </Pressable>
        ))}
      </ScrollView>

      <RegionDetailModal
        region={selectedRegion}
        visible={selectedRegion != null}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  avgCard: {
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 4,
  },
  avgLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  avgValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    marginTop: 6,
  },
  avgUnit: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  listLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 4,
  },
});
