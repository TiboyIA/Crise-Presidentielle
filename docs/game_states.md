# États du jeu — Président : Nation en Crise

> Documentation pure. Aucune modification de code.
> Sources : `AuthContext.tsx`, `SyncService.ts`, `RankedService.ts`, `OfflineQueue.ts`,
> `strategyStorage.ts`, `saveMigrations.ts`, `AllianceService.ts`, `SpyService.ts`,
> `CyberService.ts`, `newsEngine.ts`, `recovery.tsx`.

---

## Conventions

| Symbole | Signification |
|---|---|
| `AsyncStorage` | Stockage local non chiffré (clé → valeur JSON) |
| `SecureStore` | Stockage chiffré système (iOS Keychain / Android Keystore) |
| `[MEM]` | Variable en mémoire vive uniquement (perdu à la fermeture de l'app) |
| `→` | Transition possible vers un autre état |
| `⚠` | Point de vigilance — source de bugs courants |

Chaque état est **indépendant des autres** sauf mention explicite de combinaison. Le jeu peut être dans plusieurs états simultanément (ex. `local_save_loaded` + `ranked_run_active` + `alliance_active`).

---

## 1. `no_save`

**Signification :** Aucune sauvegarde de partie stratégique n'existe localement. L'app est fraîchement installée, la sauvegarde a été supprimée, ou `migrateSave()` a renvoyé `null` (données non reconnaissables).

**Fichiers concernés :**
- [storage/strategyStorage.ts](storage/strategyStorage.ts) — `loadStrategy()` retourne `null`
- [storage/saveMigrations.ts](storage/saveMigrations.ts) — `migrateSave()` retourne `null`
- [app/index.tsx](app/index.tsx) — `hasSave = state !== null` → `false`

**Détection :**
```typescript
// strategyStorage.ts
const raw = await AsyncStorage.getItem("@strategy_v1");
if (!raw) return null; // → no_save
```

**Transitions possibles :**
- → `local_save_loaded` : Le joueur complète la création de partie (`startNewGame()` + premier `saveStrategy()`)
- → `cloud_save_available` : La sync cloud au lancement détecte une sauvegarde cloud plus récente

**UI attendue :**
- `index.tsx` : bouton "ENTRER EN FONCTION" (rouge) — pas de bouton "CONTINUER"
- Tutoriel accessible via bouton secondaire

**Erreurs possibles :**
- `⚠` Si `migrateSave()` retourne `null` sur une donnée non-null, l'app affiche `saveStatus === "recovered"` et redirige vers `/recovery` — ce cas ressemble à un `no_save` mais garde les données partielles en mémoire (`StrategyContext.state` initialisé avec fallbacks).
- `⚠` Si `AsyncStorage` est corrompu et retourne une chaîne vide `""`, `JSON.parse("")` lève une exception silencieusement absorbée, aboutissant à `no_save`.

---

## 2. `local_save_loaded`

**Signification :** Une sauvegarde valide (version 1, 2 ou 3) a été chargée depuis `AsyncStorage`. C'est l'état normal de jeu entre deux sessions.

**Fichiers concernés :**
- [storage/strategyStorage.ts](storage/strategyStorage.ts) — `loadStrategy()` retourne un `LoadResult`
- [storage/saveMigrations.ts](storage/saveMigrations.ts) — `isSaveCurrent()` ou migration réussie
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — `state !== null`
- [app/index.tsx](app/index.tsx) — `hasSave = true`

**Détection :**
```typescript
const result = await loadStrategy();
// result !== null && result.state est un StrategyGameState valide
// result.wasMigrated : true si version < 3
// result.usedFallback : true si données partielles récupérées
```

**Sous-états :**

| Sous-état | Condition | Conséquence |
|---|---|---|
| `save_current` | `isSaveCurrent(parsed) && isValidStrategyGameState(parsed)` | Chemin rapide, pas de migration |
| `save_migrated` | Version < `CURRENT_SAVE_VERSION` (3) | Migration appliquée, sauvegarde réécrite |
| `save_recovered` | `result.usedFallback === true` | Données partielles — redirection vers `/recovery` |

**Transitions possibles :**
- → `no_save` : `deleteStrategy()` appelé (nouvelle partie depuis `/recovery`)
- → `cloud_save_available` : Cloud plus récent détecté à la prochaine sync
- → `ranked_run_active` : Joueur active le mode classé

**UI attendue :**
- `index.tsx` : bouton "CONTINUER LA PARTIE" + "NOUVELLE PARTIE"
- `nation.tsx` : tableau de bord avec `state.playerName`, ressources, indicateurs

**Erreurs possibles :**
- `⚠` Si la migration retourne `usedFallback: true` et que le joueur appuie sur "Continuer la session récupérée" dans `/recovery`, certains champs ont des valeurs par défaut (ex. `money=2000`, `cyberDefense=40`). Le joueur peut percevoir une perte de progression.
- `⚠` `saveStrategy()` est fire-and-forget pour `scheduleUpload()` — si AsyncStorage échoue à l'écriture, la sauvegarde locale peut être silencieusement absente au prochain lancement.

---

## 3. `cloud_save_available`

**Signification :** `syncOnLaunch()` a téléchargé une sauvegarde cloud dont le timestamp `savedAt` est supérieur d'au moins 5 secondes au timestamp local. La sauvegarde cloud est restaurée localement.

**Fichiers concernés :**
- [services/SyncService.ts](services/SyncService.ts) — `syncOnLaunch()` → `conflictResolution = "cloud_newer"`
- [context/AuthContext.tsx](context/AuthContext.tsx) — `onAuthenticated()` appelle `syncOnLaunch()`
- [storage/saveMigrations.ts](storage/saveMigrations.ts) — `migrateSave()` appliqué à la save cloud

**Détection :**
```typescript
const { cloudSaveToRestore, conflictResolution } = await syncOnLaunch(token, localSavedAt);
// conflictResolution === "cloud_newer" → cloudSaveToRestore !== null
```

**Résolutions possibles de sync :**

| Résolution | Condition | Action |
|---|---|---|
| `cloud_newer` | `cloudTs - localTs > 5000ms` | Restauration cloud + migration si nécessaire |
| `local_newer` | `localTs - cloudTs > 5000ms` | Sauvegarde locale conservée |
| `conflict_detected` | `|diff| <= 5000ms` | Sauvegarde locale conservée (plus sûr) |
| `no_cloud_save` | Aucune sauvegarde cloud | Sauvegarde locale conservée |

**Transitions possibles :**
- → `local_save_loaded` : Après restauration, la sauvegarde cloud devient la sauvegarde locale
- → `no_save` si la sauvegarde cloud est non reconnue par `migrateSave()`

**UI attendue :**
- Transparent pour le joueur — la restauration se fait pendant le `LoadingScreen`
- Si `usedFallback` après migration cloud → `/recovery`

**Erreurs possibles :**
- `⚠` Si le réseau est disponible pendant le chargement mais s'interrompt pendant `downloadSave()`, `syncOnLaunch()` retourne `no_cloud_save` — le joueur continue avec la sauvegarde locale sans message.
- `⚠` `conflict_detected` (delta < 5s) conserve toujours le local. Sur deux appareils modifiant la sauvegarde au même instant, le cloud peut rester en retard indéfiniment.
- `⚠` `hashSave()` (djb2) détecte la corruption accidentelle mais n'est pas une preuve cryptographique — un payload modifié manuellement avec le bon hash passerait la validation.

---

## 4. `ranked_run_active`

**Signification :** Le joueur a démarré une partie en mode classé. `startRankedRun()` a réussi, `RUN_META_KEY` est dans AsyncStorage et `_rankedIntended = true` en mémoire.

**Fichiers concernés :**
- [services/RankedService.ts](services/RankedService.ts) — `RUN_META_KEY`, `JOURNAL_KEY`, `recordEvent()`
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — appelle `recordEvent()` à chaque action clé
- [app/index.tsx](app/index.tsx) — `startRankedRun()` appelé après `startNewGame()`

**Structure AsyncStorage :**
```typescript
// RUN_META_KEY = "ranked_run_meta_v1"
{ runId: string, seed: string, startedAt: number }

// JOURNAL_KEY = "ranked_journal_v1"
RunEvent[]  // 15 types d'événements enregistrés
```

**Invariant critique :** `_rankedIntended` est une variable [MEM] — elle est `false` au redémarrage de l'app même si `RUN_META_KEY` existe dans AsyncStorage. Le journal continue d'enregistrer via `recordEvent()` (qui lit `loadMeta()` depuis AsyncStorage) mais `isRankedIntended()` retourne `false`. L'UI ne montrera pas le mode classé actif après un crash.

**Transitions possibles :**
- → `ranked_submit_pending` : Fin de partie, soumission échoue (réseau)
- → `no_save` + run nettoyée : Abandon via `abandonRun()` ou rejet HTTP 409/422
- → `ranked_submit_success` : Soumission réussie

**UI attendue :**
- `ranking.tsx` : badge "MODE CLASSÉ" visible si `isRankedIntended() === true`
- `index.tsx` : pas d'indicateur visuel de run active (état silencieux)

**Erreurs possibles :**
- `⚠` Si `startRankedRun()` échoue réseau mais que `_rankedIntended = true` a déjà été posé et `startNewGame()` a été appelé, la partie se joue en mode non classé mais `isRankedIntended()` retourne `true`. La soumission finale échouera avec `reason: "no-active-run"` (pas de `RUN_META_KEY`).
- `⚠` Le journal grossit à chaque `appendEvent()` (lecture + réécriture complète d'AsyncStorage). Une run longue avec beaucoup d'événements peut atteindre les limites de taille d'AsyncStorage sur certains appareils.

---

## 5. `ranked_submit_pending`

**Signification :** `submitRankedRun()` a été appelé en fin de partie mais le réseau était indisponible. Le journal complet est stocké dans `PENDING_SUBMIT_KEY` et sera soumis au prochain lancement avec un token frais.

**Fichiers concernés :**
- [services/RankedService.ts](services/RankedService.ts) — `PENDING_SUBMIT_KEY`, `hasPendingSubmission()`, `retryPendingSubmission()`
- [context/AuthContext.tsx](context/AuthContext.tsx) — `retryPendingSubmission(token)` appelé dans `onAuthenticated()`
- [app/ranking.tsx](app/ranking.tsx) — `hasPendingSubmission()` → badge "SOUMISSION EN ATTENTE"

**Structure AsyncStorage :**
```typescript
// PENDING_SUBMIT_KEY = "ranked_pending_submit_v1"
{
  runId: string,
  events: RunEvent[],
  finalIndicators: FinalIndicators,
  mandateDays: number,
  journalHash: string,
  deviceId?: string,
  appVersion?: string,
  // accessToken intentionnellement ABSENT — JWT jamais persisté
}
```

**Transitions possibles :**
- → `ranked_submit_success` : `retryPendingSubmission()` réussit au prochain lancement
- → état "run rejetée" : Serveur répond 422 ou 409 → `PENDING_SUBMIT_KEY` supprimé, run nettoyée, `_rankedIntended = false`
- État persistant si le joueur ne se reconnecte jamais en ligne

**UI attendue :**
- `ranking.tsx` : encart jaune "SOUMISSION EN ATTENTE — Score classé enregistré — sera soumis à la prochaine connexion"
- Pas de blocage de jeu — le joueur peut continuer à jouer

**Erreurs possibles :**
- `⚠` Si le joueur désinstalle l'app avant de se reconnecter, le journal est perdu sans soumission. La partie ne sera jamais dans le classement.
- `⚠` Si `retryPendingSubmission()` est appelé avec un token expiré (session Supabase non rafraîchie), le serveur retourne 401 — le journal reste en attente mais le retry est traité comme une erreur réseau (pas de nettoyage).

---

## 6. `ranked_submit_success`

**Signification :** `submitRankedRun()` ou `retryPendingSubmission()` a reçu `{ ok: true, score }` du serveur. Le journal local, les métadonnées du run et le pending submit sont nettoyés. Le score est inscrit dans le leaderboard Supabase.

**Fichiers concernés :**
- [services/RankedService.ts](services/RankedService.ts) — `clearRun()`, `_rankedIntended = false`
- [app/ranking-global.tsx](app/ranking-global.tsx) — score visible dans le leaderboard

**Actions après succès :**
```typescript
await AsyncStorage.multiRemove([JOURNAL_KEY, RUN_META_KEY]);
await AsyncStorage.removeItem(PENDING_SUBMIT_KEY);
_rankedIntended = false;
// → SubmitResult { ok: true, score: number }
```

**Transitions possibles :**
- → `ranked_run_active` : Le joueur démarre une nouvelle partie classée (1 run validée / 23h max)
- → `no_save` si le joueur choisit "Nouvelle Partie" sur l'écran d'accueil

**UI attendue :**
- Aucun encart pending dans `ranking.tsx`
- Le score apparaît dans `ranking-global.tsx` après un rechargement

**Erreurs possibles :**
- `⚠` `data.score` peut être absent si le serveur répond `{ ok: true }` sans `score` — l'UI doit gérer `score === undefined`.
- `⚠` Rate-limit serveur : max 1 run validée par compte / 23h. Une 2ème soumission dans la fenêtre retourne 429 (non traité explicitement par `submitRankedRun()`, sera absorbé comme `"server-error"`).

---

## 7. `auth_disabled`

**Signification :** Les variables d'environnement `EXPO_PUBLIC_SUPABASE_URL` et/ou `EXPO_PUBLIC_SUPABASE_ANON_KEY` sont absentes ou vides. Toutes les fonctionnalités multijoueur sont désactivées.

**Fichiers concernés :**
- [context/AuthContext.tsx](context/AuthContext.tsx) — `ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)`
- [config/features.ts](config/features.ts) — `FEATURES.*` indépendants mais complémentaires

**Conséquences :**
```typescript
// AuthContext — état initial si !ENABLED
{
  user: null,
  accessToken: null,
  isReady: true,   // ← immédiatement prêt (pas d'attente réseau)
  isEnabled: false,
  isLinked: false,
}
```

| Fonctionnalité | Avec `auth_disabled` |
|---|---|
| Mode classé | Désactivé — `rankedAvailable = auth.isEnabled && auth.isReady` → `false` |
| Cloud save | Désactivé — `scheduleUpload()` no-op si `_accessToken === null` |
| Alliances | Masquées — `auth.isEnabled` → sections conditionnelles absentes |
| Espionnage | Masqué |
| Cyberattaques | Masquées |
| Classement mondial | Accessible mais vide — `fetchLeaderboard()` retourne `[]` si `SUPABASE_URL` vide |
| Forum diplomatique | Accessible mais vide |

**Transitions possibles :**
- Permanent pour la session — seul un rebuild avec les bonnes variables change cet état
- → `anonymous_session` si les variables sont configurées au prochain lancement

**UI attendue :**
- `ranking.tsx` : sections Cyberattaques, Espionnage, Alliances, Sécurité compte masquées
- `index.tsx` : toggle Mode Classé masqué
- Jeu solo 100% fonctionnel

**Erreurs possibles :**
- `⚠` `ranking-global.tsx` affiche une liste vide sans message d'erreur explicite quand `SUPABASE_URL` est vide (`fetchLeaderboard()` retourne `[]` immédiatement).

---

## 8. `anonymous_session`

**Signification :** L'auth est activée (`ENABLED = true`), `getSession()` n'a pas trouvé de session existante, et `signInAnonymously()` a réussi. L'utilisateur a un `user.id` Supabase mais aucun provider lié (Google / Apple).

**Fichiers concernés :**
- [context/AuthContext.tsx](context/AuthContext.tsx) — `signInAnonymously()` → `isLinked = false`
- Session stockée dans `authStorage` (SecureStore si < 2 KB, sinon AsyncStorage)

**Détection :**
```typescript
auth.isEnabled === true
auth.isReady === true
auth.user !== null
auth.isLinked === false        // aucun provider non-anonymous
auth.linkedProviders === []
auth.accessToken !== null      // JWT valide [MEM]
```

**Capacités disponibles :**
| Fonctionnalité | Disponible |
|---|---|
| Mode classé | Oui — accessToken valide |
| Cloud save | Oui |
| Espionnage | Oui |
| Cyberattaques | Non — `auth.isLinked` requis |
| Alliances (envoyer) | Non — `auth.isLinked` requis |
| Classement mondial | Oui |

**Transitions possibles :**
- → `linked_account` : `linkWithGoogle()` ou `linkWithApple()` réussit
- → `anonymous_session` (même état) : token rafraîchi automatiquement par Supabase

**UI attendue :**
- `ranking.tsx` : bouton "SÉCURISER MON COMPTE" en orange (shield-alert-outline)
- `player-profile.tsx` : sections Cyber et Diplomatie avec message "Lie ton compte Google ou Apple"

**Erreurs possibles :**
- `⚠` `signInAnonymously()` peut échouer silencieusement (réseau, quota Supabase) — dans ce cas `isReady = true` mais `accessToken = null`. L'utilisateur voit l'état `auth_disabled` fonctionnellement.
- `⚠` Le token anonyme Supabase a une durée de vie d'1 heure. `autoRefreshToken: true` gère le renouvellement mais nécessite la connectivité réseau. Si le rafraîchissement échoue, `accessToken` devient invalide (401 sur tous les appels).

---

## 9. `linked_account`

**Signification :** L'utilisateur a lié son compte anonyme à un provider OAuth (Google ou Apple). `auth.isLinked = true`, `auth.linkedProviders` contient le provider actif.

**Fichiers concernés :**
- [context/AuthContext.tsx](context/AuthContext.tsx) — `linkWithProvider()`, `deriveLinked()`
- [app/account-link.tsx](app/account-link.tsx) — UI de liaison

**Détection :**
```typescript
const identities = user?.identities ?? [];
const providers = identities.map(i => i.provider).filter(p => p !== "anonymous");
// isLinked = providers.length > 0
// linkedProviders = providers   (ex. ["google"])
```

**Capacités déverrouillées :**
| Fonctionnalité | Disponible |
|---|---|
| Cyberattaques | Oui |
| Alliances (envoyer + accepter) | Oui |
| Restauration cloud depuis `/recovery` | Oui |
| Toutes les autres fonctionnalités auth | Oui |

**Transitions possibles :**
- État persistant — le lien ne peut pas être supprimé depuis l'UI du jeu
- `onAuthStateChange` rafraîchit `linkedProviders` automatiquement

**UI attendue :**
- `ranking.tsx` : bouton "COMPTE SÉCURISÉ" en vert (shield-check) + provider listé
- `player-profile.tsx` : sections Cyber et Diplomatie entièrement actives

**Erreurs possibles :**
- `⚠` `linkWithProvider()` vérifie que l'URL OAuth retournée commence par `SUPABASE_URL` (défense en profondeur contre SDK tampering). Si le projet Supabase est mal configuré, cette vérification peut bloquer des OAuth légitimes.
- `⚠` Si le joueur tente de lier un compte Google déjà lié à un autre compte Supabase, le serveur retourne une erreur mapped en `"identity-already-linked"` (pas de message détaillé exposé dans l'UI).

---

## 10. `offline_mode`

**Signification :** Le réseau est indisponible. Les actions locales fonctionnent normalement. Certaines actions multijoueur sont mises en file via `OfflineQueue`, d'autres échouent définitivement.

**Fichiers concernés :**
- [services/OfflineQueue.ts](services/OfflineQueue.ts) — `QUEUE_KEY`, `enqueue()`, `flushQueue()`
- [services/SyncService.ts](services/SyncService.ts) — `PENDING_UPLOAD_KEY`
- [services/RankedService.ts](services/RankedService.ts) — `PENDING_SUBMIT_KEY`

**Comportement par action :**

| Action | Comportement hors ligne |
|---|---|
| Gameplay local (bâtiments, ressources, opérations IA) | Fonctionne — `AsyncStorage` uniquement |
| Sauvegarde locale | Fonctionne — `saveStrategy()` → `scheduleUpload()` → `PENDING_UPLOAD_KEY` |
| Invitation alliance | Mise en file — `enqueueAllianceInvite()` → `OfflineQueue.enqueue()` |
| Espionnage | Échec définitif — `launchSpyOp()` → `{ ok: false, error: "network-unavailable" }` |
| Cyberattaque | Échec définitif — `launchCyberOp()` → `{ ok: false, error: "network-unavailable" }` |
| Soumission classée | Mise en attente — `PENDING_SUBMIT_KEY` + retry au prochain lancement |
| Sync cloud | Skip — `scheduleUpload()` → `PENDING_UPLOAD_KEY` |

**Backoff de la file :**
```
tentative 1 → attente 10s
tentative 2 → attente 20s
tentative 3 → attente 40s
tentative 4 → attente 80s
tentative 5 → attente 300s → statut "failed"
```

**Transitions possibles :**
- → Retour en ligne : `flushQueue(accessToken)` doit être appelé manuellement (non câblé automatiquement)
- Items expirés (> 7 jours) : `pruneQueue()` les supprime

**UI attendue :**
- Invitations alliance : badge "Enregistrée — envoi automatique dès que tu seras en ligne" (orange)
- Espionnage/Cyber : message "Connexion indisponible" (pas de badge offline persistant)
- Pas d'indicateur global "mode hors ligne" dans l'UI

**Erreurs possibles :**
- `⚠` `flushQueue()` n'est pas appelé automatiquement au retour de connexion — les items "queued" restent en attente jusqu'au prochain lancement de l'app.
- `⚠` `PENDING_UPLOAD_KEY` (SyncService) et `QUEUE_KEY` (OfflineQueue) sont deux systèmes de file séparés. Un item dans `PENDING_UPLOAD_KEY` ne passe pas par le backoff de `OfflineQueue`.
- `⚠` Les types `spy_launch` et `cyber_launch` sont déclarés dans `QueueActionType` mais marqués "réservés" dans `executeItem()` — ils retournent `{ ok: true }` sans réellement envoyer la requête.

---

## 11. `alliance_pending`

**Signification :** Une invitation d'alliance existe sur le serveur avec `status="pending"`. Peut être côté expéditeur (l'invitation a été envoyée) ou côté destinataire (invitation reçue à accepter ou refuser).

**Fichiers concernés :**
- [services/AllianceService.ts](services/AllianceService.ts) — `fetchAlliances()`, `respondToAlliance()`
- [app/alliances.tsx](app/alliances.tsx) — UI de gestion
- [app/ranking.tsx](app/ranking.tsx) — `pendingAllianceCount` → dot de notification
- [app/player-profile.tsx](app/player-profile.tsx) — `enqueueAllianceInvite()`

**Structure serveur :**
```typescript
interface Alliance {
  id: string;
  status: "pending" | "active" | "broken" | "rejected";
  created_at: string;
  expires_at: string | null;
  is_initiator: boolean;       // true = l'utilisateur a envoyé l'invitation
  partner_id: string;
  partner_name: string;
}
```

**Sous-états :**

| Sous-état | `is_initiator` | `status` | UI |
|---|---|---|---|
| Invitation envoyée | `true` | `pending` | Section "INVITATIONS ENVOYÉES" — label "En attente…" |
| Invitation reçue | `false` | `pending` | Section "INVITATIONS REÇUES" — boutons ACCEPTER / REFUSER |

**Transitions possibles :**
- → `alliance_active` : Destinataire accepte (`respondToAlliance(id, "accept")`)
- → état "rejeté" : Destinataire refuse (`respondToAlliance(id, "reject")`) → status "rejected"
- → état "expiré" : `expires_at` dépassé côté serveur

**UI attendue :**
- `ranking.tsx` : dot doré sur le bouton "MES ALLIANCES" si `pendingAllianceCount > 0`
- `alliances.tsx` : section "INVITATIONS REÇUES" en haut de liste
- Cooldown de 48h sur nouvelle invitation au même joueur (vérifié côté serveur uniquement)

**Erreurs possibles :**
- `⚠` `fetchAlliances()` est appelé au mount de `ranking.tsx` et `alliances.tsx`. Si le joueur reçoit une invitation pendant la session sans naviguer vers ces écrans, le dot de notification n'apparaîtra pas.
- `⚠` `respondToAlliance()` peut retourner `{ ok: false, error: "not-pending" }` si l'invitation a expiré entre le fetch et la réponse (race condition réseau).

---

## 12. `alliance_active`

**Signification :** Au moins une alliance a `status="active"`. Chaque alliance active ajoute `+2%` à la production de ressources, plafonné à `+6%` (3 alliances max).

**Fichiers concernés :**
- [services/AllianceService.ts](services/AllianceService.ts) — `computeAllianceBonuses()`, `ALLIANCE_BONUS_PER_ACTIVE = 0.02`, `MAX_ALLIANCE_BONUS = 0.06`
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — `fetchAlliances()` → `allianceProductionBonus`
- [app/alliances.tsx](app/alliances.tsx) — encart "BONUS DIPLOMATIQUE ACTIF"

**Calcul du bonus :**
```typescript
function computeAllianceBonuses(alliances: Alliance[]) {
  const actives = alliances.filter(a => a.status === "active");
  const count = Math.min(actives.length, 3);
  const rate = count * ALLIANCE_BONUS_PER_ACTIVE; // 0.02, 0.04 ou 0.06
  return { rate, count };
}

// Dans accumulateResources() :
const multiplier = 1 + Math.min(productionBonus, MAX_ALLIANCE_BONUS);
```

**Transitions possibles :**
- → `alliance_pending` : Le partenaire rompt l'alliance (`respondToAlliance(id, "break")`)
- → état "broken" : L'utilisateur rompt lui-même l'alliance (Alert + `respondToAlliance(id, "break")`)

**UI attendue :**
- `alliances.tsx` : badge "+2% PRODUCTION" sur chaque alliance active
- `alliances.tsx` : encart "Bonus total : +X% production"
- `ranking.tsx` : bouton "MES ALLIANCES" sans dot (car aucun pending)

**Erreurs possibles :**
- `⚠` Le bonus production est calculé via `fetchAlliances()` au mount du `StrategyContext`. Si l'auth n'est pas encore prête au chargement, le bonus ne sera pas appliqué au calcul de production hors-ligne initial.
- `⚠` Une alliance peut expirer côté serveur sans notification push côté client. Le joueur peut croire avoir le bonus actif alors qu'il a expiré.

---

## 13. `spy_op_pending`

**Signification :** Une opération d'espionnage a été soumise au serveur (`POST /spy-launch`). L'opération est en cours de traitement côté serveur — le résultat sera disponible après un délai de 6 heures réelles.

**Fichiers concernés :**
- [services/SpyService.ts](services/SpyService.ts) — `launchSpyOp()`, `fetchSpyOps()`
- [app/player-profile.tsx](app/player-profile.tsx) — déclenchement + badge "Opération lancée"
- [app/spy-ops.tsx](app/spy-ops.tsx) — consultation des résultats

**Structure serveur :**
```typescript
interface SpyOp {
  id: string;
  op_type: "intel_probe" | "doctrine_scan" | "score_range";
  status: "pending" | "resolved" | "blocked";
  resolves_at: string;    // ISO — délai 6h réelles
  created_at: string;
  result_json: SpyResult | null;
}
```

**Limites serveur :**
- Max 2 opérations / 24h (toutes cibles confondues)
- Max 1 op par cible / 24h
- Prérequis : 1 partie classée validée (`no-validated-run` si absent)
- Protection nouveaux comptes : cibles < 7 jours protégées (`target-protected-new`)

**Transitions possibles :**
- → `spy_op_resolved` : `resolves_at` passé + serveur a résolu (`status="resolved"`)
- → état "blocked" : Défenses adverses ont intercepté l'opération

**UI attendue :**
- `player-profile.tsx` : chip vert + lien "Voir mes opérations →"
- `spy-ops.tsx` : section "EN COURS" avec countdown `countdownLabel(resolves_at)`

**Erreurs possibles :**
- `⚠` `fetchSpyOps()` n'est appelé qu'au mount et au pull-to-refresh. Si le résultat arrive entre deux ouvertures de l'écran, l'utilisateur ne le voit pas.
- `⚠` `spy-ops.tsx` trie les ops `pending` par `resolves_at` croissant mais `resolved` et `blocked` par `created_at` décroissant — un changement de tri peut faire disparaître visuellement un item pending récemment résolu.

---

## 14. `spy_op_resolved`

**Signification :** Le serveur a traité l'opération d'espionnage. `status = "resolved"` (résultat disponible dans `result_json`) ou `status = "blocked"` (défenses adverses ont intercepté).

**Fichiers concernés :**
- [services/SpyService.ts](services/SpyService.ts) — `fetchSpyOps()` → GET `/spy-resolve`
- [app/spy-ops.tsx](app/spy-ops.tsx) — `ResultLine` + `blockedReasonLabel()`

**Résultats par type d'opération :**

| `op_type` | Champs `result_json` retournés |
|---|---|
| `intel_probe` | `country`, `doctrine` |
| `doctrine_scan` | `doctrine`, `days_min`, `days_max` |
| `score_range` | `country`, `score_min`, `score_max` |

**Raisons de blocage (`blocked_reason`) :**
- `target-protected-new` — compte < 7 jours
- `target-protected-quota` — cible saturée ce cycle
- `target-no-score` — cible sans score classé
- `defense-intercepted` — réseau défensif adverse
- `intel-network-blocked` — réseau renseignement adverse

**Transitions possibles :**
- État terminal — une op résolue ne change plus d'état
- → nouvelle `spy_op_pending` si le joueur relance une op (quota permettant)

**UI attendue :**
- `spy-ops.tsx` : section "RÉSULTATS" (icône verte check-circle) ou "BLOQUÉES" (icône grise shield-off)
- Résultats affichés inline dans `ResultLine` avec drapeau et données

**Erreurs possibles :**
- `⚠` Si `result_json` est `null` sur une op `resolved` (cas serveur anormal), `ResultLine` retourne `null` et rien ne s'affiche — l'utilisateur voit une op resolved sans données.

---

## 15. `cyber_op_pending`

**Signification :** Une cyberattaque a été soumise (`POST /cyber-launch`). Le résultat sera disponible dans ~4 heures et apparaîtra dans `/cyber-ops`.

**Fichiers concernés :**
- [services/CyberService.ts](services/CyberService.ts) — `launchCyberOp()`, `fetchCyberOps()`
- [app/player-profile.tsx](app/player-profile.tsx) — déclenchement + badge "Cyberattaque lancée"
- [app/cyber-ops.tsx](app/cyber-ops.tsx) — consultation

**Limites serveur :**
- Max 1 cyberattaque / 24h (plus restrictif que l'espionnage)
- Prérequis : compte lié (`auth.isLinked`) + partie classée validée
- Proportionnalité : écart de score trop grand → `proportionality-exceeded`
- Protection nouveaux comptes : cibles < 14 jours protégées (plus long que l'espionnage)

**Résultat :**
```typescript
interface CyberOpsResult {
  sent: CyberOp[];             // cyberattaques envoyées par le joueur
  received: CyberOp[];         // cyberattaques reçues
  pending_debuff_pct: number | null;  // malus actif si sous attaque
}
```

**Transitions possibles :**
- → résultat visible dans `/cyber-ops` après 4h
- → état "failed" si quota dépassé, proportionnalité, protection cible

**UI attendue :**
- `player-profile.tsx` : badge vert "Cyberattaque lancée — résultat dans 4h"
- `cyber-ops.tsx` : liste des opérations envoyées et reçues
- `ranking.tsx` : bouton "MES CYBERATTAQUES" (accès rapide)

**Erreurs possibles :**
- `⚠` `cyberSent = true` est un état local React — si le joueur ferme l'app et revient sur le même profil, le bouton sera à nouveau disponible visuellement même si le quota est épuisé côté serveur.

---

## 16. `crisis_pending`

**Signification :** `state.news.pendingIds` contient des événements non-interactifs non encore affichés dans le journal. Ces événements ont été sélectionnés par `selectNextNews()` mais n'ont pas encore été lus par le joueur.

**Fichiers concernés :**
- [logic/newsEngine.ts](logic/newsEngine.ts) — `shouldTriggerNews()`, `selectNextNews()`, `applyAutoNews()`
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — `news.pendingIds`
- [app/journal-crise.tsx](app/journal-crise.tsx) — `pendingInteractive`

**Déclenchement :**
```typescript
// newsEngine.ts
const MINOR_NEWS_EVERY = 4;   // toutes les 4 actions
const MAJOR_NEWS_EVERY = 12;  // toutes les 12 actions (interactif)
const MAX_LOG = 30;           // 30 entrées max dans le journal

shouldTriggerNews(news, actionCount)        // minor : non-interactif
shouldTriggerInteractiveNews(news, ...)     // major : interactif
```

**Transitions possibles :**
- → `crisis_pending` (next) : Prochaine action → nouvelle news après MINOR_NEWS_EVERY actions
- → `critical_crisis_pending` : Si l'événement sélectionné est interactif (`e.isInteractive === true`)
- → Événement consommé : `markNewsRead()` vide `pendingIds`

**UI attendue :**
- `journal-crise.tsx` : badge de nombre de news non lues sur l'onglet
- Les news non-interactives s'affichent automatiquement dans `state.news.log` (pas de modal)
- `CrisisAlertOverlay` peut s'afficher si une alerte critique est configurée

**Erreurs possibles :**
- `⚠` `MAX_LOG = 30` : les entrées les plus anciennes sont silencieusement éjectées. Si le joueur joue intensivement sans ouvrir le journal, il peut manquer des événements.
- `⚠` `seenIds` contient tous les événements déjà vus. Si tous les événements disponibles sont vus, `selectNextNews()` retourne `null` — plus aucune news ne sera déclenchée jusqu'à l'ajout de nouveaux événements dans `newsEvents`.

---

## 17. `critical_crisis_pending`

**Signification :** `state.news.pendingIds` contient au moins un événement interactif (`e.isInteractive === true`). Ces événements requièrent une décision explicite du joueur via `InteractiveNewsModal`. Ils ne sont pas résolus automatiquement.

**Fichiers concernés :**
- [logic/newsEngine.ts](logic/newsEngine.ts) — `shouldTriggerInteractiveNews()`, `applyInteractiveNews()`
- [context/StrategyContext.tsx](context/StrategyContext.tsx) — `resolveInteractiveNews()`, `dismissNews()`
- [app/journal-crise.tsx](app/journal-crise.tsx) — `pendingInteractive`, `InteractiveNewsModal`
- [components/CrisisAlertOverlay.tsx](components/CrisisAlertOverlay.tsx) — overlay global

**Détection :**
```typescript
const pendingInteractive = state.news.pendingIds
  .map(id => NEWS_EVENT_MAP[id])
  .filter(Boolean)
  .filter(e => e.isInteractive);
// pendingInteractive.length > 0 → critical_crisis_pending
```

**Résolution :**
```typescript
resolveInteractiveNews(id, choiceIndex)
  → applyInteractiveNews(state, eventId, choiceIndex)  [newsEngine]
  → effets sur indicators, resources, hiddenPolitics
  → id retiré de pendingIds
  → ajouté à seenIds
  → entrée ajoutée au log (max MAX_LOG)
```

**Transitions possibles :**
- → `crisis_pending` ou neutre : Joueur choisit une option → `resolveInteractiveNews()`
- → neutral : Joueur ignore la modale et joue (la crise reste en pending)
- → crisis résolue automatiquement si `dismissNews()` est appelé

**UI attendue :**
- `journal-crise.tsx` : bandeau d'alerte en haut avec liste des crises interactives en attente
- `InteractiveNewsModal` : modale avec options de choix (texte + conséquences visibles)
- `CrisisAlertOverlay` : overlay persistant tant que la crise n'est pas résolue (si configuré)

**Erreurs possibles :**
- `⚠` Si plusieurs crises interactives s'accumulent dans `pendingIds` (joueur n'ouvre pas le journal), elles s'empilent sans résolution. Leur ordre de résolution dépend de l'ordre de `pendingIds` (FIFO).
- `⚠` `applyInteractiveNews()` applique les effets immédiatement sur `state` sans vérifier si les ressources résultantes passeraient sous zéro — un choix coûteux peut produire des ressources négatives si le joueur est déjà à zéro.
- `⚠` Les effets d'une crise interactive ne sont enregistrés dans le journal ranked (`recordEvent`) que si `isRankedIntended()` est `true`. Si la crise se déclenche après un crash/redémarrage (où `_rankedIntended` est `false`), l'événement manquera dans le journal.

---

## Matrice de compatibilité des états

Les états suivants peuvent coexister simultanément :

| État A | État B | Compatible ? | Remarque |
|---|---|---|---|
| `local_save_loaded` | `ranked_run_active` | Oui | Cas normal d'une partie classée en cours |
| `local_save_loaded` | `cloud_save_available` | Non | `cloud_save_available` écrase le local au chargement |
| `ranked_run_active` | `ranked_submit_pending` | Non | Run nettoyée après soumission (pending ou success) |
| `ranked_submit_pending` | `ranked_run_active` | Non | Un seul run à la fois |
| `auth_disabled` | `anonymous_session` | Non | Mutuellement exclusifs |
| `anonymous_session` | `linked_account` | Non | La liaison remplace l'anonymat |
| `alliance_active` | `spy_op_pending` | Oui | Multijoueur indépendant |
| `offline_mode` | `alliance_pending` | Oui | Invitations en file d'attente |
| `crisis_pending` | `critical_crisis_pending` | Oui | Plusieurs types dans `pendingIds` |
| `ranked_run_active` | `alliance_active` | Oui | Bonus production s'applique aussi en ranked |

---

## Index AsyncStorage — clés persistées

| Clé | Type | Contrôlé par | Nettoyé par |
|---|---|---|---|
| `@strategy_v1` | `StrategyGameState` | `strategyStorage` | `deleteStrategy()` |
| `ranked_journal_v1` | `RunEvent[]` | `RankedService` | `clearRun()` après submit |
| `ranked_run_meta_v1` | `RunMeta` | `RankedService` | `clearRun()` après submit |
| `ranked_pending_submit_v1` | `PendingSubmit` | `RankedService` | Après retry réussi ou rejet définitif |
| `sync_pending_upload_v1` | objet save | `SyncService` | Après upload réussi |
| `sync_device_id_v1` | `string` | `SyncService` | Jamais (persistant) |
| `offline_queue_v1` | `QueueItem[]` | `OfflineQueue` | `pruneQueue()` (items > 7 jours) |
| `etat_de_crise_entitlements_v1` | packs | `entitlements` | Jamais (cache 30j) |
| `__sb_as_*` | flag | `AuthContext.authStorage` | À la suppression de session Supabase |

**Clés SecureStore :**

| Clé | Contenu | Stocké par |
|---|---|---|
| `entitlements_verified_cache_v1` | packs vérifiés serveur | `entitlements` |
| Clés sessions Supabase | Session JWT (si < 2 KB) | `AuthContext.authStorage` |

**Règle de sécurité :** Aucun JWT (`accessToken`) n'est jamais stocké dans `AsyncStorage` ni `SecureStore` directement par le code applicatif. Le token est maintenu [MEM] par `AuthContext` et `SyncService._accessToken`.
