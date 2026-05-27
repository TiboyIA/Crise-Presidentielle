import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FONT, PALETTE, RADIUS } from "@/constants/uiTokens";
import type { OrionDistrictId } from "@/types/cosmic";

type McName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface DistrictDef {
  id:        OrionDistrictId;
  name:      string;
  role:      string;
  icon:      McName;
  alignment: "aurora" | "neutral" | "obscurium" | "judgment" | "threshold";
  known:     boolean;
}

const DISTRICT_DEFS: Record<OrionDistrictId, Omit<DistrictDef, "known">> = {
  porte_orion: {
    id:        "porte_orion",
    name:      "La Porte d'Orion",
    role:      "Arrivée des délégations",
    icon:      "door-open",
    alignment: "neutral",
  },
  marche_silences: {
    id:        "marche_silences",
    name:      "Le Marché des Silences",
    role:      "Renseignement & secrets",
    icon:      "eye-outline",
    alignment: "neutral",
  },
  couloir_noir: {
    id:        "couloir_noir",
    name:      "Le Couloir Noir",
    role:      "Zone liée à Obscurium",
    icon:      "skull-outline",
    alignment: "obscurium",
  },
  dome_ambassades: {
    id:        "dome_ambassades",
    name:      "Le Dôme des Ambassades",
    role:      "Diplomatie cosmique",
    icon:      "bank-outline",
    alignment: "aurora",
  },
  phare_aurora: {
    id:        "phare_aurora",
    name:      "Le Phare d'Aurora",
    role:      "Protection conditionnelle",
    icon:      "lighthouse-on",
    alignment: "aurora",
  },
  archives_stellaires: {
    id:        "archives_stellaires",
    name:      "Les Archives Stellaires",
    role:      "Savoir ancien",
    icon:      "book-open-variant",
    alignment: "aurora",
  },
  tribunal_especes: {
    id:        "tribunal_especes",
    name:      "Le Tribunal des Espèces",
    role:      "Jugement & sanctions",
    icon:      "gavel",
    alignment: "judgment",
  },
  chambre_seuil: {
    id:        "chambre_seuil",
    name:      "La Chambre du Seuil",
    role:      "Négociation Aurora / Obscurium",
    icon:      "yin-yang",
    alignment: "threshold",
  },
};

const ALIGNMENT_COLORS: Record<string, string> = {
  aurora:    "#7ec8f7",
  neutral:   PALETTE.textLow,
  obscurium: "#9b6fd4",
  judgment:  "#e8c44f",
  threshold: "#a78bfa",
};

interface Props {
  districtId: OrionDistrictId;
  known: boolean;
}

export function OrionDistrictCard({ districtId, known }: Props) {
  const def   = DISTRICT_DEFS[districtId];
  const color = known ? ALIGNMENT_COLORS[def.alignment] : "#2a2e3a";

  return (
    <View style={[s.card, { borderColor: color + "44", opacity: known ? 1 : 0.45 }]}>
      <MaterialCommunityIcons name={def.icon} size={14} color={color} />
      <Text style={[s.name, { color }]} numberOfLines={1}>{known ? def.name : "???"}</Text>
      {known && <Text style={s.role} numberOfLines={1}>{def.role}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: "47%", padding: 8, borderRadius: RADIUS.xs, borderWidth: 1, backgroundColor: "#0d1020", gap: 4 },
  name: { fontSize: 9, fontFamily: FONT.semi },
  role: { fontSize: 8, fontFamily: FONT.reg, color: PALETTE.textLow },
});
