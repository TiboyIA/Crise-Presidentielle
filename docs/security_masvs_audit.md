# Audit OWASP MASVS Light — Président : Nation en Crise

Référentiel : OWASP Mobile Application Security Verification Standard (MASVS) v2  
Date : 2026-05-18  
Scope : code client (React Native / Expo SDK 54) + Edge Functions Supabase  
Méthode : revue statique du code, pas de test d'intrusion dynamique

---

## Résumé exécutif

Aucun risque **CRITIQUE** identifié. L'architecture respecte les principes fondamentaux :
compte anonyme par défaut, JWT exclusivement en mémoire/SecureStore, validation JWT côté serveur sur chaque Edge Function, `user.id` toujours source de vérité pour `player_id`, timestamps assignés côté serveur, pas de secret dans le bundle.

Un risque **ÉLEVÉ** de conformité store (suppression de compte in-app, obligation Apple depuis juin 2022).  
Deux risques **MOYENS** corrigeables par de petits ajouts défensifs.

---

## Tableau des risques

| # | Catégorie MASVS | Risque | Sévérité | Probabilité | Impact | Statut |
|---|----------------|--------|----------|-------------|--------|--------|
| 1 | PRIVACY | Absence de mécanisme de suppression de compte in-app | **ÉLEVÉ** | Certaine (obligation Apple) | Rejet App Store | À corriger |
| 2 | NETWORK | Pas de garde HTTPS sur `EXPO_PUBLIC_SUPABASE_URL` dans les services | MOYEN | Faible (misconfiguration env) | Traffic HTTP si misconfigured | À corriger |
| 3 | RESILIENCE | `AppIntegrityService` retourne `true` en prod sans attestation réelle | MOYEN | Faible (non branché actuellement) | Bypass futur si wired incorrectement | Surveillé |
| 4 | PRIVACY | Pas de politique de rétention documentée pour les messages de chat | MOYEN | Certaine (RGPD) | Non-conformité RGPD | À documenter |
| 5 | PLATFORM | Scheme `etat-de-crise://` interceptable sur Android (scheme hijacking) | FAIBLE | Très faible (PKCE + detectSessionInUrl:false) | Théorique | Atténué |
| 6 | NETWORK | Pas de certificate pinning | FAIBLE | Très faible | Théorique | Acceptable |
| 7 | STORAGE | `device_id` (UUID) en AsyncStorage non chiffré | FAIBLE | Faible | Faible (UUID non-PII) | Acceptable |
| 8 | CODE | `GameSecurityService` rate limiting client-only | FAIBLE | — | Contournement UX (serveur est authoritatif) | Acceptable |

---

## Détail par catégorie MASVS

### MASVS-STORAGE

| Contrôle | Statut | Détail |
|-----------|--------|--------|
| Pas de secrets critiques en AsyncStorage | ✅ | `SUPABASE_SERVICE_ROLE_KEY` uniquement dans les Edge Functions (Deno.env). Jamais dans le client. |
| JWT non persisté en clair | ✅ | Adaptateur hybride SecureStore/AsyncStorage : valeurs < 2 KB → SecureStore (chiffré). Supabase session → SecureStore. |
| `PendingSubmit` sans JWT | ✅ | `accessToken` explicitement absent de `ranked_pending_submit_v1`. Le token frais est passé par `AuthContext` au retry. |
| Cache entitlements chiffré | ✅ | `entitlements_verified_cache_v1` → SecureStore. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans le bundle | ✅ | Clé anon = publique par design (Supabase). RLS protège l'accès. Pas de service_role dans le client. |
| `device_id` en AsyncStorage | ⚠️ FAIBLE | UUID serveur opaque, non-PII, faible sensibilité. Risque acceptable. |

---

### MASVS-AUTH

