import React, { memo, useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Minister } from "@/data/ministers";
import { MINISTER_PORTRAITS } from "@/data/ministerImages";

interface Props {
  ministers: Minister[];
  onPress: () => void;
}

function PanelistesRowImpl({ ministers, onPress }: Props) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const dotOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  // Pick the 3 most relevant panelists. Prefer PM, Intérieur, Économie.
  // Fall back to first 3 in the list to never crash on a custom cabinet.
  const preferredOrder: string[] = ["pm", "interior", "economy"];
  const ranked = [...ministers].sort((a, b) => {
    const ai = preferredOrder.indexOf(a.position);
    const bi = preferredOrder.indexOf(b.position);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const pick = ranked.slice(0, 3);

  if (pick.length === 0) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Constituer le cabinet ministériel"
        style={({ pressed }) => [
          styles.emptyCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Aucun conseiller en plateau
        </Text>
        <Text
          style={[styles.emptyDesc, { color: colors.mutedForeground }]}
        >
          Ouvrez le cabinet pour nommer vos ministres.
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      {pick.map((m) => {
        const portrait = MINISTER_PORTRAITS[m.position];
        return (
          <Pressable
            key={m.position}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir le cabinet · ${m.positionLabel} ${m.name}, loyauté ${Math.round(m.loyalty)}%`}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.liveBadge}>
              <Animated.View
                style={[
                  styles.liveDot,
                  { backgroundColor: colors.danger, opacity: dotOpacity },
                ]}
              />
              <Text style={[styles.liveText, { color: colors.danger }]}>
                LIVE
              </Text>
            </View>

            <View
              style={[
                styles.portraitBox,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Image
                source={portrait}
                style={styles.portrait}
                resizeMode="cover"
              />
            </View>

            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {m.name}
            </Text>
            <Text
              style={[styles.role, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {m.positionLabel.toUpperCase()}
            </Text>

            <View
              style={[styles.loyaltyTrack, { backgroundColor: colors.muted }]}
            >
              <View
                style={[
                  styles.loyaltyFill,
                  {
                    backgroundColor: colors.blue,
                    width: `${Math.max(0, Math.min(100, m.loyalty))}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.loyaltyText, { color: colors.mutedForeground }]}
            >
              {Math.round(m.loyalty)}% LOY.
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const PanelistesRow = memo(PanelistesRowImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
  },
  liveBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    zIndex: 1,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  portraitBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 10,
  },
  portrait: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.12 }],
  },
  name: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginTop: 4,
  },
  role: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  loyaltyTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 6,
  },
  loyaltyFill: {
    height: "100%",
  },
  loyaltyText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  emptyCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
