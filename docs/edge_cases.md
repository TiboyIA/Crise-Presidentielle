# Catalogue des Cas Limites — Président : Nation en Crise

> MODE DELTA — documentation pure. Aucune modification de code.
> Dernière mise à jour : 2026-05-19. Version cible : CURRENT_SAVE_VERSION = 3.

Chaque cas est identifié par un code `EC-<catégorie>-<numéro>`.
Priorités : **critique** → **forte** → **moyenne** → **faible**.

---

## Table des matières

1. [Sauvegarde (EC-S)](#1-sauvegarde-ec-s)
2. [Offline (EC-O)](#2-offline-ec-o)
3. [Classement (EC-C)](#3-classement-ec-c)
4. [Alliances (EC-A)](#4-alliances-ec-a)
5. [Espionnage (EC-E)](#5-espionnage-ec-e)
6. [Cyberattaque (EC-Y)](#6-cyberattaque-ec-y)
7. [Missions (EC-M)](#7-missions-ec-m)
8. [Recherches (EC-R)](#8-recherches-ec-r)
9. [Unités (EC-U)](#9-unités-ec-u)
10. [Journal de Crise (EC-J)](#10-journal-de-crise-ec-j)
11. [Achat (EC-P)](#11-achat-ec-p)

---

## Résumé par priorité

| Code | Titre court | Priorité |
|------|-------------|----------|
| EC-S-02 | JSON corrompu dans AsyncStorage | **critique** |
| EC-S-06 | Fermeture app pendant écriture AsyncStorage | **critique** |
| EC-O-04 | flushQueue() non câblé au relancement | **critique** |
| EC-O-06 | spy_launch / cyber_launch "réservés" → {ok:true} sans appel réseau | **critique** |
| EC-C-01 | _rankedIntended perdu après redémarrage | **critique** |
| EC-C-03 | HTTP 422 → clearRun() + perte progression classée | **critique** |
| EC-C-09 | APM > 8/min → rejet 422 (joueur rapide) | **critique** |
| EC-E-03 | enqueueSpyLaunch() non câblé | **critique** |
| EC-Y-01 | enqueueCyberLaunch() non câblé | **critique** |
| EC-P-02 | Cache 30j expiré + serveur inaccessible → FREE_PACKS seulement | **critique** |
| EC-S-03 | Sauvegarde > 512 KB refusée silencieusement | **forte** |
| EC-S-04 | Conflit temporal ≤ 5 s → local conservé sans avertissement | **forte** |
| EC-S-08 | usedFallback=true → données partiellement perdues | **forte** |
| EC-O-02 | MAX_ATTEMPTS atteint → statut "failed" définitif | **forte** |
| EC-O-05 | Invitation alliance en offline, jamais envoyée | **forte** |
| EC-C-05 | Soumission offline → PENDING_SUBMIT_KEY sans token | **forte** |
| EC-C-06 | Rate-limit 429 (2ème run en < 23h) | **forte** |
| EC-E-01 | Quota espion 2/24h dépassé | **forte** |
| EC-E-04 | resolves_at dépassé sans réouverture app | **forte** |
| EC-M-01 | Missions expirées + generateDailyMissions() non encore appelé | **forte** |
| EC-M-05 | assignedAt corrompu → faux positif permanent | **forte** |
| EC-J-01 | MAX_LOG=30 → entrée la plus ancienne écrasée | **forte** |
| EC-P-03 | Appareil rooté → AsyncStorage grants ignorés | **forte** |
| EC-P-05 | writeVerifiedCache non appelé si realPacks vide | **forte** |

---

## 1. Sauvegarde (EC-S)

### EC-S-01 — Migration depuis une ancienne version (v0 / v1 / v2)

**Scénario :** Un joueur installe une mise à jour après plusieurs mois. Sa sauvegarde locale est v1 ou v2 (voire sans champ `version`). `loadStrategy()` détecte que `isSaveCurrent()` est faux et déclenche `migrateSave()`.

**Risque :** Si un champ attendu par le moteur de jeu est manquant dans la sauvegarde source ET que la migration defaulte à une valeur incorrecte, le joueur peut démarrer avec des ressources erronées, des ministres en double, ou un état de recherche vierge malgré des mois de progression.

**Comportement attendu :**
- `migrateV1ToV2` ajoute uniquement les champs manquants, sans écraser les valeurs existantes.
- `migrateV2ToV3` ajoute `cosmicInfluence` et `dailyLoginReward` avec des défauts neutres.
- `warnings[]` de `MigrationResult` sont remplis pour chaque champ patché.
- En mode dev : `saveWarnings` sont loggés dans `app/recovery.tsx`.

**Fichiers à vérifier :**
- `storage/saveMigrations.ts` — fonctions `migrateV0ToV1`, `migrateV1ToV2`, `migrateV2ToV3`, `sanitize`
- `storage/strategyStorage.ts` — `loadStrategy()`, fast path `isSaveCurrent`

**Priorité :** moyenne

---

### EC-S-02 — JSON corrompu dans AsyncStorage

**Scénario :** L'écriture AsyncStorage est interrompue (manque de stockage, crash OS). Au prochain lancement, `JSON.parse()` échoue sur `"@strategy_v1"`.

**Risque :** `loadStrategy()` retourne `null`, l'UI affiche l'écran de démarrage comme si aucune sauvegarde n'existait. Le joueur peut lancer une nouvelle partie et écraser ses données si le cloud save n'est pas restauré.

**Comportement attendu :**
- `loadStrategy()` doit catcher l'exception JSON et tenter la restauration cloud via `syncOnLaunch()`.
- Si pas de cloud save → `usedFallback=true` + navigation vers `app/recovery.tsx`.
- Le joueur doit pouvoir exporter un diagnostic avant toute action destructive.

**Fichiers à vérifier :**
- `storage/strategyStorage.ts` — bloc `try/catch` de `loadStrategy()`
- `app/recovery.tsx` — actions : cloud restore, export diagnostic, nouvelle partie
- `services/SyncService.ts` — `downloadSave()`

**Priorité :** **critique**

---

### EC-S-03 — Sauvegarde dépassant 512 KB

**Scénario :** Après de nombreuses parties, le `news.log` (max 30 entrées) ou `ranking[]` grossit et le JSON sérialisé dépasse `SAVE_MAX_BYTES = 512 000` octets.

**Risque :** `validateAndSerialize()` retourne `null` silencieusement → `scheduleUpload()` ne fait rien → le cloud save n'est jamais mis à jour → en cas de perte du téléphone, la progression récente est perdue.

**Comportement attendu :**
- `validateAndSerialize()` retourne `null` si `serialized.length > 512 000`.
- Aucun `PENDING_UPLOAD_KEY` n'est créé (la donnée invalide ne doit pas être mise en file).
- En dev : logguer un warning pour alerter que la sauvegarde dépasse la limite.

**Fichiers à vérifier :**
- `services/SyncService.ts` — `validateAndSerialize()`, `scheduleUpload()`
- `storage/strategyStorage.ts` — `saveStrategy()` (appelle `scheduleUpload()` en fire-and-forget)

**Priorité :** **forte**

---

### EC-S-04 — Conflit temporal ≤ 5 secondes (conflict_detected)

**Scénario :** Le joueur joue simultanément sur deux appareils. Les deux sauvegardent à moins de 5 secondes d'intervalle. `syncOnLaunch()` détecte `|diff| ≤ 5 000 ms`.

**Risque :** La résolution `"conflict_detected"` conserve le local sans avertir le joueur. Si le cloud était légèrement plus récent (ex. : il venait d'acheter un upgrade sur l'autre appareil), cette progression est silencieusement écrasée.

**Comportement attendu :**
- Résolution : conserver le local (choix conservateur documenté dans `SyncService`).
- Idéalement : afficher un toast discret "Conflit résolu — sauvegarde locale conservée".
- Ne jamais merger les deux sauvegardes (risque de duplication de ressources).

**Fichiers à vérifier :**
- `services/SyncService.ts` — `syncOnLaunch()`, seuil `5_000 ms`
- `context/AuthContext.tsx` — `syncOnLaunch()` appelé dans `onAuthenticated()`

**Priorité :** **forte**

---

### EC-S-05 — Cloud plus récent au lancement (cloud_newer)

**Scénario :** Le joueur change de téléphone. Le cloud save date d'un jeu sur l'ancien appareil, plus récent que la sauvegarde locale vide.

**Risque :** Si `migrateSave()` échoue sur le cloud save (format inconnu, version > `MAX_SAVE_VERSION`), `usedFallback=true` et le joueur perd ses données.

**Comportement attendu :**
- `downloadSave()` valide via `validateCloudSave()` avant tout usage.
- Si validation échoue : afficher `app/recovery.tsx` avec option "export diagnostic".
- Si validation réussit : `migrateSave()` avant d'appliquer (le cloud peut être en version antérieure).

**Fichiers à vérifier :**
- `services/SyncService.ts` — `downloadSave()`, `syncOnLaunch()`
- `utils/validators.ts` — `validateCloudSave()`
- `app/recovery.tsx` — `downloadSave()` + `migrateSave()` + `saveStrategy()`

**Priorité :** moyenne

---

### EC-S-06 — Fermeture app pendant écriture AsyncStorage

**Scénario :** `saveStrategy()` appelle `AsyncStorage.setItem()`. L'OS tue le processus à mi-écriture (pression mémoire, appel téléphonique sur certains Android).

**Risque :** Données partiellement écrites → JSON invalide au prochain lancement → EC-S-02.

**Comportement attendu :**
- AsyncStorage sur React Native est atomique par `setItem` sur la plupart des plateformes, mais ce n'est pas garanti sur tous les builds Android.
- Vérifier que la sauvegarde précédente est toujours lisible si l'écriture est interrompue.
- Mitigation possible : écrire d'abord dans une clé temporaire, puis renommer (swap atomique).

**Fichiers à vérifier :**
- `storage/strategyStorage.ts` — `saveStrategy()` → `AsyncStorage.setItem("@strategy_v1", ...)`

**Priorité :** **critique**

---

### EC-S-07 — PENDING_UPLOAD_KEY non nettoyé

**Scénario :** `scheduleUpload()` échoue (réseau), enregistre `PENDING_UPLOAD_KEY`. Au lancement suivant, `syncOnLaunch()` retente l'upload et réussit mais oublie de supprimer la clé (bogue hypothétique). Au lancement d'après, le cloud reçoit une ancienne sauvegarde.

**Risque :** Écrasement du cloud save plus récent par une sauvegarde obsolète (dernier-write-wins côté serveur).

**Comportement attendu :**
- `syncOnLaunch()` supprime `PENDING_UPLOAD_KEY` immédiatement après `uploadSaveWithToken()` réussie.
- La logique est en place (ligne `if (ok) await AsyncStorage.removeItem(PENDING_UPLOAD_KEY)`).

**Fichiers à vérifier :**
- `services/SyncService.ts` — `syncOnLaunch()`, étape 1 (retry pending upload)

**Priorité :** moyenne

---

### EC-S-08 — usedFallback = true (données partiellement perdues)

**Scénario :** `migrateSave()` lève une exception inattendue. La fonction catch construit `buildRecoveryFallback()` qui remet le joueur à l'état initial (money=2000, bâtiments=[]).

**Risque :** Le joueur perd toute sa progression. Aucun avertissement visible dans l'UI de base si `recovery.tsx` n'est pas affiché.

**Comportement attendu :**
- `saveStatus = "recovered"` doit déclencher l'affichage de `app/recovery.tsx`.
- `recovery.tsx` doit proposer : cloud restore (prioritaire), export diagnostic, nouvelle partie.
- Journaliser les `warnings[]` pour le support.

**Fichiers à vérifier :**
- `storage/saveMigrations.ts` — `buildRecoveryFallback()`
- `storage/strategyStorage.ts` — `saveStatus` flag
- `app/recovery.tsx`

**Priorité :** **forte**

---

### EC-S-09 — Migration chaîne incomplète (version > 3 dans une vieille app)

**Scénario :** Un joueur revient à une ancienne version de l'app (ex. APK sideloadé) alors que sa sauvegarde est en version 3. `isSaveCurrent()` retourne faux, `migrateSave()` détecte `startVersion=3` qui n'est pas < 1, 2 ou 3 → aucune migration → `sanitize` seul.

**Risque :** L'app peut crasher si le type `StrategyGameState` v2 ne contient pas les champs v3 (`cosmicInfluence`, `dailyLoginReward`).

**Comportement attendu :**
- La chaîne de migration ne doit jamais "rétrograder" une sauvegarde.
- Si `startVersion > CURRENT_SAVE_VERSION` : afficher un message "version non supportée" et bloquer l'usage.

**Fichiers à vérifier :**
- `storage/saveMigrations.ts` — `migrateSave()`, garde `if (startVersion < X)`

**Priorité :** faible

---

## 2. Offline (EC-O)

### EC-O-01 — Production offline > MAX_OFFLINE_MINUTES (1440 min)

**Scénario :** Le joueur revient après 30h d'absence. `MAX_OFFLINE_MINUTES = 1440` (24h). Le moteur de ressources plafonne la production à 24h même si l'absence réelle est plus longue.

**Risque :** Le joueur est confus : il pensait accumuler 30h de ressources mais n'en reçoit que 24h.

**Comportement attendu :**
- Afficher un message "Production limitée à 24h hors ligne — revenez plus souvent".
- Le plafond est affiché dans l'UI de collecte (ex. toast ou badge sur la nation).

**Fichiers à vérifier :**
- `logic/realTimeEngine.ts` ou équivalent — constante `MAX_OFFLINE_MINUTES`
- `app/nation.tsx` — affichage de la collecte offline

**Priorité :** moyenne

---

### EC-O-02 — MAX_ATTEMPTS atteint (5 tentatives échouées)

**Scénario :** Une invitation d'alliance est en queue depuis 7 jours avec 5 tentatives échouées (réseau indisponible, backoff de 300s atteint). L'item passe en statut `"failed"`.

**Risque :** L'invitation est silencieusement abandonnée. Le joueur pense l'avoir envoyée.

**Comportement attendu :**
- Statut `"failed"` visible dans un indicateur offline (ex. badge sur le profil joueur).
- Option "réessayer manuellement" dans le profil joueur ou les alliances.
- `getQueueSnapshot()` est disponible pour construire cet indicateur.

**Fichiers à vérifier :**
- `services/OfflineQueue.ts` — `MAX_ATTEMPTS=5`, `flushQueue()`, `isDefinitiveRejection()`
- `app/player-profile.tsx` — retour `"queued"` de `enqueueAllianceInvite()`

**Priorité :** **forte**

---

### EC-O-03 — pruneQueue() jamais appelé

**Scénario :** `pruneQueue()` est défini dans `OfflineQueue.ts` mais n'est pas câblé dans `_layout.tsx`. Les items `"success"` / `"failed"` de plus de 7j s'accumulent dans AsyncStorage `"offline_queue_v1"`.

**Risque :** AsyncStorage croît sans limite. Sur des appareils avec peu de stockage (≤ 512 MB), cela peut entraîner des échecs d'écriture pour la sauvegarde principale.

**Comportement attendu :**
- `pruneQueue()` appelé une fois par lancement, après `flushQueue()`.
- Optionnel : appel hebdomadaire en arrière-plan.

**Fichiers à vérifier :**
- `services/OfflineQueue.ts` — `pruneQueue()`
- `app/_layout.tsx` — point d'appel manquant

**Priorité :** moyenne

---

### EC-O-04 — flushQueue() non câblé au relancement

**Scénario :** `flushQueue()` est appelé dans `enqueueAllianceInvite()` immédiatement après l'enqueue. Mais il n'est **pas** appelé automatiquement dans `_layout.tsx` lors du retour en ligne ou du relancement. Les items en statut `"retrying"` ne sont jamais réessayés sauf si le joueur retente une nouvelle invitation.

**Risque :** Les invitations en queue (statut `"retrying"`) ne sont jamais envoyées si le joueur n'ouvre plus l'écran de profil joueur.

**Comportement attendu :**
- `flushQueue(accessToken)` appelé dans `onAuthenticated()` dans `AuthContext` ou dans `_layout.tsx` après `auth.isReady`.
- Le flush doit être déclenché aussi lors de la restauration du réseau (`NetInfo.addEventListener`).

**Fichiers à vérifier :**
- `context/AuthContext.tsx` — `onAuthenticated()` (flushQueue manquant)
- `app/_layout.tsx` — point de câblage manquant
- `services/OfflineQueue.ts` — `flushQueue()`

**Priorité :** **critique**

---

### EC-O-05 — Invitation alliance offline → jamais envoyée

**Scénario :** Le joueur clique "Inviter en alliance" sans réseau. `enqueueAllianceInvite()` enqueue l'item, appelle `flushQueue()` qui échoue, retourne `"queued"`. Sans câblage de `flushQueue()` au relancement (EC-O-04), l'invitation reste bloquée.

**Risque :** L'invitation n'arrive jamais. Le joueur voit `"queued"` sans feedback sur l'échec définitif après 5 tentatives.

**Comportement attendu :**
- Feedback visuel clair : "Invitation en attente d'envoi — sera envoyée lors du retour en ligne".
- Si `"failed"` après 5 tentatives : "Invitation non envoyée — réessayer".

**Fichiers à vérifier :**
- `app/player-profile.tsx` — `handleInvite()` → `enqueueAllianceInvite()`
- `services/OfflineQueue.ts` — `enqueueAllianceInvite()`

**Priorité :** **forte**

---

### EC-O-06 — spy_launch / cyber_launch "réservés" → succès fictif sans appel réseau

**Scénario :** `spy_launch` et `cyber_launch` sont listés comme types dans `OfflineQueue.ts` mais leur cas dans `executeItem()` retourne simplement `{ ok: true }` sans effectuer d'appel HTTP. Si `enqueueSpyLaunch()` ou `enqueueCyberLaunch()` étaient appelés, l'item serait marqué `"success"` sans jamais atteindre le serveur.

**Risque :** Opération d'espionnage ou de cyber silencieusement perdue. Le joueur croit avoir lancé l'op ; le serveur n'en sait rien.

**Comportement attendu :**
- Jusqu'au câblage complet : ne pas proposer l'enqueue de spy/cyber en offline.
- Afficher "Réseau requis pour cette opération" si hors ligne.
- Documenter clairement que ces types sont "réservés" et non fonctionnels.

**Fichiers à vérifier :**
- `services/OfflineQueue.ts` — `executeItem()`, cas `"spy_launch"` et `"cyber_launch"`
- `app/spy-ops.tsx`, `app/cyber-ops.tsx` — gestion offline

**Priorité :** **critique**

---

### EC-O-07 — Retour réseau : ordre de traitement concurrent

**Scénario :** À la reconnexion, `flushQueue()` (invitations), `syncOnLaunch()` (cloud save) et `retryPendingSubmission()` (classement) sont déclenchés en parallèle. Si tous trois écrivent dans AsyncStorage simultanément, des race conditions peuvent corrompre l'état.

**Risque :** `PENDING_UPLOAD_KEY` écrasé par `PENDING_SUBMIT_KEY` si les clés entrent en conflit (peu probable mais possible sur des appareils lents).

**Comportement attendu :**
- `onAuthenticated()` doit séquencer ces appels : d'abord `retryPendingSubmission()`, puis `flushQueue()`, puis `syncOnLaunch()`.
- Les clés AsyncStorage sont distinctes — pas de collision directe à ce stade.

**Fichiers à vérifier :**
- `context/AuthContext.tsx` — `onAuthenticated()`, ordre des appels

**Priorité :** faible

---

## 3. Classement (EC-C)

### EC-C-01 — _rankedIntended perdu après redémarrage

**Scénario :** Le joueur démarre une partie classée, joue 30 min, ferme l'app volontairement. `_rankedIntended` est `[MEM]` — réinitialisé à `false` au redémarrage. `RUN_META_KEY` existe encore dans AsyncStorage. Le journal continue d'être alimenté mais l'UI n'affiche plus "Mode Classé Actif".

**Risque :** Le joueur ne sait pas qu'il est encore en mode classé. Il peut lancer une nouvelle partie sans soumettre la partie en cours, la perdant définitivement.

**Comportement attendu :**
- Au lancement : `hasActiveRun()` lit `RUN_META_KEY` → si vrai, restaurer `_rankedIntended=true` et afficher le badge "Mode Classé".
- Ou : persister `_rankedIntended` dans AsyncStorage (séparé de `RUN_META_KEY`).

**Fichiers à vérifier :**
- `services/RankedService.ts` — `_rankedIntended`, `isRankedIntended()`, `hasActiveRun()`
- `app/index.tsx` — affichage du badge "Mode Classé"

**Priorité :** **critique**

---

### EC-C-02 — Score anti-cheat 50–79 (suspect) sans notification joueur

**Scénario :** Le joueur joue très vite (APM élevé) mais humainement possible (< 8/min). Score de confiance calculé à 65. La run est acceptée avec `suspect:true` pour revue manuelle. Le joueur ne le sait pas.

**Risque :** Si la revue manuelle rejette a posteriori, le joueur perd son score sans explication. Confusion et frustration.

**Comportement attendu :**
- Aucune notification côté client pour ne pas révéler les seuils anti-cheat.
- La politique est de ne pas bannir automatiquement — seule une revue manuelle peut agir.
- Documenter la politique dans les CGU.

**Fichiers à vérifier :**
- `services/RankedService.ts` — notes serveur V2, score de confiance 50–79

**Priorité :** faible

---

### EC-C-03 — HTTP 422 → clearRun() + perte de progression classée

**Scénario :** La run est soumise, le serveur répond 422 (confiance < 50 ou données impossibles). `clearRun()` efface `JOURNAL_KEY` et `RUN_META_KEY`. `_rankedIntended=false`.

**Risque :** La partie classée est définitivement perdue. Aucun moyen pour le joueur de contester ou de récupérer sa progression.

**Comportement attendu :**
- Afficher une page d'erreur explicite : "Soumission rejetée — la run n'a pas pu être validée".
- Ne jamais afficher "triche détectée" (faux positifs possibles).
- Conserver le score non classé (mode stratégie normal) comme consolation.

**Fichiers à vérifier :**
- `services/RankedService.ts` — `submitRankedRun()`, blocs `res.status === 422`
- `app/ranking.tsx` — gestion de l'erreur de soumission

**Priorité :** **critique**

---

### EC-C-04 — HTTP 409 (doublon) → clearRun() silencieux

**Scénario :** Le joueur soumet une run, reçoit un timeout réseau, le client crée `PENDING_SUBMIT_KEY`. Au lancement suivant, `retryPendingSubmission()` renvoie la même run. Le serveur répond 409 (déjà traitée). `PENDING_SUBMIT_KEY` est supprimé, pas d'erreur UI.

**Risque :** Le joueur ne sait pas que sa soumission avait déjà réussi la première fois. Il peut croire avoir perdu sa partie classée.

**Comportement attendu :**
- 409 = succès implicite (la run est déjà au classement).
- Afficher un message positif : "Partie déjà enregistrée au classement".

**Fichiers à vérifier :**
- `services/RankedService.ts` — `retryPendingSubmission()`, cas `res.status === 409`

**Priorité :** moyenne

---

### EC-C-05 — Soumission offline → PENDING_SUBMIT_KEY sans accessToken

**Scénario :** La partie se termine sans réseau. `submitRankedRun()` échoue sur le fetch. `PendingSubmit` est sauvegardé **intentionnellement sans `accessToken`** (JWT jamais persisté). Au relancement, `retryPendingSubmission()` reçoit un token frais de `AuthContext`.

**Risque :** Si `AuthContext` ne fournit pas de token frais avant l'appel à `retryPendingSubmission()`, la soumission échoue avec un 401 non fatal, restant en PENDING_SUBMIT_KEY indéfiniment.

**Comportement attendu :**
- `retryPendingSubmission(accessToken)` appelé uniquement dans `onAuthenticated()`, après vérification que `accessToken` est valide.
- Ne jamais appeler avec un token vide ou expiré.

**Fichiers à vérifier :**
- `services/RankedService.ts` — `retryPendingSubmission()`, `PendingSubmit` (pas de token)
- `context/AuthContext.tsx` — `onAuthenticated()` → `retryPendingSubmission(accessToken)`

**Priorité :** **forte**

---

### EC-C-06 — Rate-limit 429 (2ème run en < 23h)

**Scénario :** Le joueur soumet une run validée à 10h. Il relance immédiatement une nouvelle partie classée et la soumet à 12h. Le serveur répond 429.

**Risque :** La 2ème run est complètement perdue si `clearRun()` est appelé sur un 429 (comportement non documenté dans le code client pour ce code HTTP).

**Comportement attendu :**
- 429 ≠ 422/409 — ne pas appeler `clearRun()`.
- Conserver `PENDING_SUBMIT_KEY` et réessayer après la fenêtre 23h.
- Afficher : "Limite atteinte — réessayez dans X heures".

**Fichiers à vérifier :**
- `services/RankedService.ts` — `submitRankedRun()`, aucun cas `res.status === 429` actuellement

**Priorité :** **forte**

---

### EC-C-07 — Rate-limit device (3 comptes / device / 24h)

**Scénario :** Un joueur tente de soumettre avec 4 comptes différents depuis le même appareil en 24h. Le 4ème est bloqué côté serveur.

**Risque :** Le joueur légitime partageant un appareil (famille) est bloqué sans explication claire.

**Comportement attendu :**
- Afficher : "Limite de soumissions atteinte pour cet appareil".
- Ne pas présenter cela comme une détection de triche.

**Fichiers à vérifier :**
- `services/RankedService.ts` — notes serveur, "Rate-limit device"
- `services/SyncService.ts` — `DEVICE_ID_KEY` (utilisé pour identifier l'appareil)

**Priorité :** moyenne

---

### EC-C-08 — resource_snapshot_periodic absent du journal

**Scénario :** L'event `resource_snapshot_periodic` devrait être enregistré toutes les 5 minutes de jeu. Si le joueur joue sans que ce snapshot soit déclenché (session courte < 5 min, bug), le serveur attribue `-10` au score de confiance.

**Risque :** Score de confiance dégradé pour une run légitime courte (< 5 min de jeu), risquant de basculer de "acceptée" à "suspecte".

**Comportement attendu :**
- Le snapshot doit être enregistré au moins une fois, même si la session fait moins de 5 min (snapshot de fin de mandat).
- Vérifier que le ticker de 5 min est bien actif pendant le gameplay.

**Fichiers à vérifier :**
- `services/RankedService.ts` — `recordEvent("resource_snapshot_periodic", ...)`
- Moteur de jeu — ticker toutes les 5 min réelles

**Priorité :** moyenne

---

### EC-C-09 — APM > 8/min → rejet 422 dur (joueur rapide)

**Scénario :** Un joueur très expérimenté enchaîne les actions rapidement (ex. upgrade bâtiment + lancer recherche + opération en < 1 min). Si l'APM (events actifs / min) dépasse 8, le serveur rejette la run en 422.

**Risque :** Faux positif pour un joueur légitime expert. Run perdue via `clearRun()`.

**Comportement attendu :**
- Le seuil 8/min est calibré pour être physiquement impossible humainement selon la conception du jeu.
- Si des plaintes remontent, revoir le seuil ou exclure certains types d'events du calcul APM.
- `resource_snapshot_periodic` est déjà exclu du calcul (documenté dans les notes serveur).

**Fichiers à vérifier :**
- `services/RankedService.ts` — note "4. ACTIONS PAR MINUTE / APM"

**Priorité :** **critique**

---

## 4. Alliances (EC-A)

### EC-A-01 — 4ème alliance acceptée (bonus plafonné)

**Scénario :** Le joueur a déjà 3 alliances actives (bonus max 6% = 3 × 2%). Une 4ème invitation est acceptée.

**Risque :** Le bonus ne dépasse pas 6% mais l'UI pourrait afficher "4 alliances actives" sans expliquer que seules 3 comptent pour le bonus.

**Comportement attendu :**
- `computeAllianceBonuses()` : `count = Math.min(actives, 3)` → `rate = count × 0.02`.
- L'UI dans `app/alliances.tsx` doit indiquer clairement "Bonus actif : 3/3 alliances maximum".

**Fichiers à vérifier :**
- `services/AllianceService.ts` — `computeAllianceBonuses()`, `MAX_ALLIANCE_BONUS=0.06`
- `app/alliances.tsx` — encart bonus

**Priorité :** faible

---

### EC-A-02 — Invitation à soi-même (own player_id)

**Scénario :** Un joueur tente d'inviter son propre `player_id` en alliance (bug UI ou manipulation).

**Risque :** Boucle logique, bonus d'alliance avec soi-même, incohérence dans le classement.

**Comportement attendu :**
- `isOwnProfile = auth.user?.id === entry.player_id` → désactiver le bouton "Inviter en alliance".
- Côté serveur : rejeter les self-invitations avec 422.

**Fichiers à vérifier :**
- `app/player-profile.tsx` — `isOwnProfile`, boutons conditionnels
- `services/AllianceService.ts` — `inviteAlly()`

**Priorité :** moyenne

---

### EC-A-03 — Double invitation au même joueur (idempotence)

**Scénario :** Le joueur clique deux fois rapidement sur "Inviter en alliance". `enqueueAllianceInvite()` vérifie l'idempotence via l'`id = "alliance_invite:<targetPlayerId>"`.

**Risque :** Si la première invitation est `"success"` et qu'une 2ème est enqueued avec le même id, elle est ignorée (comportement correct). Mais si la première est encore `"retrying"`, la 2ème est aussi ignorée — comportement attendu.

**Comportement attendu :**
- Double-tap → seule une invitation envoyée (idempotence garantie).
- Confirmation visuelle immédiate dès le premier tap pour éviter les doubles clics.

**Fichiers à vérifier :**
- `services/OfflineQueue.ts` — `enqueue()`, garde `active = queue.some(...)`

**Priorité :** faible

---

### EC-A-04 — fetchAlliances() échoue au démarrage

**Scénario :** `app/ranking.tsx` appelle `fetchAlliances()` au mount. Si le serveur est indisponible, la liste est vide et `pendingAllianceCount` = 0, même si des invitations sont en attente.

**Risque :** Badge d'invitation invisible → le joueur rate des invitations.

**Comportement attendu :**
- Afficher un état "Impossible de charger les alliances" avec option de retry.
- Ne pas afficher 0 invitation si le chargement a échoué (distinguer "0 invitations" de "erreur réseau").

**Fichiers à vérifier :**
- `app/ranking.tsx` — `fetchAlliances()` + gestion d'erreur
- `services/AllianceService.ts` — `fetchAlliances()`

**Priorité :** **forte**

---

### EC-A-05 — respondToAlliance("break") en offline

**Scénario :** Le joueur rompt une alliance sans réseau. L'appel POST `/alliance-respond` échoue. L'alliance n'est pas enqueued dans `OfflineQueue` (le type `"alliance_respond"` n'existe pas).

**Risque :** L'alliance semble rompue localement mais reste active sur le serveur. Après reconnexion, le bonus d'alliance est toujours calculé côté serveur.

**Comportement attendu :**
- Afficher "Action impossible hors ligne — connectez-vous pour rompre l'alliance".
- Ou : ajouter `"alliance_respond"` comme type dans `OfflineQueue` (hors scope MODE DELTA).

**Fichiers à vérifier :**
- `app/alliances.tsx` — `respondToAlliance("break")`
- `services/AllianceService.ts` — `respondToAlliance()`

**Priorité :** moyenne

---

### EC-A-06 — FEATURES.enableAlliances = false

**Scénario :** Le feature flag `enableAlliances` est désactivé. L'UI des alliances est cachée dans `app/alliances.tsx`. Mais l'API `/alliance-invite` et `/alliance-respond` sont toujours accessibles si le joueur connaît les endpoints.

**Risque :** Feature incomplète exposée côté serveur sans protection.

**Comportement attendu :**
- Le serveur doit vérifier indépendamment si les alliances sont activées (flag serveur).
- Côté client : désactiver toutes les routes et boutons quand `FEATURES.enableAlliances=false`.

**Fichiers à vérifier :**
- `app/alliances.tsx` — `FEATURES.enableAlliances` guard
- Edge functions `/alliance-invite`, `/alliance-respond` — guards serveur

**Priorité :** faible

---

## 5. Espionnage (EC-E)

### EC-E-01 — Quota espion 2/24h dépassé

**Scénario :** Le joueur tente une 3ème opération espion dans la même fenêtre de 24h.

**Risque :** Rejet serveur (422 ou 429). Si le client ne gère pas ce code, l'UI peut afficher "Erreur" sans explication.

**Comportement attendu :**
- `app/spy-ops.tsx` doit afficher le quota restant (ex. "1 opération restante aujourd'hui").
- Sur rejet 422 : afficher "Quota atteint — réessayez demain".
- La limite est calculée côté serveur ; le client affiche une estimation basée sur `fetchSpyOps()`.

**Fichiers à vérifier :**
- `app/spy-ops.tsx` — `DefenseSection`, affichage quota 2/24h
- `services/SpyService.ts` (si existant) — `launchSpyOp()`

**Priorité :** **forte**

---

### EC-E-02 — Cooldown par cible (1 opération / cible / 24h)

**Scénario :** Le joueur tente d'espionner le même pays deux fois en 24h.

**Risque :** Le bouton n'est pas désactivé si le client ne calcule pas le cooldown localement.

**Comportement attendu :**
- Le cooldown par cible est visible dans l'UI (ex. grisage + "Disponible dans Xh").
- Calculé à partir des données de `fetchSpyOps()` (tri par `resolves_at` croissant).

**Fichiers à vérifier :**
- `app/spy-ops.tsx` — `countdownLabel()`, tri `pending` par `resolves_at`

**Priorité :** moyenne

---

### EC-E-03 — enqueueSpyLaunch() non câblé → succès fictif en offline

**Scénario :** Identique à EC-O-06 mais spécifique à l'espionnage. Si `enqueueSpyLaunch()` est appelé depuis `app/player-profile.tsx`, le type `"spy_launch"` retourne `{ok:true}` sans appel réseau.

**Risque :** Le joueur pense avoir lancé une opération d'espionnage. Aucune donnée sur le serveur. L'opération n'existe pas.

**Comportement attendu :**
- Bloquer le lancement d'espionnage si hors ligne : "Réseau requis pour lancer une opération d'espionnage".
- Ne pas appeler `enqueueSpyLaunch()` tant que le type n'est pas câblé dans `executeItem()`.

**Fichiers à vérifier :**
- `services/OfflineQueue.ts` — `executeItem()`, cas `"spy_launch"`
- `app/player-profile.tsx` — `handleSpy()` → `launchSpyOp()`

**Priorité :** **critique**

---

### EC-E-04 — resolves_at dépassé sans réouverture de l'app

**Scénario :** Une opération espion a `resolves_at` dans 2h. L'app reste ouverte en arrière-plan. Le joueur revient 3h plus tard sans rouvrir l'app. `fetchSpyOps()` n'est pas rappelé automatiquement.

**Risque :** L'opération est affichée comme "en cours" alors qu'elle est résolue côté serveur.

**Comportement attendu :**
- `fetchSpyOps()` rappelé à chaque focus de l'écran `app/spy-ops.tsx` (`useEffect` sur `navigation.isFocused()`).
- Ou : vérifier localement si `resolves_at < Date.now()` et afficher "Résultat disponible" avec un CTA "Actualiser".

**Fichiers à vérifier :**
- `app/spy-ops.tsx` — `fetchSpyOps()` au mount vs au focus

**Priorité :** **forte**

---

### EC-E-05 — fetchSpyOps() échoue → liste vide, quota non affiché

**Scénario :** Réseau indisponible. `fetchSpyOps()` retourne une liste vide. Le quota 2/24h n'est pas affiché. Le joueur ne sait pas combien d'opérations il lui reste.

**Risque :** Le joueur tente une opération et est rejeté par le serveur pour quota atteint.

**Comportement attendu :**
- Distinguer "0 opérations" de "erreur réseau" dans l'UI.
- Afficher "Données indisponibles — réseau requis" si `fetchSpyOps()` échoue.

**Fichiers à vérifier :**
- `app/spy-ops.tsx` — gestion d'erreur de `fetchSpyOps()`

**Priorité :** moyenne

---

## 6. Cyberattaque (EC-Y)

### EC-Y-01 — enqueueCyberLaunch() non câblé → succès fictif en offline

**Scénario :** Identique à EC-E-03 pour la cyberattaque. Le type `"cyber_launch"` dans `OfflineQueue.executeItem()` retourne `{ok:true}` sans appel réseau.

**Risque :** Le joueur pense avoir lancé une cyberattaque. Aucun effet côté serveur. Le `pending_debuff_pct` de la cible n'est pas affecté.

**Comportement attendu :**
- Bloquer le lancement cyber si hors ligne.
- Afficher : "Réseau requis pour lancer une cyberattaque".

**Fichiers à vérifier :**
- `services/OfflineQueue.ts` — `executeItem()`, cas `"cyber_launch"`
- `services/CyberService.ts` — `launchCyberOp()`
- `app/player-profile.tsx` — `handleCyber()` → `launchCyberOp()`

**Priorité :** **critique**

---

### EC-Y-02 — pending_debuff_pct non réinitialisé après résolution

**Scénario :** Une cyberattaque est résolue côté serveur. Le `CyberOpsResult` retourné par `fetchCyberOps()` contient `pending_debuff_pct`. Si l'app ne rappelle pas `fetchCyberOps()` après résolution, le debuff s'affiche encore.

**Risque :** Le joueur pense subir un debuff qui est terminé, ou ne sait pas qu'il subit encore un debuff actif.

**Comportement attendu :**
- `fetchCyberOps()` rappelé au focus de l'écran cyber.
- `pending_debuff_pct = 0` après résolution → affichage neutre.

**Fichiers à vérifier :**
- `services/CyberService.ts` — `fetchCyberOps()`, `CyberOpsResult`
- `app/cyber-ops.tsx` (si existant)

**Priorité :** moyenne

---

### EC-Y-03 — Lancement cyber pendant partie classée → absence dans journal

**Scénario :** Le joueur lance une cyberattaque. Si aucun `recordEvent("operation_result", ...)` n'est appelé pour cette action dans le journal classé, la cohérence des ressources dépensées devient incorrecte.

**Risque :** La vérification `impossible_resources` côté serveur peut déclencher un flag suspect ou un rejet 422.

**Comportement attendu :**
- Chaque cyberattaque lancée pendant une partie classée doit générer un `operation_result` dans le journal.
- Vérifier que `recordEvent()` est appelé dans le flow `launchCyberOp()`.

**Fichiers à vérifier :**
- `services/RankedService.ts` — `recordEvent("operation_result", ...)`
- `services/CyberService.ts` — `launchCyberOp()`

**Priorité :** forte

---

### EC-Y-04 — Double-tap "Lancer cyberattaque" sans protection commandId

**Scénario :** Le joueur appuie deux fois rapidement sur le bouton de lancement. Si `commandId` n'est pas utilisé pour les cyberattaques (contrairement aux upgrades et recherches), deux appels POST `/cyber-launch` partent.

**Risque :** Double dépense de ressources + deux opérations lancées sur la même cible.

**Comportement attendu :**
- Désactiver le bouton immédiatement après le premier tap.
- Ou utiliser `useCommand` + `commandId("cyber_launch", targetPlayerId)`.

**Fichiers à vérifier :**
- `app/player-profile.tsx` — `handleCyber()`, présence / absence de `useCommand`
- `utils/useCommand.ts` (si existant)

**Priorité :** forte

---

## 7. Missions (EC-M)

### EC-M-01 — Missions expirées + generateDailyMissions() non encore appelé

**Scénario :** `missionsExpired()` retourne `true` (missions[0].assignedAt < now - 6h). Le joueur ouvre l'écran missions. Si `generateDailyMissions()` n'est pas appelé immédiatement, l'écran affiche une liste vide ou des missions expirées.

**Risque :** Le joueur voit une liste vide et croit qu'il n'y a pas de missions disponibles. Il attend au lieu de jouer.

**Comportement attendu :**
- À chaque chargement de l'écran missions : si `missionsExpired()`, appeler `generateDailyMissions(getCurrentDayIndex())` et sauvegarder.
- L'écran ne doit jamais afficher de missions expirées sans les renouveler.

**Fichiers à vérifier :**
- `logic/missionEngine.ts` — `missionsExpired()`, `generateDailyMissions()`
- `app/missions.tsx` (si existant) — logique de renouvellement

**Priorité :** **forte**

---

### EC-M-02 — generateDailyMissions() appelé deux fois le même dayIndex

**Scénario :** Deux appels simultanés (ex. double navigation vers l'écran missions) génèrent deux sets de missions pour le même `dayIndex`.

**Risque :** Le joueur voit 6 missions au lieu de 3, ou les anciennes missions complétées sont réinitialisées.

**Comportement attendu :**
- Vérifier si des missions existent déjà pour le jour courant avant de générer.
- Ou : utiliser `useCommand` / un verrou dans le contexte pour éviter la double génération.

**Fichiers à vérifier :**
- `logic/missionEngine.ts` — `generateDailyMissions()`
- `context/StrategyContext.tsx` — point d'appel

**Priorité :** moyenne

---

### EC-M-03 — Mission "spy_country" en offline (spy non câblé)

**Scénario :** Le joueur a la mission "Espionner un pays". Il tente de l'accomplir hors ligne. `launchSpyOp()` échoue. La mission n'est pas comptabilisée (`checkMissionProgress()` écoute l'event `spy_country` qui n'est pas émis).

**Risque :** La mission est impossible à accomplir hors ligne, bloquant la progression quotidienne.

**Comportement attendu :**
- Indiquer "Réseau requis" sur les missions de type `spy_country` et `reinforce_defense` si hors ligne.
- Ne pas générer ces missions si le joueur est détecté hors ligne (hors scope pour l'instant).

**Fichiers à vérifier :**
- `logic/missionEngine.ts` — `checkMissionProgress()`, type `"spy_country"`
- `app/player-profile.tsx` — gestion offline de `handleSpy()`

**Priorité :** moyenne

---

### EC-M-04 — Mission "win_operation" sans opération disponible pour le type requis

**Scénario :** La mission demande "Remporter une opération `cyber_blockade`". Mais le pays sélectionné n'a pas cette opération disponible (`canLaunchOperation()` retourne faux).

**Risque :** Mission impossible à accomplir. Le joueur est bloqué pendant 6h.

**Comportement attendu :**
- `pickDailyMissions()` doit vérifier que les `operationType` générés sont réalisables dans le pays courant.
- Fallback : générer une mission sans `operationType` spécifique si aucune n'est disponible.

**Fichiers à vérifier :**
- `data/missions.ts` — `pickDailyMissions()`
- `logic/missionEngine.ts` — `checkMissionProgress()`, type `"win_operation"`

**Priorité :** moyenne

---

### EC-M-05 — assignedAt corrompu → faux positif permanent sur missionsExpired()

**Scénario :** Suite à une migration (EC-S-01), `missions[0].assignedAt` est `0` ou `NaN`. `missionsExpired()` retourne `true` à chaque appel. `generateDailyMissions()` est appelé en boucle, réinitialisant les missions complétées.

**Risque :** Le joueur ne peut jamais conserver ses missions complétées. Perte de progression quotidienne.

**Comportement attendu :**
- `sanitize()` dans `saveMigrations.ts` doit vérifier `missions[].assignedAt` et corriger les valeurs invalides (ex. : `Date.now() - MISSION_DURATION_MS / 2` pour les reconnaître comme "encore valides").
- `missionsExpired()` : si `assignedAt === 0` → considérer comme expirées une seule fois et regénérer.

**Fichiers à vérifier :**
- `storage/saveMigrations.ts` — `sanitize()`, validation du tableau `missions`
- `logic/missionEngine.ts` — `missionsExpired()`

**Priorité :** **forte**

---

### EC-M-06 — clockNow() déphasé après changement de fuseau horaire

**Scénario :** Le joueur voyage et change le fuseau horaire de son téléphone. `clockNow()` retourne un timestamp différent. `getCurrentDayIndex()` calcule un `dayIndex` différent → nouvelles missions générées alors que le joueur a déjà joué aujourd'hui.

**Risque :** Le joueur peut farmer les missions en changeant le fuseau horaire.

**Comportement attendu :**
- `clockNow()` doit utiliser `Date.now()` (UTC, non affecté par le fuseau horaire) plutôt que l'heure locale.
- Vérifier l'implémentation de `simulationClock.ts`.

**Fichiers à vérifier :**
- `logic/simulationClock.ts` — `clockNow()`
- `logic/missionEngine.ts` — `getCurrentDayIndex()`

**Priorité :** moyenne

---

## 8. Recherches (EC-R)

### EC-R-01 — Double-tap "Lancer recherche" (commandId)

**Scénario :** Le joueur clique deux fois rapidement sur "Lancer" pour une recherche. `useCommand` + `commandId("start_research", id)` protège contre le doublon.

**Risque :** Si la protection fonctionne, le 2ème tap affiche un toast "Action en cours…". Comportement correct, mais à vérifier en test réel.

**Comportement attendu :**
- Toast "Action en cours…" sur le 2ème tap.
- Une seule recherche lancée.

**Fichiers à vérifier :**
- `app/strategy-research.tsx` — `handleLaunch(id)` → `run(commandId("start_research", id), ...)`

**Priorité :** faible

---

### EC-R-02 — Recherche en cours après fermeture d'app

**Scénario :** Le joueur lance une recherche et ferme l'app. À la réouverture, la bannière `inProgress` doit être visible dans `app/strategy-research.tsx`.

**Risque :** Si l'état de recherche n'est pas persisté correctement dans `strategyResearch`, la bannière disparaît et le joueur ne sait pas que sa recherche est en cours.

**Comportement attendu :**
- `strategyResearch.inProgressId` est persisté dans `"@strategy_v1"` (partie de `StrategyGameState`).
- À la réouverture : `inProgress` calculé depuis l'état sauvegardé.
- La bannière affiche le temps restant.

**Fichiers à vérifier :**
- `app/strategy-research.tsx` — bannière `inProgress`
- `types/strategyResearch.ts` — structure de `StrategyResearchState`

**Priorité :** forte

---

### EC-R-03 — Toutes les 15 recherches complétées

**Scénario :** Le joueur a complété les 15 recherches disponibles. L'écran `app/strategy-research.tsx` n'a plus rien à afficher.

**Risque :** Écran vide sans explication. Le joueur peut penser à un bug.

**Comportement attendu :**
- Message "Toutes les recherches sont complétées — félicitations !" avec un récapitulatif des bonus obtenus.
- Ou : icône de trophée et état final verrouillé.

**Fichiers à vérifier :**
- `app/strategy-research.tsx` — état quand toutes les recherches sont complètes
- `data/strategyResearch.ts` — liste des 15 recherches

**Priorité :** faible

---

### EC-R-04 — Lancement recherche sans ressources suffisantes

**Scénario :** Le joueur clique "Lancer" pour une recherche coûteuse alors que ses ressources sont insuffisantes.

**Risque :** `handleLaunch()` appelle `startResearch()` qui doit rejeter l'action. Si la validation n'est que côté contexte (pas d'UI préventive), le joueur peut cliquer et ne voir qu'un toast d'erreur.

**Comportement attendu :**
- Désactiver le bouton "Lancer" si les ressources sont insuffisantes (validation visible).
- Afficher le coût en rouge si le joueur n'a pas assez.

**Fichiers à vérifier :**
- `app/strategy-research.tsx` — état du bouton selon les ressources
- `context/StrategyContext.tsx` — `startResearch()`, validation des ressources

**Priorité :** moyenne

---

### EC-R-05 — research_completed sans event research_started dans journal classé

**Scénario :** La recherche était déjà en cours quand le joueur a activé le mode classé. `research_completed` est enregistré mais `research_started` est absent du journal.

**Risque :** Côté serveur : "Absence de started pour un completed → flag suspect (vieux client)". Si plus de 3 cas → score confiance -5 supplémentaire.

**Comportement attendu :**
- Au démarrage d'une partie classée : enregistrer un `research_started` pour toute recherche déjà en cours.
- Ou : le serveur doit tolérer les recherches pré-existantes en ne pénalisant pas leur `completed`.

**Fichiers à vérifier :**
- `services/RankedService.ts` — `recordEvent("research_started", ...)`, notes serveur contrôle 3
- `app/index.tsx` ou `context/StrategyContext.tsx` — `startRankedRun()`, snapshot initial

**Priorité :** forte

---

## 9. Unités (EC-U)

### EC-U-01 — collectTraining() appelé avant endsAt

**Scénario :** Le joueur essaie de collecter des unités avant la fin de l'entraînement. `endsAt` est dans le futur.

**Risque :** Si la validation est uniquement visuelle (bouton désactivé), une manipulation de l'horloge système ou un bug d'affichage peut permettre une collecte prématurée.

**Comportement attendu :**
- `collectTraining()` dans `context/StrategyContext.tsx` doit vérifier `endsAt < Date.now()` côté logique, pas seulement dans l'UI.
- Toast d'erreur si appelé trop tôt.

**Fichiers à vérifier :**
- `context/StrategyContext.tsx` — `collectTraining()`, validation temporelle
- `app/forces-armees.tsx` — état du bouton "Collecter"

**Priorité :** forte

---

### EC-U-02 — Priorité d'affichage endsAtGameHour vs endsAt ms

**Scénario :** L'entraînement d'une unité a `endsAtGameHour` et `endsAt`. `formatRemaining()` dans `app/forces-armees.tsx` utilise `endsAtGameHour` en priorité, puis `endsAt` en ms. Si les deux sont incohérents (bug de migration), le temps affiché est erroné.

**Risque :** Le joueur voit un temps restant incorrect. Il peut attendre plus longtemps que nécessaire ou penser qu'une unité est prête trop tôt.

**Comportement attendu :**
- La logique de priorité `endsAtGameHour > endsAt` doit être cohérente avec la source de vérité de `trainUnit()`.
- La migration v1→v2 (`playerUnits: []`, `trainingQueue: []`) repart de zéro — pas d'unités orphelines.

**Fichiers à vérifier :**
- `app/forces-armees.tsx` — `formatRemaining()`
- `context/StrategyContext.tsx` — `trainUnit()`, structure de `trainingQueue`

**Priorité :** moyenne

---

### EC-U-03 — trainUnit() sans ressources suffisantes

**Scénario :** Le joueur lance un entraînement dont le coût dépasse ses ressources actuelles.

**Risque :** Débit négatif non contrôlé si la validation manque (ressources < 0).

**Comportement attendu :**
- Bouton "Entraîner" désactivé si ressources insuffisantes.
- `trainUnit()` valide les ressources avant débit.
- `sanitize()` dans les migrations remet à 0 les ressources négatives (filet de sécurité).

**Fichiers à vérifier :**
- `context/StrategyContext.tsx` — `trainUnit()`, validation des ressources
- `storage/saveMigrations.ts` — `sanitize()`, ressources ≥ 0

**Priorité :** moyenne

---

### EC-U-04 — Entraînement en cours pendant migration v1→v2

**Scénario :** Un joueur avait une ancienne version de l'app avec un système d'entraînement différent (avant `trainingQueue`). La migration v1→v2 initialise `trainingQueue: []` et `playerUnits: []`, perdant les unités en cours d'entraînement.

**Risque :** Unités en cours d'entraînement perdues après mise à jour.

**Comportement attendu :**
- La migration v1→v2 ajoute uniquement les champs manquants sans écraser.
- Si `trainingQueue` existait dans v1 sous un autre nom, le migrer.
- Documenter que la perte d'unités en cours est attendue lors de la migration initiale v1→v2.

**Fichiers à vérifier :**
- `storage/saveMigrations.ts` — `migrateV1ToV2()`, champs `trainingQueue`, `playerUnits`

**Priorité :** faible

---

### EC-U-05 — unit_training_completed sans started dans journal classé

**Scénario :** L'entraînement d'une unité a démarré avant le mode classé. `unit_training_completed` est enregistré mais `unit_training_started` est absent.

**Risque :** Même risque qu'EC-R-05. Contrôle 3 anti-cheat : absence de started → flag suspect.

**Comportement attendu :**
- Enregistrer un `unit_training_started` synthétique au démarrage de la partie classée pour les entraînements en cours.
- Ou : exclure les entraînements pré-existants du calcul de durée.

**Fichiers à vérifier :**
- `services/RankedService.ts` — `recordEvent("unit_training_started", ...)`, notes serveur contrôle 3

**Priorité :** forte

---

## 10. Journal de Crise (EC-J)

### EC-J-01 — MAX_LOG = 30 atteint

**Scénario :** Le joueur a joué intensément. `news.log` atteint 30 entrées. La 31ème action devrait écraser la plus ancienne.

**Risque :** Si la rotation n'est pas implémentée, le log grossit sans limite. Si elle est implémentée, le joueur peut perdre de vieilles dépêches sans indication.

**Comportement attendu :**
- Rotation FIFO : la 31ème entrée supprime la 1ère.
- Un compteur "X dépêches archivées" est affiché (total, pas seulement les 30 visibles).
- Le filtre par type doit fonctionner sur les 30 entrées actuelles.

**Fichiers à vérifier :**
- `logic/newsEngine.ts` — `MAX_LOG=30`, logique de rotation
- `app/journal-crise.tsx` — affichage `news.log.length`

**Priorité :** **forte**

---

### EC-J-02 — pendingInteractive avec event non trouvé dans NEWS_EVENT_MAP

**Scénario :** `state.news.pendingIds` contient un `id` qui n'existe pas dans `NEWS_EVENT_MAP` (event retiré dans une mise à jour, ou sauvegarde corrompue).

**Risque :** `pendingInteractive.map((id) => NEWS_EVENT_MAP[id]).filter(Boolean)` filtre les `undefined`, mais l'`id` reste dans `pendingIds`. Si `dismissNews()` n'est jamais appelé, l'id fantôme persiste.

**Comportement attendu :**
- Nettoyer `pendingIds` au chargement : supprimer les ids absents de `NEWS_EVENT_MAP`.
- Ou : dans `dismissNews()`, supprimer l'id même si l'event est inconnu.

**Fichiers à vérifier :**
- `app/journal-crise.tsx` — `pendingInteractive` useMemo, `filter(Boolean)`
- `context/StrategyContext.tsx` — `dismissNews()`, `markNewsRead()`
- `data/newsEvents.ts` — `NEWS_EVENT_MAP`

**Priorité :** moyenne

---

### EC-J-03 — markNewsRead() jamais appelé

**Scénario :** Le joueur ne visite jamais `app/journal-crise.tsx`. `news.unreadCount` monte sans jamais être remis à 0. Le badge "non lu" sur la navigation est toujours rouge.

**Risque :** Pas de bug fonctionnel, mais UX dégradée : le joueur peut ignorer le badge et rater des décisions critiques.

**Comportement attendu :**
- Le badge doit clairement distinguer les décisions interactives urgentes des simples dépêches non lues.
- `pendingInteractive.length > 0` → badge rouge critique (décision requise).
- `unreadCount > 0` → badge neutre.

**Fichiers à vérifier :**
- `app/journal-crise.tsx` — `useEffect(() => markNewsRead(), [])`
- `app/nation.tsx` — badge sur le NAV_ITEM `/journal-crise`

**Priorité :** faible

---

### EC-J-04 — resolveInteractiveNews sur event déjà résolu

**Scénario :** Le joueur a deux appareils ouverts. Il résout un event sur l'appareil A. Sur l'appareil B, l'event est encore affiché (pas de sync temps réel). Il choisit une option.

**Risque :** `resolveInteractiveNews()` est appelé deux fois pour le même `eventId`. Les effets (changements d'indicateurs) sont appliqués deux fois.

**Comportement attendu :**
- `resolveInteractiveNews()` doit vérifier que l'event est encore dans `pendingIds` avant d'appliquer les effets.
- Idempotence : si l'event n'est plus pending, ignorer silencieusement.

**Fichiers à vérifier :**
- `context/StrategyContext.tsx` — `resolveInteractiveNews()`
- `app/journal-crise.tsx` — `onChoose()` dans `InteractiveNewsModal`

**Priorité :** forte

---

### EC-J-05 — MINOR_NEWS et MAJOR_NEWS au même tick (action 12, 24, 36…)

**Scénario :** `MINOR_NEWS_EVERY = 4`, `MAJOR_NEWS_EVERY = 12`. À l'action n°12 (et 24, 36...), les deux conditions sont vraies simultanément.

**Risque :** Deux news sont générées au même tick. Si le moteur les traite séquentiellement, la 2ème peut remplacer la 1ère dans `pendingIds` ou créer un doublon dans `log`.

**Comportement attendu :**
- Définir une priorité : si `MAJOR_NEWS_EVERY` est vrai, ignorer `MINOR_NEWS_EVERY` ce tick.
- Ou : permettre les deux, mais s'assurer que le log FIFO les gère correctement.

**Fichiers à vérifier :**
- `logic/newsEngine.ts` — `MINOR_NEWS_EVERY`, `MAJOR_NEWS_EVERY`, logique de génération par `actionCount`

**Priorité :** moyenne

---

## 11. Achat (EC-P)

### EC-P-01 — Achat en offline (RevenueCat + serveur non joignables)

**Scénario :** Le joueur tente d'acheter un pack sans réseau. RevenueCat SDK retourne une erreur. `fetchCustomerInfo()` retourne `null`. `fetchBackendEntitlements()` retourne `null`.

**Risque :** `serverOnline = false` → `realPacks = readVerifiedCache()`. Si le cache SecureStore est valide (< 30j), les packs déjà achetés sont affichés. L'achat n'est pas possible sans réseau.

**Comportement attendu :**
- Désactiver le bouton d'achat si `!serverOnline`.
- Afficher "Achat impossible hors ligne — vos achats précédents restent disponibles".
- Les packs du cache SecureStore continuent de fonctionner.

**Fichiers à vérifier :**
- `lib/entitlements.ts` — `refresh()`, `serverOnline`
- `lib/purchases.ts` — `fetchCustomerInfo()`

**Priorité :** moyenne

---

### EC-P-02 — Cache SecureStore expiré (> 30j) + serveur inaccessible

**Scénario :** Le joueur n'a pas ouvert l'app depuis 31 jours. Il ouvre l'app hors ligne. `readVerifiedCache()` retourne `[]` (cache expiré). `serverOnline = false`. `realPacks = []`. `useLocalGrants = true` → `stored.packs` (AsyncStorage) utilisé.

**Risque :** Sur appareil non rooté, seuls les packs dans `AsyncStorage` + `FREE_PACKS` sont disponibles. Si `AsyncStorage` a été effacé (réinstallation, nettoyage), le joueur perd l'accès à ses achats jusqu'à la reconnexion.

**Comportement attendu :**
- Afficher un message "Connexion requise pour vérifier vos achats après 30 jours d'absence".
- Ne jamais prétendre que les packs sont expirés (ils ne le sont pas — la grâce est la durée du cache).
- À la reconnexion : `refresh()` restaure tout immédiatement.

**Fichiers à vérifier :**
- `lib/entitlements.ts` — `GRACE_PERIOD_MS=30j`, `readVerifiedCache()`, logique offline

**Priorité :** **critique**

---

### EC-P-03 — Appareil rooté → AsyncStorage grants ignorés

**Scénario :** Sur un appareil rooté (natif + serveur accessible), `useLocalGrants = false`. `stored.packs` (AsyncStorage) est ignoré même si le joueur y a ajouté manuellement des packs.

**Risque :** Faux positif : un joueur légitime qui a eu un bug d'AsyncStorage corrigé par `grantLocal()` en debug perd ses packs au prochain lancement si le serveur confirme qu'il n'y a pas d'achat.

**Comportement attendu :**
- Ce comportement est intentionnel (protection anti-root).
- La documentation doit préciser que `grantLocal()` est uniquement pour le debug/web.
- Support : si un joueur légitime perd ses packs, la source de vérité est le backend RevenueCat webhook.

**Fichiers à vérifier :**
- `lib/entitlements.ts` — `useLocalGrants`, commentaire explicatif

**Priorité :** **forte**

---

### EC-P-04 — Achat doublé (même pack acheté deux fois)

**Scénario :** Le joueur achète "guerre_hybride" deux fois (bug UI ou double-tap sur le bouton d'achat).

**Risque :** Double facturation. RevenueCat gère normalement l'idempotence des achats, mais l'app doit aussi désactiver le bouton après confirmation.

**Comportement attendu :**
- Désactiver le bouton d'achat immédiatement après le premier tap.
- Après `refresh()` confirmant le pack actif : masquer le bouton d'achat pour ce pack.
- RevenueCat SDK gère la non-duplication côté store (Apple / Google).

**Fichiers à vérifier :**
- `lib/purchases.ts` — gestion du flow d'achat
- Écran boutique (non identifié dans cette session)

**Priorité :** moyenne

---

### EC-P-05 — writeVerifiedCache non appelé si realPacks.length = 0

**Scénario :** Le serveur répond OK mais `backendPacks = []` et `rcPacks = []` (le joueur n'a rien acheté). `serverOnline = true`, `realPacks = []`. La condition `if (realPacks.length > 0)` est fausse → `writeVerifiedCache()` n'est pas appelé.

**Risque :** Le cache SecureStore conserve l'ancienne valeur (packs de l'ancien compte ou packs expirés). Si le joueur se déconnecte et se reconnecte avec un compte sans achat, les anciens packs du cache persistent jusqu'à leur expiration naturelle (30j).

**Comportement attendu :**
- `writeVerifiedCache([])` devrait être appelé même quand `realPacks` est vide, pour invalidater un cache obsolète.
- Ou : effacer le cache si `serverOnline && realPacks.length === 0`.

**Fichiers à vérifier :**
- `lib/entitlements.ts` — `refresh()`, condition `if (realPacks.length > 0)` avant `writeVerifiedCache`

**Priorité :** **forte**

---

### EC-P-06 — Restaurer achats → pack déjà actif localement

**Scénario :** Le joueur appuie sur "Restaurer les achats". `fetchCustomerInfo()` retourne les mêmes packs que ceux déjà dans `packs`. `refresh()` est appelé et recalcule la même valeur.

**Risque :** Aucun bug — comportement idempotent. Mais le joueur peut penser que la restauration a échoué si aucun feedback n'est affiché.

**Comportement attendu :**
- Afficher "Achats restaurés avec succès" même si rien n'a changé.
- Afficher la liste des packs restaurés.

**Fichiers à vérifier :**
- `lib/entitlements.ts` — `refresh()`
- Écran boutique — bouton "Restaurer les achats"

**Priorité :** faible

---

*Fin du catalogue — 49 cas limites documentés.*

| Catégorie | Cas total | Critique | Forte | Moyenne | Faible |
|-----------|-----------|----------|-------|---------|--------|
| Sauvegarde | 9 | 2 | 3 | 3 | 1 |
| Offline | 7 | 3 | 2 | 1 | 1 |
| Classement | 9 | 3 | 3 | 2 | 1 |
| Alliances | 6 | 0 | 2 | 2 | 2 |
| Espionnage | 5 | 1 | 2 | 2 | 0 |
| Cyberattaque | 4 | 1 | 2 | 1 | 0 |
| Missions | 6 | 0 | 3 | 3 | 0 |
| Recherches | 5 | 0 | 3 | 1 | 1 |
| Unités | 5 | 0 | 3 | 2 | 0 |
| Journal | 5 | 0 | 2 | 2 | 1 |
| Achat | 6 | 1 | 3 | 2 | 0 |
| **Total** | **67** | **11** | **28** | **21** | **7** |