| Contrôle | Statut | Détail |
|-----------|--------|--------|
| `detectSessionInUrl: false` | ✅ | Le SDK Supabase ne parse jamais les tokens depuis les URLs. |
| `autoRefreshToken: true` | ✅ | Renouvellement automatique des tokens. |
| OAuth via browser système | ✅ | `WebBrowser.openAuthSessionAsync` → SFSafariViewController (iOS) / Chrome Custom Tab (Android). Aucune WebView custom. |
| Validation URL OAuth avant ouverture | ✅ | `url.startsWith(SUPABASE_URL)` vérifié avant `openAuthSessionAsync`. |
| Erreurs SDK non exposées à l'UI | ✅ | Mapping interne dans `AuthContext.linkWithProvider` et `account-link.tsx`. |
| JWT validé côté serveur | ✅ | Chaque Edge Function appelle `anonClient.auth.getUser()` et rejette si non authentifié. |
| Compte anonyme par défaut | ✅ | `signInAnonymously()` — aucun email/password requis. |
| Tokens non loggés | ✅ | `securityLogger` est no-op en production. Aucun `console.log` avec token trouvé. |

---

### MASVS-NETWORK

| Contrôle | Statut | Détail |
|-----------|--------|--------|
| Aucun `http://` hardcodé | ✅ | Grep complet : aucune occurrence. |
| `lib/api.ts` enforce HTTPS | ✅ | Guard `!url.startsWith("https://")` → erreur + retourne `""` en production. |
| Services Supabase sans guard HTTPS | ⚠️ MOYEN | `AllianceService`, `SpyService`, `CyberService`, `ChatService`, `RankedService`, `SyncService` construisent l'URL directement depuis `EXPO_PUBLIC_SUPABASE_URL` sans vérification. Supabase ne sert que HTTPS en pratique, mais une misconfiguration d'env silencieuse permettrait du HTTP. |
| Certificate pinning | ⚠️ FAIBLE | Non implémenté. Acceptable : le pinning fragilise les mises à jour et est rarement exigé pour des jeux. |
| Cleartext traffic Android | ✅ | `android:usesCleartextTraffic` non présent dans le manifest (défaut = `false` depuis Android 9). |

---

### MASVS-PLATFORM

| Contrôle | Statut | Détail |
|-----------|--------|--------|
| Pas de `Linking.addEventListener` | ✅ | Aucun handler de deep link manuel dans la codebase. |
| Pas de WebView custom pour OAuth | ✅ | Browser système uniquement. |
| Pas de token dans les paramètres URL | ✅ | Callback OAuth traité par le SDK via `onAuthStateChange`, jamais parsé manuellement. |
| Permissions Android minimales | ✅ | INTERNET, VIBRATE, POST_NOTIFICATIONS (runtime). Aucune permission sensible. |
| Scheme `etat-de-crise://` | ⚠️ FAIBLE | Android : un scheme custom peut être enregistré par une autre app sur un appareil sans l'app installée (scheme hijacking). Atténuation : PKCE gère l'état côté SDK + `detectSessionInUrl: false` → intercepter le callback URL ne crée pas de session. Risque résiduel très faible. |
| Écrans sensibles par deep link | ✅ | Aucun écran ne prend de paramètre URL déclenchant une action automatique (achat, envoi, etc.). |

---

### MASVS-CODE

| Contrôle | Statut | Détail |
|-----------|--------|--------|
| Logs sensibles en production | ✅ | `securityLogger` : `if (!__DEV__) return` — no-op complet. `console.log` avec token/session : aucun trouvé. |
| Secrets hardcodés | ✅ | Aucun. Uniquement `EXPO_PUBLIC_*` (clés publiques par design). |
| `AppIntegrityService` non branché | ⚠️ MOYEN | `verifyIntegrityForAction()` retourne `true` en prod sans appel SDK réel. Actuellement aucun code ne l'appelle (grep confirme — fonction orpheline). Risque : si wired ultérieurement sans backend réel, le ranked submit serait protégé par du faux. La fonction porte un commentaire d'avertissement explicite. |
| `GameSecurityService` client-only | ⚠️ FAIBLE | Rate limiting et déduplication côté client = couche UX, pas sécurité. Les limites réelles sont côté serveur (Edge Functions). Comportement documenté dans le code. |

