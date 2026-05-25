// ── Mode Une Main — Barre de navigation basse ────────────────────────────────
// Overlay flottant en bas d'écran activé par le mode "Une main".
// Donne accès aux 5 destinations principales d'un seul pouce sans monter
// vers le haut de l'écran.
//
// Pattern : absoluteFill + pointerEvents="box-none" sur le conteneur →
// les zones vides (au-dessus de la barre) laissent passer les touches
// vers le contenu sous-jacent. Seule la barre elle-même est cliquable.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useComfort } from "@/context/ComfortContext";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface NavItem {
  label: string;
  icon:  McIconName;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Nation",    icon: "home-outline",              route: "/nation" },
  { label: "Journal",   icon: "newspaper-variant-outline", route: "/journal-crise" },
  { label: "Carte",     icon: "earth",                     route: "/worldmap" },
  { label: "Opérations",icon: "crosshairs-gps",            route: "/operations" },
  { label: "Missions",  icon: "flag-checkered",             route: "/missions" },
];

// Écrans sur lesquels la barre est affichée.
// Volontairement explicite pour éviter d'interférer avec les modaux
// et les écrans pré-jeu (home, settings, saves…).
const SHOWN_PATHS = new Set([
  "/nation",
  "/journal-crise",
  "/worldmap",
  "/operations",
  "/missions",
  "/alliances",
  "/strategy-research",
  "/spy-ops",
  "/cyber-ops",
  "/forces-armees",
  "/buildings",
  "/ranking",
  "/entities",
  "/risques",
]);

export function OneHandBar() {
  const { oneHand } = useComfort();
  const pathname    = usePathname();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();

  if (!oneHand || !SHOWN_PATHS.has(pathname)) return null;

  const barHeight = 54 + Math.max(insets.bottom, 8);

  return (
    // Le View absoluteFill laisse passer les touches dans les zones vides
    // (pointerEvents="box-none") mais ses enfants restent cliquables.
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={[styles.bar, { height: barHeight, paddingBottom: Math.max(insets.bottom, 8) }]}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as Parameters<typeof router.push>[0])}
              style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.65 : 1 }]}
              hitSlop={6}
            >
              {active && <View style={styles.activePill} />}
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={active ? PALETTE.gold : PALETTE.textLow}
              />
              <Text style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    flexDirection:   "row",
    alignItems:      "flex-start",
    justifyContent:  "space-around",
    paddingTop:      10,
    backgroundColor: "rgba(8,12,20,0.94)",
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  PALETTE.panelEdge,
    // subtle gold top glow
    shadowColor:    PALETTE.gold,
    shadowOffset:   { width: 0, height: -2 },
    shadowOpacity:  0.08,
    shadowRadius:   6,
    elevation:      12,
  },

  tab: {
    flex:           1,
    alignItems:     "center",
    gap:            3,
    paddingVertical:4,
    position:       "relative",
  },

  activePill: {
    position:        "absolute",
    top:             -10,
    width:           28,
    height:          3,
    borderRadius:    RADIUS.pill,
    backgroundColor: PALETTE.gold,
  },

  label: {
    fontSize:    9,
    fontFamily:  FONT.bold,
    color:       PALETTE.textLow,
    letterSpacing: 0.5,
    textAlign:   "center",
  },
  labelActive: {
    color: PALETTE.gold,
  },
});
