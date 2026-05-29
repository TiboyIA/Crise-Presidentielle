import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Line, Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { getSectionIdentity, type SectionId } from "@/constants/sectionIdentity";

interface Props {
  section: SectionId;
  /** Intensité du motif (0 → discret, 1 → marqué). Défaut 0.6. */
  intensity?: number;
  /** Affiche le halo radar concentrique (centre haut-droit). Défaut true. */
  radar?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const GRID_COLS = 9;
const GRID_ROWS = 16;

/**
 * Fond cinématique « salle de commandement » composé entièrement en code :
 *   1. dégradé de base propre à la section ;
 *   2. grille tactique en SVG (lignes fines) ;
 *   3. halo radar concentrique dans la couleur d'accent ;
 *   4. vignette assombrissant les bords pour la lisibilité du texte.
 *
 * Aucune image binaire requise. Léger et fluide sur mobile.
 */
export function SectionBackdrop({ section, intensity = 0.6, radar = true, style, children }: Props) {
  const id = getSectionIdentity(section);

  const grid = useMemo(() => {
    const cols = Array.from({ length: GRID_COLS - 1 }, (_, i) => ((i + 1) / GRID_COLS) * 100);
    const rows = Array.from({ length: GRID_ROWS - 1 }, (_, i) => ((i + 1) / GRID_ROWS) * 100);
    return { cols, rows };
  }, []);

  const gridOpacity = 0.05 * intensity;
  const accentOpacity = 0.16 * intensity;

  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="box-none">
      {/* 1. dégradé de base */}
      <LinearGradient
        colors={[id.gradient[0], id.gradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 2-3. grille tactique + halo radar (SVG, viewBox 0-100) */}
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="accentGlow" cx="78%" cy="14%" r="60%">
            <Stop offset="0" stopColor={id.accent} stopOpacity={accentOpacity} />
            <Stop offset="1" stopColor={id.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* halo d'accent */}
        <Rect x="0" y="0" width="100" height="100" fill="url(#accentGlow)" />

        {/* grille verticale */}
        {grid.cols.map((x) => (
          <Line key={`c${x}`} x1={x} y1="0" x2={x} y2="100" stroke={id.accent} strokeOpacity={gridOpacity} strokeWidth="0.15" />
        ))}
        {/* grille horizontale */}
        {grid.rows.map((y) => (
          <Line key={`r${y}`} x1="0" y1={y} x2="100" y2={y} stroke={id.accent} strokeOpacity={gridOpacity} strokeWidth="0.15" />
        ))}

        {/* halo radar concentrique en haut-droite */}
        {radar && (
          <>
            <Circle cx="80" cy="12" r="14" stroke={id.accent} strokeOpacity={accentOpacity * 1.1} strokeWidth="0.2" fill="none" />
            <Circle cx="80" cy="12" r="24" stroke={id.accent} strokeOpacity={accentOpacity * 0.7} strokeWidth="0.2" fill="none" />
            <Circle cx="80" cy="12" r="34" stroke={id.accent} strokeOpacity={accentOpacity * 0.45} strokeWidth="0.18" fill="none" />
          </>
        )}
      </Svg>

      {/* 4. vignette de lisibilité (bas) */}
      <LinearGradient
        colors={["transparent", "rgba(5,7,13,0.55)"]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}