---

### MASVS-RESILIENCE

| Contrôle | Statut | Détail |
|-----------|--------|--------|
| `user.id` = `player_id` (jamais du body) | ✅ | Toutes les Edge Functions utilisent `user.id` de `auth.getUser()`. |
| Timestamps serveur | ✅ | `saved_at`, `created_at`, `resolves_at` tous assignés côté serveur. |
| Anti-triche ranked | ✅ | 11 contrôles, score de confiance, revue manuelle sur suspect. Pas de ban auto. |
| Rate limits serveur | ✅ | Alliances (10/j, max 3, cooldown 48h), spy (2/24h), cyber (1/24h), save (1/5min), ranked (1/23h). |
| Entitlements : serveur authoritatif | ✅ | Correction précédente : `Platform.OS !== "web"` → server wins sur natif quand online. |
| `AppIntegrityService` non opérationnel | ⚠️ MOYEN | Voir section CODE. Pas de surface d'attaque active car non branché. |

---

### MASVS-PRIVACY

| Contrôle | Statut | Détail |
|-----------|--------|--------|
| Compte anonyme par défaut | ✅ | Aucun email requis. |
| Pas de SDK analytics tiers | ✅ | `TelemetryService.flushTelemetry()` est un stub — aucun envoi. |
| Collecte minimale | ✅ | Pas de localisation, contacts, caméra, micro, IDFA/GAID. |
| Suppression de compte in-app | ❌ **ÉLEVÉ** | Apple exige un mécanisme de suppression de compte accessible dans l'app depuis juin 2022 (obligatoire si l'app permet la création de compte — ce qui inclut la liaison Google/Apple). Sans cela, soumission rejetée par App Review. |
| Rétention chat | ⚠️ MOYEN | Messages de chat stockés sans politique de rétention documentée. RGPD article 5(1)(e) exige une limitation de conservation. À documenter (ex. suppression après X saisons) et implémenter côté serveur. |
| `display_name` public | ✅ | Choisi librement par le joueur, visible en classement. Consentement implicite au moment de la saisie. |

---

## Prompts de correction — risques ÉLEVÉS et MOYENS

### ÉLEVÉ — Suppression de compte in-app (Apple Store)

**Contexte :** Apple exige un mécanisme de suppression de compte in-app pour toute app qui permet de créer ou lier un compte. Sans cela, la soumission est rejetée.

