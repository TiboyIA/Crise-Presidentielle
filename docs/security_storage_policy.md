# Politique de stockage local sécurisé — Président : Nation en Crise

## Règles générales

- **Jamais** de clé secrète côté client (`service_role`, clé OpenAI, secret RevenueCat, etc.)
- **Jamais** de données personnelles superflues (PII)
- Les achats et droits sont toujours validés côté serveur (RevenueCat / Edge Function)
- Le score classé est toujours validé côté serveur — jamais de décision finale côté client
- Le mode offline doit rester fonctionnel (tolérance aux erreurs réseau)

---

## SecureStore (`expo-secure-store`)

Stockage chiffré par l'OS (Keychain iOS / Keystore Android). Limite ~2 KB par valeur.

| Clé / usage | Contenu | Pourquoi SecureStore |
|---|---|---|
| Session Supabase (gérée par `authStorage`) | JWT access token + refresh token (si ≤ 2 KB) | Credentials d'authentification |
| Débordement vers AsyncStorage (voir ci-dessous) | Session > 2 KB | Limite physique SecureStore |

### Règle `authStorage` (hybride)

`AuthContext.tsx` utilise un storage hybride :
- Valeur ≤ 2048 chars → `SecureStore`
- Valeur > 2048 chars → `AsyncStorage` avec flag `__sb_as_<clé> = "1"` pour le routage

Le JWT **access token actif** n'est jamais persisté séparément — il vit uniquement en mémoire (`SyncService._accessToken`). Seule la session complète (gérée par le SDK Supabase) est persistée.

---

## AsyncStorage (`@react-native-async-storage/async-storage`)

Stockage non chiffré — acceptable pour les données de jeu non sensibles. Ne jamais y stocker de credentials ni de tokens.

| Clé AsyncStorage | Fichier | Contenu | Sensibilité |
|---|---|---|---|
| `@strategy_v1` | `storage/strategyStorage.ts` | État de jeu complet (mandate, ressources, etc.) | Faible — données de jeu |
| `etat_de_crise_save_v4` | `storage/gameStorage.ts` | Sauvegarde principale (ancienne) | Faible |
| `save_slot_<1-6>` | `storage/saveSlots.ts` | Slots de sauvegarde | Faible |
| `@bonus_save_slots_v1` | `storage/saveSlotBonus.ts` | **Cache UI** — droits slots bonus | Faible — cache seulement |
| `@ui_theme_v1` | `storage/themes.ts` | Thème couleur sélectionné | Aucune |
| `@president_cosmetics_v1` | `storage/portraits.ts` | Portrait / cosmétique sélectionné | Aucune |
| `@balance_stats_v1` | `storage/balanceStorage.ts` | Stats analytiques locales | Faible |
| `etat_de_crise_stats_v1` | `storage/statsStorage.ts` | Stats cross-parties | Faible |
| `sync_pending_upload_v1` | `services/SyncService.ts` | Données de jeu en attente de sync | Faible — données de jeu |
| `sync_device_id_v1` | `services/SyncService.ts` | UUID device (généré localement) | Faible — non lié à l'identité |
| `ranked_journal_v1` | `services/RankedService.ts` | Journal d'événements classés | Faible — pas de PII |
| `ranked_run_meta_v1` | `services/RankedService.ts` | runId + seed + startedAt | Faible |
| `ranked_pending_submit_v1` | `services/RankedService.ts` | Payload de soumission en attente | Faible — **sans JWT** |
| `__sb_as_<clé>` | `context/AuthContext.tsx` | Flag de routage session > 2 KB | Faible — flag booléen |
| `<clé session Supabase>` | `context/AuthContext.tsx` | Session Supabase si > 2 KB | Moyen — voir note ci-dessous |

### Note sur la session Supabase en AsyncStorage

Quand la session Supabase dépasse 2 KB, elle déborde en AsyncStorage (non chiffré). C'est une contrainte technique de SecureStore. Le refresh token contenu dans la session permet de regénérer un access token — c'est le seul risque. Atténuation : le SDK Supabase gère la rotation des refresh tokens ; une session volée est invalidée à la prochaine rotation.

---

## Ce qui n'est jamais stocké

- `SUPABASE_SERVICE_ROLE_KEY` — uniquement dans les Edge Functions via `Deno.env`
- Clés API privées (RevenueCat secret, OpenAI, etc.)
- Access token JWT séparé de la session (vit en mémoire uniquement)
- Résultats de score classé définitifs (toujours validés serveur)
- Données personnelles (email, nom, localisation)

---

## Politique droits / achats

`@bonus_save_slots_v1`, `@ui_theme_v1`, `@president_cosmetics_v1` sont des **caches UI** uniquement.  
La source de vérité est RevenueCat (via webhook Supabase + Edge Function `player-entitlements`).  
Ces valeurs locales accélèrent l'affichage au démarrage — elles ne déverrouillent rien côté serveur.

---

## Soumission classée hors-ligne (`ranked_pending_submit_v1`)

Quand la soumission échoue pour cause de réseau, le payload est sauvegardé sans le JWT (le JWT a une durée de vie courte et serait périmé au retry). Au prochain lancement, `AuthContext` appelle `retryPendingSubmission(token)` avec un token frais obtenu par refresh de session.

Structure stockée :
```typescript
{
  runId: string;
  events: RunEvent[];         // journal complet
  finalIndicators: FinalIndicators;
  mandateDays: number;
  journalHash: string;        // djb2 — détection de corruption seulement
  deviceId?: string;
  appVersion?: string;
  // accessToken: ABSENT — jamais persisté
}
```
