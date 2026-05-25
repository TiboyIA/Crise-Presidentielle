import type { MaterialCommunityIcons } from "@expo/vector-icons";

type McIconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export type ProfileId =
  | "standard"
  | "comfort_visual"
  | "low_fatigue"
  | "large_controls"
  | "simplified"
  | "reduced_motion";

export interface AccessibilityProfile {
  id: ProfileId;
  label: string;
  description: string;
  icon: McIconName;
  /** Multiplicateur taille de police (1.0 = base) */
  fontScale: number;
  /** Multiplicateur espacement/padding (1.0 = base) */
  spacingScale: number;
  /** Durée des animations en ms (0 = désactivé) */
  animDuration: number;
  /** Réduit la densité d'informations sur les écrans clés */
  reducedInfo: boolean;
  /** Ajoute une confirmation pour toutes les actions (pas seulement les offensives) */
  extraConfirm: boolean;
  /** Renforce les contrastes sur les valeurs textuelles */
  contrastBoost: boolean;
}

export const PROFILES: Record<ProfileId, AccessibilityProfile> = {
  standard: {
    id:            "standard",
    label:         "Standard",
    description:   "Interface par défaut, toutes options actives.",
    icon:          "square-outline",
    fontScale:     1.0,
    spacingScale:  1.0,
    animDuration:  200,
    reducedInfo:   false,
    extraConfirm:  false,
    contrastBoost: false,
  },
  comfort_visual: {
    id:            "comfort_visual",
    label:         "Confort visuel",
    description:   "Textes agrandis, contrastes améliorés.",
    icon:          "eye-outline",
    fontScale:     1.12,
    spacingScale:  1.1,
    animDuration:  150,
    reducedInfo:   false,
    extraConfirm:  false,
    contrastBoost: true,
  },
  low_fatigue: {
    id:            "low_fatigue",
    label:         "Faible fatigue",
    description:   "Animations réduites, densité d'information allégée.",
    icon:          "timer-sand",
    fontScale:     1.05,
    spacingScale:  1.15,
    animDuration:  80,
    reducedInfo:   true,
    extraConfirm:  false,
    contrastBoost: false,
  },
  large_controls: {
    id:            "large_controls",
    label:         "Grandes commandes",
    description:   "Boutons et zones de tap élargis.",
    icon:          "gesture-tap",
    fontScale:     1.0,
    spacingScale:  1.3,
    animDuration:  200,
    reducedInfo:   false,
    extraConfirm:  false,
    contrastBoost: false,
  },
  simplified: {
    id:            "simplified",
    label:         "Lecture simplifiée",
    description:   "Informations clés uniquement, confirmations renforcées.",
    icon:          "text-box-outline",
    fontScale:     1.08,
    spacingScale:  1.1,
    animDuration:  100,
    reducedInfo:   true,
    extraConfirm:  true,
    contrastBoost: true,
  },
  reduced_motion: {
    id:            "reduced_motion",
    label:         "Sans animations",
    description:   "Transitions et effets de mouvement désactivés.",
    icon:          "motion-pause-outline",
    fontScale:     1.0,
    spacingScale:  1.0,
    animDuration:  0,
    reducedInfo:   false,
    extraConfirm:  false,
    contrastBoost: false,
  },
};

export const PROFILE_LIST: AccessibilityProfile[] = Object.values(PROFILES);
