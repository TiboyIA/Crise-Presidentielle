/**
 * AppIntegrityService — abstraction pour Play Integrity (Android) et App Attest (iOS).
 *
 * ÉTAT ACTUEL : scaffolding — aucune vérification native réelle n'est branchée.
 * En mode développement (Expo Go, __DEV__), l'intégrité est simulée (bypass explicite).
 * En mode production, les fonctions sont prêtes à recevoir les vrais SDK natifs.
 *
 * ─── POUR ALLER EN PRODUCTION ────────────────────────────────────────────────
 *
 * Android — Google Play Integrity API :
 *   1. Activer Play Integrity dans Google Play Console → Setup → App Integrity.
 *   2. Installer le package natif : npx expo install @anubra266/react-native-play-integrity
 *      (ou expo-modules + native code si tu veux éviter une dépendance tierce).
 *   3. Remplacer requestIntegrityToken() ci-dessous par l'appel natif réel.
 *   4. Envoyer le token à ton backend — le backend appelle l'API Google pour le
 *      vérifier (jamais le client). Voir : https://developer.android.com/google/play/integrity
 *
 * iOS — App Attest / DeviceCheck :
 *   1. Activer App Attest dans Apple Developer → Certificates → Identifiers → ton app.
 *   2. Installer : npx expo install @anubra266/react-native-apple-attest ou DCDevice via natif.
 *   3. Remplacer requestIntegrityToken() iOS par l'appel DCAppAttestService réel.
 *   4. Le backend vérifie via l'API Apple App Attest. Voir :
 *      https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity
 *
 * IMPORTANT : le client ne décide JAMAIS qu'il est fiable.
 * Le token est opaque — seul le backend peut le valider.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform } from "react-native";
import { securityWarn, securityInfo, securityBlocked } from "@/lib/securityLogger";

export type IntegrityResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

/**
 * Feature flags — contrôlent le comportement selon l'environnement.
 *
 * INTEGRITY_REQUIRED : si true, les actions sensibles sont bloquées si l'intégrité
 *   échoue. Mettre à true uniquement en production avec un vrai backend.
 *
 * INTEGRITY_AVAILABLE : si false, on est dans Expo Go ou un environnement sans
 *   module natif — on bypass silencieusement.
 */
const INTEGRITY_REQUIRED = !__DEV__;
const INTEGRITY_AVAILABLE = !__DEV__ && Platform.OS !== "web";

/**
 * Demande un token d'intégrité à la plateforme.
 * En dev / Expo Go : retourne un token simulé avec avertissement explicite.
 * En prod natif : DOIT être remplacé par l'appel SDK réel (voir instructions ci-dessus).
 */
export async function requestIntegrityToken(): Promise<IntegrityResult> {
  if (!INTEGRITY_AVAILABLE) {
    securityInfo(
      "AppIntegrity",
      "Bypass dev : intégrité simulée (Expo Go ou web)",
    );
    return { ok: true, token: "dev-bypass-token" };
  }

  try {
    // ── À REMPLACER PAR LE VRAI SDK ──────────────────────────────────────────
    // Android : const { requestIntegrity } = require("@anubra266/react-native-play-integrity");
    //           const token = await requestIntegrity(nonce);
    // iOS     : const { getAppAttestToken } = require("@anubra266/react-native-apple-attest");
    //           const token = await getAppAttestToken();
    // ─────────────────────────────────────────────────────────────────────────
    securityWarn("AppIntegrity", "Module natif non branché — token vide retourné");
    return { ok: false, reason: "native-module-not-wired" };
  } catch (e) {
    securityBlocked("AppIntegrity", "Erreur lors de la demande de token", {
      error: String(e),
    });
    return { ok: false, reason: "token-request-failed" };
  }
}

/**
 * Vérifie l'intégrité avant une action sensible.
 *
 * En dev : autorise toujours (bypass explicite).
 * En prod sans vrai SDK : refuse si INTEGRITY_REQUIRED = true.
 * En prod avec vrai SDK : envoie le token au backend pour validation.
 *
 * @returns true si l'action peut continuer, false si elle doit être bloquée.
 *
 * ── QUAND BRANCHER LE BACKEND ────────────────────────────────────────────────
 * Remplace le bloc TODO par :
 *   const response = await fetch(apiUrl("/api/integrity/verify"), {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ token: result.token, action }),
 *   });
 *   return response.ok;
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function verifyIntegrityForAction(action: string): Promise<boolean> {
  if (!INTEGRITY_REQUIRED) {
    securityInfo("AppIntegrity", `Bypass dev pour action : ${action}`);
    return true;
  }

  const result = await requestIntegrityToken();
  if (!result.ok) {
    securityBlocked("AppIntegrity", `Action refusée — intégrité non prouvée`, {
      action,
      reason: result.reason,
    });
    return false;
  }

  // TODO: envoyer result.token au backend pour validation réelle.
  // Sans validation backend, un attaquant peut forger "dev-bypass-token".
  // Cette fonction retourne true provisoirement — NE PAS déployer en prod sans backend.
  securityWarn(
    "AppIntegrity",
    "Token non validé côté backend — protection incomplète",
    { action },
  );
  return true;
}
