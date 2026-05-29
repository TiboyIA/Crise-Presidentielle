import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PALETTE } from "@/constants/uiTokens";
import { SectionBackdrop } from "@/components/ui/SectionBackdrop";
import type { SectionId } from "@/constants/sectionIdentity";

interface Props {
  section: SectionId;
  /** Applique le padding d'inset haut au contenu (défaut true). */
  topInset?: boolean;
  /** Intensité du motif de fond (transmise à SectionBackdrop). */
  intensity?: number;
  /** Affiche le halo radar du fond. */
  radar?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Conteneur d'écran de section : pose le fond cinématique full-bleed
 * (SectionBackdrop) derrière le contenu, gère l'inset de safe-area et
 * fournit une base sombre cohérente. Le contenu (en-têtes, panneaux,
 * scrolls) se rend par-dessus.
 *
 * Usage :
 *   <SectionScreen section="meteo">
 *     <ScreenHeader title="Salle Météo" .../>
 *     <ScrollView ... />
 *   </SectionScreen>
 */
export function SectionScreen({ section, topInset = true, intensity, radar, style, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, style]}>
      <SectionBackdrop section={section} intensity={intensity} radar={radar} />
      <View style={{ flex: 1, paddingTop: topInset ? insets.top : 0 }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.void },
});
