import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PALETTE, RADIUS } from "@/constants/uiTokens";

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface Props {
  /** Nom d'icône MaterialCommunityIcons (cf. iconMap / sectionIdentity). */
  name: string;
  size?: number;
  color?: string;
  /** Pastille de fond (cercle teinté autour de l'icône). */
  chip?: boolean;
  /** Couleur de la pastille (par défaut accent à 14% d'opacité). */
  chipColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Icône de domaine homogène — wrapper unique autour de MaterialCommunityIcons.
 * Garantit une taille, une couleur et un style de pastille cohérents partout,
 * en remplacement des emojis. Centralise le cast de type du nom d'icône.
 */
export function DomainIcon({ name, size = 16, color = PALETTE.textHigh, chip = false, chipColor, style }: Props) {
  const icon = <MaterialCommunityIcons name={name as MCIName} size={size} color={color} />;

  if (!chip) {
    return <View style={style}>{icon}</View>;
  }

  const pad = Math.round(size * 0.5);
  return (
    <View
      style={[
        {
          width: size + pad,
          height: size + pad,
          borderRadius: RADIUS.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: chipColor ?? color + "1f",
        },
        style,
      ]}
    >
      {icon}
    </View>
  );
}
