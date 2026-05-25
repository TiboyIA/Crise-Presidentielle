/**
 * Garde-fou du bac à sable développeur.
 * Double condition : __DEV__ ET variable d'environnement explicite.
 * En production les deux fonctions sont des no-ops sûrs.
 */

export function isDevSandboxEnabled(): boolean {
  return __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_SANDBOX === "true";
}

/**
 * Lance une erreur si le bac à sable n'est pas autorisé.
 * À appeler en tête de chaque entrée sandbox.
 */
export function assertSandboxAllowed(): void {
  if (!isDevSandboxEnabled()) {
    throw new Error(
      "[DEV] Bac à sable désactivé. " +
        "Définissez EXPO_PUBLIC_ENABLE_DEV_SANDBOX=true dans .env.local " +
        "et relancez le serveur Expo.",
    );
  }
}