**Ce que ça doit faire :**
1. Bouton "Supprimer mon compte" dans les paramètres (ou l'écran `account-link.tsx`)
2. Confirmation via `Alert`
3. Appel d'une Edge Function `delete-account` qui :
   - Valide le JWT (`auth.getUser()`)
   - Supprime les données joueur (saves, ranked_runs, alliances, spy_ops, cyber_ops, chat_messages, devices, push_token)
   - Supprime le compte Supabase Auth (`admin.deleteUser(user.id)` via service_role)
4. Côté client : déconnexion + navigation vers l'écran d'accueil

**Prompt pour l'implémentation :**

```
Ajoute un mécanisme de suppression de compte in-app conforme Apple App Store.

Crée :
1. `supabase/functions/delete-account/index.ts` — Edge Function :
   - Valide JWT via auth.getUser()
   - Supprime en cascade : saves, ranked_runs, leaderboard_entries, alliances,
     spy_ops, cyber_ops, chat_messages, devices, player_entitlements
     (la table players elle-même via CASCADE si FK configurées, sinon manuellement)
   - Supprime le compte Auth : adminClient.auth.admin.deleteUser(user.id)
   - Répond { ok: true }

2. Un bouton "Supprimer mon compte" dans app/account-link.tsx (sous le status "Compte sécurisé"
   ou dans une section paramètres) :
   - Alert de confirmation en 2 étapes ("Êtes-vous sûr ?" puis "Supprimer définitivement")
   - Appelle DELETE /functions/v1/delete-account avec le JWT courant
   - Si ok : clearAll() AsyncStorage + navigation vers "/"
   - Messages : "Suppression en cours...", "Compte supprimé.", erreurs mappées

Règles :
- Pas de ban, juste suppression propre
- Ne casse pas le mode offline (la suppression ne peut se faire qu'en ligne)
- Respecter le pattern authHeaders(accessToken) existant
```

---

### MOYEN — Garde HTTPS sur `EXPO_PUBLIC_SUPABASE_URL`

**Contexte :** `lib/api.ts` a déjà un guard HTTPS pour `EXPO_PUBLIC_API_URL`. Les 6 services Supabase construisent leur URL directement sans ce guard. Une misconfiguration silencieuse (`http://`) enverrait les tokens en clair.

**Correction minimale :** extraire la construction d'URL Supabase dans un helper partagé qui valide le schéma.

**Prompt :**

```
Dans services/SyncService.ts (ou un nouveau fichier lib/supabaseUrl.ts),
ajoute un helper partagé :

  function supabaseUrl(path: string): string {
    const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
    if (!__DEV__ && !base.startsWith("https://")) {
      console.error("[supabase] Non-HTTPS Supabase URL rejected in production:", base);
      return "";
    }
    return `${base}/functions/v1${path}`;
  }

Remplace les implémentations locales identiques dans :
- services/AllianceService.ts
- services/SpyService.ts
- services/CyberService.ts
- services/ChatService.ts
- services/RankedService.ts
- services/SyncService.ts

(Chaque fichier a actuellement son propre BASE_URL ou supabaseUrl() sans guard.)
```

---

### MOYEN — Rétention des messages de chat

**Contexte :** RGPD article 5(1)(e) et exigences Play Store imposent une politique de rétention. Les messages sont actuellement conservés indéfiniment.

**Correction minimale :** côté serveur, ajouter une tâche de nettoyage automatique (Supabase cron ou pg_cron) qui supprime les messages de saisons antérieures.

**Prompt :**

```
Dans la base Supabase, ajoute une politique de rétention automatique pour chat_messages :

Via pg_cron (ou Supabase Scheduled Functions quand disponible) :
  DELETE FROM chat_messages WHERE season < (current_season() - 2);

Règle : conserver les 2 saisons actuelle + précédente, supprimer le reste.
Une saison = 1 mois (format YYYYMM).

Documente cette règle dans docs/privacy_data_inventory.md (section chat).
Pas de modification du code client nécessaire.
```

---

### MOYEN — AppIntegrityService (prévention d'un risque futur)

**Contexte :** `verifyIntegrityForAction()` retourne `true` en production sans attestation réelle. Actuellement non appelée (code orphelin). Risque : si une future feature l'appelle en croyant qu'elle protège réellement.

**Correction recommandée :** pas de changement de comportement — ajouter un log de warning plus visible en production pour que le système de monitoring signale l'usage non sécurisé.

**Ce n'est pas un bug actif.** Avant de brancher Play Integrity / App Attest, voir les instructions complètes déjà dans `services/AppIntegrityService.ts`.

---

## Ce qui n'est PAS un problème (classification définitive)

| Sujet | Raison |
|-------|--------|
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans le bundle | Clé anon = publique par design. L'accès est contrôlé par RLS côté Supabase. |
| Pas de certificate pinning | Tradeoff délibéré : pinning fragile lors des mises à jour, rare pour les jeux. |
| `device_id` en AsyncStorage | UUID opaque généré côté serveur. Non-PII. |
| Scheme `etat-de-crise://` | Mitigé par PKCE + `detectSessionInUrl: false`. Risque théorique uniquement. |
| `GameSecurityService` client-only | UX layer assumé. Les vrais contrôles sont server-side (Edge Functions). |
| `TelemetryService.flushTelemetry()` stub | Buffer local uniquement. Aucun envoi. |
| Compte anonyme sans mot de passe | Comportement voulu. La sécurité du compte repose sur la liaison Google/Apple (optionnelle). |
