import type { HostilePower, HybridOpVector } from "@/types/game";

/**
 * Module 6 — Acteurs hostiles fictifs.
 *
 * IMPORTANT (conformité Apple/Google) : aucun pays, parti, organisation
 * ou dirigeant·e réel·le n'est nommé·e ici. « La Division Zéro » est
 * une faction entièrement fictionnelle. Les autres rôles internationaux
 * référencés par d'autres modules (OTAN, etc.) sont eux dans le
 * catalogue d'événements historique du jeu et n'engagent pas ce
 * module.
 */

/**
 * Construit la doctrine d'un acteur — pondération de chacun des 9
 * vecteurs hybrides. La fonction garantit que toutes les clés sont
 * présentes (Record exhaustif) avec une valeur par défaut.
 */
function makeDoctrine(
  base: number,
  overrides: Partial<Record<HybridOpVector, number>>,
): Record<HybridOpVector, number> {
  return {
    cyber: overrides.cyber ?? base,
    disinformation: overrides.disinformation ?? base,
    espionage: overrides.espionage ?? base,
    energy_blackmail: overrides.energy_blackmail ?? base,
    industrial_sabotage: overrides.industrial_sabotage ?? base,
    diplomatic_pressure: overrides.diplomatic_pressure ?? base,
    social_manipulation: overrides.social_manipulation ?? base,
    document_leak: overrides.document_leak ?? base,
    infrastructure_attack: overrides.infrastructure_attack ?? base,
  };
}

/**
 * Profil par défaut : « La Division Zéro ».
 *
 * Faction transnationale anonyme spécialisée en cyber-influence et
 * en sabotage discret. Privilégie la déstabilisation longue durée
 * (cyber + désinformation + fuite) plutôt que la confrontation
 * frontale. Aggression initiale modérée (30) : elle observe avant
 * de frapper.
 */
export function createDefaultHostilePower(): HostilePower {
  return {
    id: "hp_division_zero",
    name: "La Division Zéro",
    color: "#8b1a1a",
    description:
      "Faction transnationale anonyme. Spécialisée dans la guerre " +
      "informationnelle et le sabotage discret, elle teste les " +
      "vulnérabilités de votre République sans jamais signer ses " +
      "coups.",
    doctrine: makeDoctrine(0.5, {
      cyber: 1.0,
      disinformation: 1.0,
      espionage: 0.8,
      document_leak: 0.8,
      industrial_sabotage: 0.7,
      social_manipulation: 0.7,
      infrastructure_attack: 0.6,
      diplomatic_pressure: 0.5,
      energy_blackmail: 0.4,
    }),
    aggression: 30,
    lastOpTurn: 0,
  };
}
