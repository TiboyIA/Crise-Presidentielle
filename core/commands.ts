/**
 * commands.ts — Types et identifiants pour le système de commandes idempotentes.
 *
 * Règle : chaque action gameplay importante a un CommandType nommé.
 * Un commandId scoped (type + clé) identifie une instance précise
 * (ex: "upgrade_building:economy_ministry").
 *
 * Aucune dépendance React ici — ce module est importable dans les tests.
 */

export type CommandType =
  | "upgrade_building"
  | "start_research"
  | "train_unit"
  | "launch_operation"
  | "resolve_crisis";

/**
 * Construit un identifiant de commande unique.
 * @param type   Le type d'action (ex: "upgrade_building")
 * @param scope  Discriminant optionnel (ex: "economy_ministry", "espionage:france")
 */
export function commandId(type: CommandType, scope?: string): string {
  return scope ? `${type}:${scope}` : type;
}
