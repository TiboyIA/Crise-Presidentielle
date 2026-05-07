import type { ImageSourcePropType } from "react-native";
import type { HybridOpVector } from "@/types/game";

/**
 * Module 6 / LOT 3 — Mapping vecteur hybride → illustration.
 *
 * Chaque vecteur a sa propre illustration 16:9 (1024×576) qui sert :
 *   - de bandeau dans la card du journal des opérations sur `/front`
 *   - en miniature dans le panel de menace du dashboard (option future)
 *
 * Les images sont stockées dans `assets/images/hybrid/` avec le préfixe
 * `vector_<id>.png`. Le préfixe est volontaire pour éviter les conflits
 * avec les autres images du module 6 (`division_zero.png`,
 * `hybrid_warfare.png`, `state_of_war.png`).
 *
 * Toutes les images sont conformes Apple/Google : aucun drapeau réel,
 * aucun symbole politique reconnaissable, aucun texte lisible, aucun
 * visage de personne réelle.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_CYBER = require("@/assets/images/hybrid/vector_cyber.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_DISINFORMATION = require("@/assets/images/hybrid/vector_disinformation.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_ESPIONAGE = require("@/assets/images/hybrid/vector_espionage.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_ENERGY_BLACKMAIL = require("@/assets/images/hybrid/vector_energy_blackmail.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_INDUSTRIAL_SABOTAGE = require("@/assets/images/hybrid/vector_industrial_sabotage.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_DIPLOMATIC_PRESSURE = require("@/assets/images/hybrid/vector_diplomatic_pressure.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_SOCIAL_MANIPULATION = require("@/assets/images/hybrid/vector_social_manipulation.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_DOCUMENT_LEAK = require("@/assets/images/hybrid/vector_document_leak.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const VECTOR_INFRASTRUCTURE_ATTACK = require("@/assets/images/hybrid/vector_infrastructure_attack.png");

export const HYBRID_VECTOR_IMAGES: Record<HybridOpVector, ImageSourcePropType> = {
  cyber: VECTOR_CYBER,
  disinformation: VECTOR_DISINFORMATION,
  espionage: VECTOR_ESPIONAGE,
  energy_blackmail: VECTOR_ENERGY_BLACKMAIL,
  industrial_sabotage: VECTOR_INDUSTRIAL_SABOTAGE,
  diplomatic_pressure: VECTOR_DIPLOMATIC_PRESSURE,
  social_manipulation: VECTOR_SOCIAL_MANIPULATION,
  document_leak: VECTOR_DOCUMENT_LEAK,
  infrastructure_attack: VECTOR_INFRASTRUCTURE_ATTACK,
};

/**
 * Image d'incarnation de l'acteur hostile par défaut.
 * Utilisée en bandeau hero sur la card "ACTEUR HOSTILE" de `/front`.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const DIVISION_ZERO_PORTRAIT: ImageSourcePropType = require("@/assets/images/hybrid/division_zero.png");

/**
 * Bandeau pour la catégorie d'événement `hybrid_warfare` du EventModal.
 * Réexporté ici pour cohérence du module 6 ; le mapping principal
 * vit dans `data/eventCategoryImages.ts`.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const HYBRID_WARFARE_BANNER: ImageSourcePropType = require("@/assets/images/hybrid/hybrid_warfare.png");

/**
 * Bandeau pour le `WarBanner` quand status === "war" ou "ultimatum".
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const STATE_OF_WAR_BANNER: ImageSourcePropType = require("@/assets/images/hybrid/state_of_war.png");
