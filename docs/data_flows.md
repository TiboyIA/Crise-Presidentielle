# Cartographie des flux de données — État de Crise

> Décrit CE QUI CIRCULE, OÙ et DANS QUEL SENS pour chaque opération majeure.
> Ne décrit pas les règles métier (voir `business_rules.md`) ni l'architecture
> technique (voir `architecture.md`).
>
> Légende des annotations :
> - `[LOCAL]` — AsyncStorage ou mémoire React
> - `[SECURE]` — SecureStore (chiffré, iOS Keychain / Android Keystore)
> - `[MEM]` — mémoire vive uniquement (perdu au redémarrage)
> - `[SERVER]` — Supabase Edge Function ou RevenueCat
> - `→` envoi, `←` réception, `⇄` bidirectionnel

---

## Index

| # | Flux |
|---|---|
| 1 | [Nouvelle partie](#1-nouvelle-partie) |
| 2 | [Sauvegarde locale](#2-sauvegarde-locale) |
| 3 | [Cloud Save](#3-cloud-save) |
| 4 | [Mode classé](#4-mode-classé) |
| 5 | [Classement mondial](#5-classement-mondial) |
| 6 | [Profil joueur](#6-profil-joueur) |
| 7 | [Alliances](#7-alliances) |
| 8 | [Espionnage async](#8-espionnage-async) |
| 9 | [Cyberattaque async](#9-cyberattaque-async) |
| 10 | [Achats et entitlements](#10-achats-et-entitlements) |

---

## 1. Nouvelle partie

### Schéma

```
Joueur
  │  saisit nom, choisit pays, doctrine
  ▼
app/index.tsx
  │  lit entitlements (pays/doctrines verrouillés)
  │  lit COUNTRY_PACKS, DOCTRINE_PACK
  ▼
StrategyContext.initGame(name, countryId, doctrine, isRanked)
  │  crée StrategyGameState complet depuis INITIAL_BUILDINGS + DEFAULT_RESOURCES
  │  appelle RankedService.startRankedRun() si isRanked = true
  │    │
  │    └→ [SERVER] POST /ranked-start { countryId, doctrine, seed }
  │         ← { runId, seed }   [MEM] _rankedIntended = true
  ▼
strategyStorage.saveStrategy(state)
  │  → [LOCAL] AsyncStorage "@strategy_v1" = JSON(state)
  └→ SyncService.scheduleUpload(state, version)  [fire-and-forget]
       └→ [SERVER] POST /save-sync (si token disponible)
```

### Données créées

| Donnée | Type | Valeur initiale |
|---|---|---|
| `StrategyGameState` | Objet complet | `INITIAL_BUILDINGS` + `DEFAULT_RESOURCES` + indicateurs par défaut |
| `state.playerName` | string | Saisie joueur |
| `state.selectedCountry` | `CountryId` | Choix joueur |
| `state.doctrine` | `GovernanceDoctrine` | Choix joueur |
| `state.version` | number | `CURRENT_SAVE_VERSION` (= 3) |
| `state.startedAt` | number | `Date.now()` |
| `runId`, `seed` | string | Fournis par `/ranked-start` (si mode classé) |

### Données lues

| Source | Données |
|---|---|
| `[LOCAL]` EntitlementsProvider | `unlockedPacks` — pays et doctrines accessibles |
| `data/countries.ts` | `COUNTRIES`, `COUNTRY_PACKS` |
| `data/doctrines.ts` + `doctrinesPacks.ts` | `DOCTRINES`, `DOCTRINE_PACK` |
| `data/buildings.ts` | `INITIAL_BUILDINGS` |
| `storage/saveMigrations.ts` | `DEFAULT_RESOURCES`, `DEFAULT_STATS` |

### Données stockées localement

| Clé AsyncStorage | Contenu |
|---|---|
| `@strategy_v1` | `StrategyGameState` sérialisé en JSON |

### Données envoyées au serveur

| Endpoint | Payload | Quand |
|---|---|---|
| `POST /ranked-start` | `{ countryId, doctrine, seed }` | Si mode classé activé |
| `POST /save-sync` | `{ saveData, saveVersion, saveChecksum }` | Fire-and-forget après initGame |

### Réponse attendue

| Endpoint | Réponse | Usage |
|---|---|---|
| `/ranked-start` | `{ runId: string, seed: string }` | Stockés `[MEM]` dans RankedService |
| `/save-sync` | `200 ok` | Ignorée (fire-and-forget) |

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| `/ranked-start` échoue réseau | `isRankedIntended` reste false, partie lancée en mode non classé |
| `/save-sync` échoue réseau | Payload mis en attente `[LOCAL]` `sync_pending_upload_v1` |
| AsyncStorage plein | `saveStrategy()` silencieux — partie jouable en mémoire |

---

## 2. Sauvegarde locale

### Schéma

```
StrategyContext (après chaque mutation d'état)
  │
  ▼
strategyStorage.saveStrategy(state)
  │
  ├→ [LOCAL] AsyncStorage "@strategy_v1" = JSON(state)
  │
  └→ SyncService.scheduleUpload(state, state.version)
       │  validateAndSerialize() — vérifie taille (< 512 Ko) et clés dangereuses
       │  hashSave() — djb2 checksum
       │
       ├→ [SERVER] POST /save-sync { saveData, saveVersion, saveChecksum }
       │    ← 200 ok
       │
       └─ (si échec réseau)
            → [LOCAL] AsyncStorage "sync_pending_upload_v1" = { saveData, saveVersion, saveChecksum, queuedAt }
```

**Chargement au lancement :**
```
strategyStorage.loadStrategy()
  │
  ├─ AsyncStorage.getItem("@strategy_v1")
  │    │
  │    ├─ JSON.parse() → si erreur : parsed = {}
  │    │
  │    ├─ Fast path : isSaveCurrent() && isValidStrategyGameState()
  │    │    └→ StrategyGameState utilisé directement
  │    │
  │    └─ Migration path : migrateSave()
  │         └→ StrategyGameState migré, puis saveStrategy() (mise à jour locale)
  │
  └─ null si aucune save trouvée
```

### Données créées

| Donnée | Type | Source |
|---|---|---|
| `@strategy_v1` | JSON string | `StrategyGameState` sérialisé |
| `sync_pending_upload_v1` | JSON string | Payload d'upload en attente (si réseau indisponible) |

### Données lues

| Source | Données |
|---|---|
| `[LOCAL]` `@strategy_v1` | État de jeu complet |
| `utils/validators.ts` | `isValidStrategyGameState()` — validation du fast-path |
| `storage/saveMigrations.ts` | `isSaveCurrent()`, `migrateSave()` |

### Validation avant upload

```
validateAndSerialize(saveData, saveVersion) :
  - saveData !== null && typeof === "object" && !Array.isArray
  - saveVersion entier, entre MIN_SAVE_VERSION (1) et MAX_SAVE_VERSION (10)
  - Aucune clé "__proto__", "constructor", "prototype"
  - JSON.stringify(saveData).length < 512 000 octets
  → null si invalide (upload silencieusement ignoré)
```

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| JSON corrompu | `parsed = {}` → migration avec fallback state |
| Save non trouvée | `loadStrategy()` retourne `null` → nouvelle partie |
| Save irrécupérable | `usedFallback = true`, `createFallbackState()` utilisé |
| Upload > 512 Ko | Ignoré côté client — save locale conservée |

---

## 3. Cloud Save

### Schéma — upload (fire-and-forget)

```
saveStrategy()
  └→ SyncService.scheduleUpload(state, version)
       │
       ├─ validateAndSerialize()     ← vérification locale (non-securitaire)
       ├─ hashSave()                 ← djb2 checksum
       │
       ├→ [SERVER] POST /save-sync
       │   Headers: Authorization: Bearer {token_mémoire}, apikey: {anon_key}
       │   Body: { saveData, saveVersion, saveChecksum }
       │   ← 200 (succès) | 4xx/5xx (échec)
       │
       └─ (si échec)
            → [LOCAL] "sync_pending_upload_v1" = { saveData, saveVersion, saveChecksum, queuedAt }
```

### Schéma — synchronisation au lancement

```
AuthContext (auth ready)
  └→ SyncService.syncOnLaunch(accessToken, localSavedAt)
       │
       ├─ Step 1 : retry upload en attente
       │   AsyncStorage.getItem("sync_pending_upload_v1")
       │   → [SERVER] POST /save-sync (si présent)
       │   ← succès : AsyncStorage.removeItem("sync_pending_upload_v1")
       │
       └─ Step 2 : comparaison timestamps
           SyncService.downloadSave(accessToken)
           → [SERVER] GET /save-sync
           ← { save, saveVersion, savedAt } | null
           │
           ├─ validateCloudSave(data)   ← validation runtime défensive
           │
           └─ Résolution de conflit (seuil : 5 secondes) :
               cloudTs - localSavedAt > 5 000ms  → "cloud_newer"   (restaurer cloud)
               cloudTs - localSavedAt < -5 000ms → "local_newer"   (garder local)
               |diff| ≤ 5 000ms                  → "conflict_detected" (garder local)
               Pas de save cloud                  → "no_cloud_save"
```

### Données créées

| Donnée | Type | Stockage |
|---|---|---|
| `sync_pending_upload_v1` | `{ saveData, saveVersion, saveChecksum, queuedAt }` | `[LOCAL]` AsyncStorage |
| `sync_device_id_v1` | string (UUID device) | `[LOCAL]` AsyncStorage |

### Données envoyées au serveur

| Endpoint | Méthode | Payload |
|---|---|---|
| `/save-sync` | POST | `{ saveData: object, saveVersion: number, saveChecksum: string }` |
| `/device-register` | POST | `{ platform, osVersion, appVersion }` |

### Données reçues du serveur

| Endpoint | Méthode | Réponse |
|---|---|---|
| `/save-sync` | GET | `{ save: object, saveVersion: number, savedAt: string (ISO) }` |
| `/device-register` | POST | `{ deviceId: string }` |

### Invariants de sécurité

- Le token JWT n'est **jamais** écrit dans AsyncStorage — il est maintenu `[MEM]` dans `SyncService._accessToken`
- `setAccessToken(null)` appelé par AuthContext à chaque déconnexion
- Le serveur revalide indépendamment — `validateAndSerialize()` est une garde client, non-sécuritaire
- Le checksum djb2 détecte la corruption accidentelle, pas la falsification intentionnelle

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| Réseau indisponible à l'upload | `sync_pending_upload_v1` créé, retenté au prochain lancement |
| Token null | `scheduleUpload()` retourne silencieusement |
| Save cloud invalide (`validateCloudSave` échoue) | Retourne `null` → local conservé |
| Conflit timestamps < 5s | `"conflict_detected"` → local conservé (plus sûr) |
| Save > 512 Ko | Rejetée côté client avant upload |

---

## 4. Mode classé

### Schéma complet

```
Création de partie (index.tsx, isRanked = true)
  │
  ├→ [SERVER] POST /ranked-start { countryId, doctrine, seed? }
  │    ← { runId: string, seed: string }
  │    Stockés [MEM] dans RankedService (_runMeta)
  │    Stockés [LOCAL] AsyncStorage "ranked_run_meta_v1" = { runId, seed, startedAt }
  │
  └─ _rankedIntended = true  [MEM]

Pendant la partie (chaque action clé)
  │
  ├─ StrategyContext appelle RankedService.recordEvent(eventType, payload)
  │    │  seq++ (numéro croissant)
  │    │  elapsed_ms = Date.now() - runMeta.startedAt
  │    └→ [LOCAL] AsyncStorage "ranked_journal_v1" = [...events, newEvent]

  Types d'événements enregistrés :
    crisis_choice, reform_launched, doctrine_set, military_op, game_over,
    mandate_end, building_upgrade_started, building_upgrade_completed,
    research_started, research_completed, unit_training_started,
    unit_training_completed, resource_snapshot_periodic (toutes les 5 min),
    operation_result, ranked_score_hint

Fin de partie / soumission
  │
  ├─ RankedService.submitRankedRun(accessToken, finalIndicators, mandateDays)
  │    │  journalHash = djb2(JSON(events))
  │    │  deviceId, appVersion inclus
  │    │
  │    ├→ [SERVER] POST /ranked-submit
  │    │   Body: { runId, events[], finalIndicators, mandateDays,
  │    │           journalHash, deviceId?, appVersion? }
  │    │   ← { score: number, rank: number } | 422 (anomalie)
  │    │
  │    ├─ (succès) → [LOCAL] supprime "ranked_journal_v1" et "ranked_run_meta_v1"
  │    │
  │    └─ (échec réseau) → [LOCAL] "ranked_pending_submit_v1" = {
  │         runId, events[], finalIndicators, mandateDays, journalHash,
  │         deviceId?, appVersion?
  │         // ⚠ accessToken ABSENT — jamais persisté
  │       }

Prochain lancement (auth ready)
  └→ RankedService.retryPendingSubmission(freshAccessToken)
       ← lit "ranked_pending_submit_v1"
       → [SERVER] POST /ranked-submit (avec token frais)
       ← succès : supprime pending
```

### Données créées

| Donnée | Stockage | Contenu |
|---|---|---|
| `ranked_run_meta_v1` | `[LOCAL]` | `{ runId, seed, startedAt }` |
| `ranked_journal_v1` | `[LOCAL]` | `RunEvent[]` — séquence d'actions |
| `ranked_pending_submit_v1` | `[LOCAL]` | Payload de soumission sans JWT |

### Données envoyées au serveur

| Endpoint | Payload | Note |
|---|---|---|
| `/ranked-start` | `{ countryId, doctrine, seed? }` | Reçoit `runId` + `seed` |
| `/ranked-submit` | `{ runId, events[], finalIndicators, mandateDays, journalHash, deviceId?, appVersion? }` | Score calculé côté serveur |

### Invariants de sécurité

- **Le score n'est jamais calculé côté client.** Le client envoie des données brutes.
- Le JWT n'est **jamais** dans `ranked_pending_submit_v1`.
- `retryPendingSubmission(token)` reçoit un token frais depuis AuthContext.
- Le serveur peut rejeter avec 422 si le journal est incohérent (anomaly_penalty).

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| `/ranked-start` échoue | Partie lancée en mode non classé |
| `/ranked-submit` échoue réseau | `ranked_pending_submit_v1` créé, retenté au prochain lancement |
| `/ranked-submit` répond 422 | Run rejetée (anomalie détectée), pas de retry |
| Journal local corrompu | Soumission échoue côté serveur (hash mismatch) |

---

## 5. Classement mondial

### Schéma

```
app/ranking-global.tsx (montage ou refresh)
  │
  ├─ fetchLeaderboard(accessToken, page, countryFilter?)
  │    │
  │    └→ [SERVER] GET /leaderboard?page=N&country=XX
  │         ← { entries: LeaderboardEntry[], total: number, hasMore: boolean }
  │         │
  │         └─ filterValid(data.entries, validateLeaderboardEntry)
  │              ← LeaderboardEntry[] validées

  LeaderboardEntry :
    { player_id, player_name, country_id, doctrine, score,
      rank, season, global_power?, ranking_points? }

  FlatList paginée (50 entrées / page)
  Pull-to-refresh → fetchLeaderboard(token, 1)
  Fin de liste → fetchLeaderboard(token, page + 1)
```

### Navigation vers profil joueur

```
Tap sur une ligne du classement
  │
  └→ router.push("/player-profile", {
       entry: JSON.stringify(leaderboardEntry),
       rank: string
     })
```

### Données lues

| Source | Données |
|---|---|
| `[SERVER]` `/leaderboard` | `LeaderboardEntry[]` paginées |
| `[LOCAL]` `auth.accessToken` `[MEM]` | Token d'auth pour les headers |
| `utils/validators.ts` | `validateLeaderboardEntry()` — filtre les entrées invalides |

### Données affichées (jamais stockées localement)

```typescript
interface LeaderboardEntry {
  player_id:      string;
  player_name:    string;
  country_id:     string;
  doctrine:       string;
  score:          number;
  rank:           number;
  season:         number;
  global_power?:  number;
  ranking_points?: number;
}
```

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| Réseau indisponible | Liste vide, message "connexion requise" |
| Token null | Aucun appel effectué |
| Entrées JSON invalides | `filterValid()` les retire silencieusement |
| `FEATURES.enableGlobalLeaderboard = false` | `FeatureUnavailable` affiché |

---

## 6. Profil joueur

### Schéma

```
Tap sur une entrée du leaderboard
  │
  ├─ Données transmises par paramètre de route (pas de fetch) :
  │    route params : { entry: JSON(LeaderboardEntry), rank: string }
  │
  └→ app/player-profile.tsx
       │  JSON.parse(params.entry) → LeaderboardEntry | null
       │
       ├─ Affichage : nom, pays, doctrine, score, rang, saison
       │
       ├─ [Action] Inviter en alliance
       │    └→ enqueueAllianceInvite(entry.player_id, accessToken)
       │         [voir flux 7 — Alliances]
       │
       ├─ [Action] Lancer une opération d'espionnage
       │    └→ launchSpyOp(accessToken, entry.player_id, opType)
       │         [voir flux 8 — Espionnage]
       │
       └─ [Action] Lancer une cyberattaque
            └→ launchCyberOp(accessToken, entry.player_id)
                 [voir flux 9 — Cyberattaque]
```

### Données transmises (paramètres de route)

| Paramètre | Type | Source |
|---|---|---|
| `entry` | `string` (JSON sérialisé) | `LeaderboardEntry` depuis `ranking-global.tsx` |
| `rank` | `string` | Position dans le classement |

### Données lues localement

| Source | Données |
|---|---|
| `auth.accessToken` `[MEM]` | Token pour les actions (invite, spy, cyber) |
| `auth.isEnabled` `[MEM]` | Boutons d'action affichés uniquement si authentifié |

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| `JSON.parse(params.entry)` échoue | `entry = null` → écran vide, pas de crash |
| Token null | Boutons d'action désactivés |

---

## 7. Alliances

### Schéma — lecture de la liste

```
app/alliances.tsx (montage / pull-to-refresh)
  │
  └→ AllianceService.fetchAlliances(accessToken)
       └→ [SERVER] GET /alliance-list
            Headers: Authorization: Bearer {token}, apikey: {anon_key}
            ← { alliances: Alliance[] }
            └─ filterValid(data.alliances, validateAlliance)
                 ← Alliance[] validées (invalides silencieusement ignorées)
```

### Schéma — invitation (online)

```
app/player-profile.tsx → bouton "Inviter"
  │
  └→ enqueueAllianceInvite(entry.player_id, accessToken)
       │
       ├─ Tente l'envoi direct :
       │    → [SERVER] POST /alliance-invite { targetPlayerId }
       │    ← { ok: true } | { ok: false, error: string }
       │    → résultat : "sent"
       │
       └─ (si réseau indisponible) :
            → OfflineQueue.enqueue({ id: "alliance_invite:{playerId}", type: "alliance_invite", payload: { targetPlayerId } })
            → [LOCAL] AsyncStorage "offline_queue_v1" mis à jour
            → résultat : "queued"
```

### Schéma — réponse à une invitation

```
app/alliances.tsx → bouton "Accepter" / "Refuser" / "Rompre"
  │
  └→ AllianceService.respondToAlliance(accessToken, allianceId, action)
       └→ [SERVER] POST /alliance-respond { allianceId, action }
            ← { ok: true } | { ok: false, error: string }
```

### Schéma — retry offline (au lancement)

```
AuthContext (auth ready)
  └→ OfflineQueue.flushQueue(freshAccessToken)  [⚠ non encore câblé dans _layout.tsx]
       │
       └─ Pour chaque item "alliance_invite" en file :
            → [SERVER] POST /alliance-invite { targetPlayerId }
            ← 200 ok → statut "success"
            ← 409 / 422 → statut "failed" (rejet définitif, pas de retry)
            ← 5xx / réseau → backoff : 10s → 20s → 40s → 80s → 300s (max 5 tentatives)
```

### Données créées

| Donnée | Stockage | Contenu |
|---|---|---|
| `offline_queue_v1` | `[LOCAL]` | `QueueItem[]` — items en attente |

### Données envoyées au serveur

| Endpoint | Méthode | Payload |
|---|---|---|
| `/alliance-invite` | POST | `{ targetPlayerId: string }` |
| `/alliance-respond` | POST | `{ allianceId: string, action: "accept" \| "reject" \| "break" }` |

### Données reçues du serveur

| Endpoint | Méthode | Réponse |
|---|---|---|
| `/alliance-list` | GET | `{ alliances: Alliance[] }` |
| `/alliance-invite` | POST | `{ ok: boolean, error?: string }` |
| `/alliance-respond` | POST | `{ ok: boolean, error?: string }` |

### `Alliance` — structure reçue

```typescript
interface Alliance {
  id:           string;
  status:       "pending" | "active" | "rejected" | "broken";
  created_at:   string;   // ISO 8601
  expires_at:   string | null;
  is_initiator: boolean;
  partner_id:   string;
  partner_name: string;
}
```

### Calcul du bonus appliqué localement

```
computeAllianceBonuses(alliances) :
  count = min(alliances.filter(a => a.status === "active").length, 3)
  rate  = count × 0.02   // +2% par alliance, max +6%
  → transmis à accumulateResources() comme productionBonus
```

### Erreurs et fallbacks

| Erreur | Code serveur | Comportement |
|---|---|---|
| Quota d'invitations atteint | 422 | Item marqué "failed", message affiché |
| Invitation déjà existante | 409 | Item marqué "failed", message affiché |
| Réseau indisponible | — | Item mis en file offline |
| 5 tentatives épuisées | — | Item marqué "failed" définitivement |
| `FEATURES.enableAlliances = false` | — | `FeatureUnavailable`, aucun appel |

---

## 8. Espionnage async

### Schéma — lancement

```
app/player-profile.tsx → bouton "Espionner"
  │  sélection du type : "intel_probe" | "doctrine_scan" | "score_range"
  │
  └→ SpyService.launchSpyOp(accessToken, targetPlayerId, opType)
       └→ [SERVER] POST /spy-launch
            Headers: Authorization: Bearer {token}, apikey: {anon_key}
            Body: { targetPlayerId: string, opType: SpyOpType }
            ← { ok: true, resolvesAt: string (ISO) }  — date de résolution
          | ← { ok: false, error: string }
```

### Schéma — consultation des résultats

```
app/spy-ops.tsx (montage / pull-to-refresh)
  │
  └→ SpyService.fetchSpyOps(accessToken)
       └→ [SERVER] GET /spy-resolve
            ← { ops: SpyOp[] }
            └─ filterValid(data.ops, validateSpyOp)
                 ← SpyOp[] validées
```

### Données envoyées au serveur

| Endpoint | Méthode | Payload |
|---|---|---|
| `/spy-launch` | POST | `{ targetPlayerId: string, opType: "intel_probe" \| "doctrine_scan" \| "score_range" }` |

### Données reçues du serveur

| Endpoint | Méthode | Réponse |
|---|---|---|
| `/spy-launch` | POST | `{ ok: boolean, resolvesAt?: string, error?: string }` |
| `/spy-resolve` | GET | `{ ops: SpyOp[] }` |

### `SpyOp` — structure reçue

```typescript
interface SpyOp {
  id:          string;
  op_type:     "intel_probe" | "doctrine_scan" | "score_range";
  status:      "pending" | "resolved" | "blocked";
  created_at:  string;    // ISO 8601
  resolves_at: string;    // ISO 8601 — date de résolution serveur
  result_json: SpyResult | null;
}

interface SpyResult {
  target_name:    string;
  country?:       string;     // intel_probe
  doctrine?:      string;     // intel_probe
  days_min?:      number;     // doctrine_scan — durée de mandat min estimée
  days_max?:      number;     // doctrine_scan — durée de mandat max estimée
  score_min?:     number;     // score_range
  score_max?:     number;     // score_range
  blocked_reason?: string;    // si status = "blocked"
}
```

### Données stockées localement

Aucune. Les opérations d'espionnage ne sont **jamais** persistées en local —
elles sont rechargées depuis le serveur à chaque ouverture de l'écran.

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| Réseau indisponible | `fetchSpyOps()` retourne `[]`, écran vide |
| Réponse JSON invalide | `filterValid()` filtre, retourne `[]` partiel |
| Token null / auth absent | Aucun appel effectué |
| `FEATURES.enableSpyOps = false` | `FeatureUnavailable`, aucun appel |

---

## 9. Cyberattaque async

### Schéma — lancement

```
app/player-profile.tsx → bouton "Attaquer"
  │
  └→ CyberService.launchCyberOp(accessToken, targetPlayerId)
       └→ [SERVER] POST /cyber-launch
            Headers: Authorization: Bearer {token}, apikey: {anon_key}
            Body: { targetPlayerId: string }
            ← { ok: true, resolvesAt: string (ISO) }
          | ← { ok: false, error: string }
```

### Schéma — consultation

```
app/cyber-ops.tsx (montage / pull-to-refresh)
  │
  └→ CyberService.fetchCyberOps(accessToken)
       └→ [SERVER] GET /cyber-resolve
            ← { sent?: unknown[], received?: unknown[], pending_debuff_pct?: number | null }
            │
            ├─ filterValid(data.sent,     validateCyberOp) → sent: CyberOp[]
            ├─ filterValid(data.received, validateCyberOp) → received: CyberOp[]
            └─ pending_debuff_pct : number | null (validé par typeof === "number")
```

### Données envoyées au serveur

| Endpoint | Méthode | Payload |
|---|---|---|
| `/cyber-launch` | POST | `{ targetPlayerId: string }` |

### Données reçues du serveur

| Endpoint | Méthode | Réponse |
|---|---|---|
| `/cyber-launch` | POST | `{ ok: boolean, resolvesAt?: string, error?: string }` |
| `/cyber-resolve` | GET | `{ sent: CyberOp[], received: CyberOp[], pending_debuff_pct: number \| null }` |

### `CyberOp` — structure reçue

```typescript
interface CyberOp {
  id:            string;
  attacker_id:   string;
  target_id:     string;
  status:        "pending" | "resolved" | "blocked";
  magnitude:     number;   // intensité de l'attaque
  created_at:    string;   // ISO 8601
  resolves_at:   string;   // ISO 8601
  target_name?:  string;
  attacker_name?: string;
}
```

### Effet sur le jeu (debuff)

```
pending_debuff_pct (ex. 0.10 = -10%)
  → appliqué à la production de cyberDefense dans accumulateResources()
  → non persisté localement — rechargé depuis le serveur à chaque fetch
```

### Distinction critique sent / received

```
sent[]     = attaques lancées PAR le joueur courant (historique offensif)
received[] = attaques reçues PAR le joueur courant (impact défensif)
// Ne jamais confondre : les afficher dans le bon panneau
```

### Données stockées localement

Aucune — identique au flux d'espionnage.

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| Réseau indisponible | `{ sent: [], received: [], pending_debuff_pct: null }` |
| Réponse JSON invalide | `filterValid()` sur chaque tableau, `null` pour `pending_debuff_pct` |
| Token null | Aucun appel effectué |
| `FEATURES.enableCyberOps = false` | `FeatureUnavailable`, aucun appel |

---

## 10. Achats et entitlements

### Schéma — initialisation au lancement

```
app/_layout.tsx → EntitlementsProvider.refresh()
  │
  ├─ [1] readStored() → [LOCAL] AsyncStorage "etat_de_crise_entitlements_v1"
  │                      ← { packs: EventPack[] }  (debug grants uniquement)
  │
  ├─ [2] fetchCustomerInfo() → RevenueCat SDK (natif)
  │       ← CustomerInfo → packsFromCustomerInfo() → EventPack[]
  │
  └─ [3] fetchBackendEntitlements() → [SERVER] GET /player-entitlements
          Headers: Authorization: Bearer {token}, apikey: {anon_key}
          ← { entitlements: string[] }
          └─ packsFromEntitlementIds(ids) → EventPack[]

  Fusion :
    Si serveur accessible : realPacks = union(backendPacks, rcPacks)
                            → writeVerifiedCache(realPacks)
                              [SECURE] SecureStore "entitlements_verified_cache_v1"
    Si serveur inaccessible : realPacks = readVerifiedCache() (valide 30 jours)

  unlockedPacks = union(realPacks, FREE_PACKS)   // "climate" toujours inclus
```

### Schéma — achat

```
app/shop.tsx → bouton "Acheter"
  │
  └→ purchasePack(pack)
       │  Purchases.getOfferings()   → RevenueCat SDK
       │  Purchases.purchasePackage(rcPackage)
       │  ← { customerInfo }
       │
       └→ packsFromCustomerInfo(customerInfo) → EventPack[]
            → EntitlementsProvider.grantLocal(pack)
               → [LOCAL] AsyncStorage "etat_de_crise_entitlements_v1" mis à jour
               → RevenueCat webhook → [SERVER] met à jour player-entitlements
```

### Schéma — restauration des achats

```
app/shop.tsx → bouton "Restaurer"
  │
  └→ restorePurchases()
       │  Purchases.restorePurchases() → RevenueCat SDK
       │  ← CustomerInfo
       │
       └→ packsFromCustomerInfo(customerInfo) → EventPack[]
            → EntitlementsProvider.grantLocal(pack) pour chaque pack
```

### Priorité de la source de vérité

```
Priorité décroissante :
  1. [SERVER] /player-entitlements    (source de vérité absolue)
  2. RevenueCat SDK                   (optimiste — fenêtre entre achat et webhook)
  3. [SECURE] SecureStore (cache 30j) (offline grace period)
  4. [LOCAL] AsyncStorage             (debug grants uniquement)
  5. FREE_PACKS                       (toujours inclus)

Règle : quand le serveur est accessible, les grants AsyncStorage sont ignorés
(sécurité contre les modifications sur appareils rootés).
```

### Données créées / mises à jour

| Donnée | Stockage | Contenu |
|---|---|---|
| `etat_de_crise_entitlements_v1` | `[LOCAL]` AsyncStorage | `{ packs: EventPack[] }` (debug/web) |
| `entitlements_verified_cache_v1` | `[SECURE]` SecureStore | `{ packs: EventPack[], verifiedAt: number }` |

### Données envoyées au serveur

| Endpoint | Méthode | Contexte |
|---|---|---|
| `/player-entitlements` | GET | Lecture des entitlements par le serveur |
| RevenueCat webhook | POST (serveur → serveur) | Déclenché par RevenueCat après achat |

### Données reçues

| Source | Données |
|---|---|
| `/player-entitlements` | `{ entitlements: string[] }` (IDs RevenueCat) |
| RevenueCat SDK | `CustomerInfo` → `entitlements.active` |
| `[SECURE]` cache | `{ packs: EventPack[], verifiedAt: number }` |

### Packs disponibles

| Pack ID | Entitlement RevenueCat | Pack gratuit |
|---|---|---|
| `"climate"` | `"climate_pack"` | ✓ (FREE_PACKS) |
| `"guerre_hybride"` | `"guerre_hybride_pack"` | ✗ |
| `"cyber"` | `"cyber_pack"` | ✗ |

### Erreurs et fallbacks

| Erreur | Comportement |
|---|---|
| `/player-entitlements` indisponible | Cache SecureStore utilisé (30 jours) |
| Cache expiré (> 30 jours) | `[]` retourné — uniquement FREE_PACKS accessibles |
| RevenueCat non initialisé | `fetchCustomerInfo()` retourne `null`, SDK ignoré |
| Expo Go (module natif absent) | `getPurchases()` retourne `null`, achats désactivés |
| Plateforme `web` | Achats entièrement désactivés |

---

## Annexe — Résumé des stockages

### AsyncStorage (non chiffré)

| Clé | Module | Contenu | Durée |
|---|---|---|---|
| `@strategy_v1` | strategyStorage | `StrategyGameState` JSON | Jusqu'à suppression |
| `save_slot_1` … `save_slot_6` | saveSlots | `StrategyGameState` JSON | Jusqu'à suppression |
| `sync_pending_upload_v1` | SyncService | Payload cloud save en attente | Jusqu'à upload réussi |
| `sync_device_id_v1` | SyncService | UUID device | Permanent |
| `ranked_run_meta_v1` | RankedService | `{ runId, seed, startedAt }` | Jusqu'à soumission |
| `ranked_journal_v1` | RankedService | `RunEvent[]` | Jusqu'à soumission |
| `ranked_pending_submit_v1` | RankedService | Payload sans JWT | Jusqu'à retry réussi |
| `offline_queue_v1` | OfflineQueue | `QueueItem[]` | Jusqu'à success/failed + 7j |
| `etat_de_crise_entitlements_v1` | EntitlementsProvider | `{ packs }` (debug) | Permanent |

### SecureStore (chiffré)

| Clé | Module | Contenu | Durée |
|---|---|---|---|
| `entitlements_verified_cache_v1` | EntitlementsProvider | `{ packs, verifiedAt }` | 30 jours glissants |

### Mémoire uniquement ([MEM])

| Variable | Module | Contenu | Durée |
|---|---|---|---|
| `_accessToken` | SyncService | JWT Supabase | Jusqu'à `setAccessToken(null)` |
| `_entitlementToken` | EntitlementsProvider | JWT Supabase | Jusqu'à auth change |
| `_rankedIntended` | RankedService | `boolean` mode classé actif | Jusqu'au redémarrage |
| `_runMeta` | RankedService | `{ runId, seed, startedAt }` | Jusqu'au redémarrage |

### Invariants globaux de sécurité

```
1. JWT → jamais dans AsyncStorage ni SecureStore
2. Score classé → jamais calculé côté client
3. Entitlements → serveur + SecureStore > AsyncStorage > FREE_PACKS
4. Réponses réseau → toujours filtrées via filterValid() avant usage
5. Données réseau invalides → [] ou null, jamais de throw
```
