# Backlog Produit Priorisé — Président : Nation en Crise

> MODE DELTA — documentation pure. Aucune modification de code.
> Dernière mise à jour : 2026-05-19.

---

## Méthode de notation

Chaque item est noté sur 10 pour 4 axes :

| Axe | Signification |
|-----|--------------|
| **VJ** | Valeur Joueur — impact direct sur l'expérience et la rétention |
| **VB** | Valeur Business — revenu, crédibilité store, données |
| **R** | Risque Technique — probabilité de régression, complexité serveur, edge cases |
| **C** | Complexité — effort estimé de développement (1 = heure, 10 = semaines) |

**Score de priorité = (VJ + VB) − (R + C) / 2**

Un score positif élevé = fort retour sur investissement. Les dépendances peuvent élever une priorité indépendamment du score.

---

## Vue d'ensemble du backlog

| Code | Titre | VJ | VB | R | C | Score | Priorité |
|------|-------|----|----|---|---|-------|----------|
| BL-01 | Correction cas limites critiques (pre-pub) | 8 | 9 | 4 | 4 | **13.0** | P0 |
| BL-02 | Publication store iOS + Android | 10 | 10 | 6 | 7 | **13.5** | P0 |
| BL-03 | Push notifications enrichies | 9 | 9 | 4 | 5 | **13.5** | P0 |
| BL-04 | Récompense quotidienne V2 | 8 | 8 | 2 | 3 | **13.5** | P0 |
| BL-05 | DLC moments de crise (guerre hybride + cyber) | 6 | 9 | 3 | 5 | **11.0** | P1 |
| BL-06 | Équilibrage progression (funScore → joueur) | 8 | 7 | 3 | 4 | **11.5** | P1 |
| BL-07 | Espionnage suivi V2 + câblage offline | 7 | 7 | 6 | 6 | **8.0** | P1 |
| BL-08 | Anti-triche client (events manquants) | 5 | 8 | 5 | 5 | **8.0** | P1 |
| BL-09 | Profils joueurs V2 (stats, historique) | 7 | 6 | 5 | 6 | **7.5** | P2 |
| BL-10 | Chat V2 (pagination, badges, filtre) | 7 | 6 | 5 | 6 | **7.5** | P2 |
| BL-11 | Auroria / Obscurium V2 (quêtes narratives) | 7 | 5 | 4 | 5 | **7.5** | P2 |
| BL-12 | Classement PVP enrichi (badges, trophées) | 6 | 5 | 4 | 5 | **6.5** | P2 |
| BL-13 | Alliances bonus V2 (types, effets narratifs) | 6 | 5 | 6 | 7 | **4.5** | P3 |
| BL-14 | Télémétrie → Analytics backend | 1 | 8 | 4 | 5 | **4.5** | P3 |
| BL-15 | Simulateur d'équilibrage (outil interne) | 0 | 7 | 3 | 4 | **3.5** | P3 |

---

## Top 10 des priorités

---

### BL-01 — Correction des cas limites critiques (pre-publication)

**Valeur joueur :** 8 | **Valeur business :** 9 | **Risque :** 4 | **Complexité :** 4 | **Score : 13.0**

**Contexte code :**
`docs/edge_cases.md` recense 11 cas critiques. Les 4 plus urgents avant publication :
- EC-O-04 : `flushQueue()` non câblé dans `app/_layout.tsx` → invitations jamais renvoyées au relancement
- EC-O-06 : `spy_launch` / `cyber_launch` dans `OfflineQueue.executeItem()` retournent `{ok:true}` sans appel réseau
- EC-C-01 : `_rankedIntended [MEM]` perdu après redémarrage → badge mode classé disparu
- EC-S-06 : Fermeture app pendant `AsyncStorage.setItem()` → JSON potentiellement corrompu

**Valeur :** Bloque la publication. Une app avec des données perdues silencieusement obtient des avis 1 étoile le premier jour.

**Comportement attendu :** Zéro perte de données silencieuse sur les flux principaux.

**Fichiers clés :**
- `app/_layout.tsx` — câbler `flushQueue(accessToken)` dans `onAuthenticated()`
- `services/OfflineQueue.ts` — implémenter les exécuteurs `spy_launch` et `cyber_launch`
- `services/RankedService.ts` — restaurer `_rankedIntended` depuis `RUN_META_KEY` au lancement

**Dépendances :** Aucune — prérequis de tout le reste.

**Priorité finale : P0 — Critique**

---

### BL-02 — Publication store iOS + Android

**Valeur joueur :** 10 | **Valeur business :** 10 | **Risque :** 6 | **Complexité :** 7 | **Score : 13.5**

**Contexte code :**
Infrastructure prête : `EXPO_PROJECT_ID = "8ae12bcb-3626-4971-a816-e0fd7949214f"` configuré dans `hooks/usePushNotifications.ts`. RevenueCat SDK intégré dans `lib/purchases.ts`. `CURRENT_SAVE_VERSION = 3` stable. Feature flags `enableGlobalLeaderboard`, `enableAlliances`, `enableSpyOps`, `enableCyberOps` tous à `true`.

**Valeur :** Seul vecteur de revenu réel. Débloque les IAP (BL-05) et la télémétrie réelle (BL-14).

**Risques :**
- Review Apple : mention des fonctionnalités réseau, politique de modération du chat
- Review Google : politique de classement et anti-triche à documenter
- Compliance : RGPD pour `TelemetryService.ts` (données en local seulement — point positif)
- `enableDevStats: __DEV__` doit être vérifié pour être false en production

**Checklist pré-soumission :**
- [ ] BL-01 corrigé
- [ ] `__DEV__` guards vérifiés (aucun écran debug en prod)
- [ ] Screenshots 6.7" iPhone + tablette Android
- [ ] Privacy Policy mentionnant Supabase, RevenueCat, télémétrie locale
- [ ] App Store Connect : in-app purchases configurés (climate gratuit, guerre_hybride + cyber payants)

**Dépendances :** BL-01 (cas limites critiques)

**Priorité finale : P0 — Critique**

---

### BL-03 — Push notifications enrichies

**Valeur joueur :** 9 | **Valeur business :** 9 | **Risque :** 4 | **Complexité :** 5 | **Score : 13.5**

**Contexte code :**
`hooks/usePushNotifications.ts` enregistre le token Expo Push auprès de `/push-register`. L'infrastructure d'envoi est côté serveur (Edge Function). Actuellement, aucun trigger de notification n'est implémenté en production.

**Notifications à implémenter :**

| Trigger | Message | Délai |
|---------|---------|-------|
| Mission terminée (endsAt) | "Vos troupes sont prêtes — collectez votre entraînement" | À endsAt |
| Alliance invitation reçue | "X vous invite en alliance diplomatique" | Immédiat |
| Op espion résolue | "Rapport d'espionnage disponible sur [pays]" | À resolves_at |
| Classement — soumission en attente | "Votre partie classée attend d'être soumise" | +1h après fin de partie |
| Récompense quotidienne disponible | "Votre bonus quotidien est prêt" | 24h après dernier claim |

**Valeur :** Les jeux mobile perdent 60–70 % de leurs joueurs en semaine 1. Les push de rappel contextuel sont le principal levier de rétention sans nouveaux contenus.

**Risques :**
- Sur-notification → désabonnement push → pire que pas de notifications
- Limiter à 2 notifications/jour/joueur maximum côté serveur

**Fichiers clés :**
- `hooks/usePushNotifications.ts` — token déjà enregistré
- Edge Function `/push-register` + nouveau `/push-trigger`
- `services/RankedService.ts` — trigger soumission en attente

**Dépendances :** BL-02 (store publié pour les permissions natives)

**Priorité finale : P0 — Critique**

---

### BL-04 — Récompense quotidienne V2 (UI streak + animations)

**Valeur joueur :** 8 | **Valeur business :** 8 | **Risque :** 2 | **Complexité :** 3 | **Score : 13.5**

**Contexte code :**
`dailyLoginReward` est entièrement implémenté dans `context/StrategyContext.tsx` :
- `isDailyRewardReady()` → `getNextReward()` → `getNextStreak()`
- Persisté dans `StrategyGameState.dailyLoginReward` (`lastLoginRewardAt`, `currentStreak`, `totalDaysClaimed`)
- Intégré dans `app/nation.tsx` (trigger au mount)

**Ce qui manque :** UI dédiée. Le joueur voit une ressource s'ajouter sans comprendre la raison ni voir sa streak.

**UI proposée :**
- Modale au lancement (si récompense disponible) : "Jour X de votre série" + animation de ressources distribuées + bouton "Récupérer"
- Badge sur l'icône nation si récompense disponible
- Calendrier de streak visible dans le profil ou la nation (7 prochains jours)
- Bonification visible à partir du jour 7 (ex. : ×1.5 ressources)

**Valeur :** Rétention D1 → D7. Un joueur qui comprend sa streak revient pour la conserver.

**Fichiers clés :**
- `context/StrategyContext.tsx` — logique déjà en place
- `app/nation.tsx` — point d'entrée du trigger
- Nouveau composant `DailyRewardModal.tsx` (UI seulement)

**Dépendances :** Aucune.

**Priorité finale : P0 — Critique**

---

### BL-05 — DLC Moments de crise (guerre hybride + cyber — contenu complet)

**Valeur joueur :** 6 | **Valeur business :** 9 | **Risque :** 3 | **Complexité :** 5 | **Score : 11.0**

**Contexte code :**
`lib/entitlements.ts` : `ALL_PACKS = ["climate", "guerre_hybride", "cyber"]`. `FREE_PACKS = {"climate"}`. Les packs `guerre_hybride` et `cyber` sont dans `RevenueCat` et `EXPO_PUBLIC_SUPABASE`. `app/shop.tsx` affiche des `ComingSoonPack` pour ces deux packs. L'architecture IAP est complète (RevenueCat webhook → backend → SecureStore 30j).

**Ce qui manque :** Le contenu (événements, pays, scénarios) pour ces packs. L'infrastructure d'achat est prête.

**Contenu requis par pack :**
- `guerre_hybride` : 15+ événements interactifs, 2-3 pays jouables supplémentaires, système de propagande
- `cyber` : 12+ événements cyber-diplomatiques, nouveaux types d'opérations, variantes crises cyber

**Valeur :** Revenu IAP direct. Chaque pack vendu 0,99–2,99€. La base de joueurs du pack `climate` (gratuit) devient la cible d'upsell.

**Risques :**
- Qualité du contenu : les événements doivent être au niveau du pack climate
- Équilibrage : les packs ne doivent pas créer une asymétrie pay-to-win

**Fichiers clés :**
- `data/events.ts` — nouveaux événements par pack
- `data/newsEvents.ts` — nouvelles dépêches interactives
- `app/shop.tsx` — retirer le `ComingSoonPack` quand le contenu est prêt

**Dépendances :** BL-02 (store publié)

**Priorité finale : P1 — Forte**

---

### BL-06 — Équilibrage progression (funScore visible joueur)

**Valeur joueur :** 8 | **Valeur business :** 7 | **Risque :** 3 | **Complexité :** 4 | **Score : 11.5**

**Contexte code :**
`logic/funScoreEngine.ts` calcule un score 0–100 sur 7 composantes (progression, recentRewards, availableActions, activeCrisis, missionMomentum, activityVariety, waitPressure). `logic/economyHealthEngine.ts` diagnostique la santé économique avec 5 indices. Ces moteurs sont fonctionnels mais visibles uniquement dans `app/dev-stats.tsx` (gated derrière `__DEV__`).

**Ce qui manque :** Exposer les signaux au joueur sous forme de hints contextuels non intrusifs.

**Implémentation proposée :**
- Si `funScore < 30` et `waitPressure > 10` : hint discret "Vos bâtiments attendent une amélioration" sur nation.tsx
- Si `availableActions = 0` : suggestion dans la barre de navigation "Mission disponible" ou "Opération possible"
- Si `economyHealth.diagnosis === "récession"` : alert dans Journal de Crise (event automatique)
- Ne jamais afficher le score brut au joueur — seulement des suggestions métier

**Valeur :** Réduit l'abandon par frustration ("je ne sais pas quoi faire"). Ne nécessite pas de nouveau contenu.

**Fichiers clés :**
- `logic/funScoreEngine.ts` — `computeFunScore()`, `computeFunFactors()`
- `logic/economyHealthEngine.ts` — `computeEconomyHealth()`
- `app/nation.tsx` — afficher des hints conditionnels
- `app/journal-crise.tsx` — générer un event automatique si récession

**Dépendances :** Aucune.

**Priorité finale : P1 — Forte**

---

### BL-07 — Espionnage suivi V2 + câblage offline

**Valeur joueur :** 7 | **Valeur business :** 7 | **Risque :** 6 | **Complexité :** 6 | **Score : 8.0**

**Contexte code :**
`app/spy-ops.tsx` : tri par `resolves_at` croissant, `countdownLabel()`, `blockedReasonLabel()`. `app/player-profile.tsx` : `handleSpy(opType)` → `launchSpyOp()`. `services/OfflineQueue.ts` : `spy_launch` réservé mais `executeItem()` retourne `{ok:true}` sans appel réseau (EC-E-03, EC-O-06).

**Ce qui manque :**

1. **Câblage offline** (prérequis de BL-01) : implémenter `executeItem("spy_launch")` avec vrai POST `/spy-launch`
2. **Historique enrichi** : afficher dans `app/spy-ops.tsx` le résultat de chaque op (gain d'intelligence, contremesures déclenchées)
3. **Suivi par cible** : badge sur le profil d'un pays déjà espionné ("Dernière op : il y a 2h")
4. **Cooldown visible** : chronomètre par cible dans `app/player-profile.tsx`

**Valeur :** Core loop multiplayer différenciant. Un joueur qui voit ses ops progresser revient vérifier les résultats.

**Risques :**
- Câblage offline : la route serveur `/spy-launch` doit être idempotente (même op soumise deux fois)
- Quotas : vérifier côté client avant enqueue pour éviter des rejets 422 silencieux

**Fichiers clés :**
- `services/OfflineQueue.ts` — `executeItem("spy_launch")` à implémenter
- `app/spy-ops.tsx` — `fetchSpyOps()`, affichage résultat
- `app/player-profile.tsx` — `handleSpy()`, badge cooldown

**Dépendances :** BL-01 (EC-O-06 et EC-E-03 corrigés)

**Priorité finale : P1 — Forte**

---

### BL-08 — Anti-triche client (events manquants dans le journal classé)

**Valeur joueur :** 5 | **Valeur business :** 8 | **Risque :** 5 | **Complexité :** 5 | **Score : 8.0**

**Contexte code :**
`services/RankedService.ts` documente l'anti-triche V2 côté serveur (11 contrôles, score de confiance 0–100). Plusieurs events sont enregistrés dans `context/StrategyContext.tsx`. Events manquants identifiés (de `docs/edge_cases.md`) :

- **EC-R-05** : `research_completed` sans `research_started` pour les recherches en cours avant le mode classé → -5 confiance serveur
- **EC-U-05** : `unit_training_completed` sans `unit_training_started` → même pénalité
- **EC-C-08** : `resource_snapshot_periodic` absent sur sessions < 5 min → -10 confiance
- **Cyberattaque** (EC-Y-03) : `launchCyberOp()` ne génère pas de `operation_result` dans le journal

**Ce qui manque :**
- Au démarrage d'une partie classée : snapshot des recherches et entraînements en cours → enregistrer les `*_started` correspondants
- Trigger `resource_snapshot_periodic` au minimum une fois en fin de partie si session < 5 min
- `launchCyberOp()` → `recordEvent("operation_result", ...)` après succès

**Valeur :** Évite les faux positifs anti-triche pour des joueurs légitimes. Un rejet 422 injuste = perte de confiance + avis négatif.

**Fichiers clés :**
- `context/StrategyContext.tsx` — `startRankedRun()`, snapshot initial des états en cours
- `services/RankedService.ts` — `recordEvent("resource_snapshot_periodic", ...)`
- `services/CyberService.ts` — `launchCyberOp()` → trigger `recordEvent`

**Dépendances :** BL-01 (classement fonctionnel)

**Priorité finale : P1 — Forte**

---

### BL-09 — Profils joueurs V2 (stats enrichies, historique des runs)

**Valeur joueur :** 7 | **Valeur business :** 6 | **Risque :** 5 | **Complexité :** 6 | **Score : 7.5**

**Contexte code :**
`app/player-profile.tsx` reçoit `entry` via `JSON.parse(params.entry)`. Affiche : `display_name`, `globalPower`, `rankingPoints`, boutons Inviter/Espionner/Cyber. `isOwnProfile = auth.user?.id === entry.player_id`.

**Ce qui manque :**

1. **Stats de carrière** : total runs, meilleur score classé, taux de succès des ops, alliances actives
2. **Historique des parties classées** : liste des 5 dernières soumissions avec score, pays, doctrine
3. **Badges de réussite** : affichage des achievements débloqués (système `achievements[]` déjà dans `StrategyGameState`)
4. **Vue propre** : l'écran actuel sur son propre profil devrait afficher plus de données que sur le profil d'un autre joueur

**Valeur :** Engagement social — un joueur qui voit sa progression entre sessions est plus fidèle.

**Backend requis :**
- `GET /player-stats?player_id=X` → stats de carrière agrégées
- `GET /player-runs?player_id=X&limit=5` → historique des runs classées

**Fichiers clés :**
- `app/player-profile.tsx` — enrichir l'affichage
- `app/ranking.tsx` — lien vers son propre profil enrichi

**Dépendances :** BL-02 (données réelles de production nécessaires pour valider la structure)

**Priorité finale : P2 — Moyenne**

---

### BL-10 — Chat V2 (pagination, badges, filtre par langue)

**Valeur joueur :** 7 | **Valeur business :** 6 | **Risque :** 5 | **Complexité :** 6 | **Score : 7.5**

**Contexte code :**
`app/chat.tsx` : `fetchChat()`, `sendChatMessage()`, `reportMessage()`. Quota : 10 messages/24h, cooldown 30s. `MAX_LENGTH = 200`. Modération par filtre de contenu côté serveur. Chargement initial uniquement (pas de polling).

**Ce qui manque :**

1. **Badge non-lus** : le joueur ne sait pas qu'il y a de nouveaux messages depuis sa dernière visite → badge sur l'icône chat dans `app/ranking.tsx`
2. **Pagination** : chargement des 50 derniers messages uniquement, FlatList avec `onEndReached` pour l'historique
3. **Filtre langue** : toggle FR/EN/Tout (la majorité des joueurs sont francophones)
4. **Rafraîchissement automatique** : polling toutes les 30s pendant que l'écran est ouvert (sans WebSocket)
5. **Mention** : `@display_name` dans un message → highlight pour le destinataire

**Valeur :** Social proof — un chat actif signal que le jeu a une communauté.

**Fichiers clés :**
- `app/chat.tsx` — pagination + polling
- `services/ChatService.ts` — `fetchChat()` avec `since` timestamp
- `app/ranking.tsx` — badge non-lus

**Dépendances :** BL-02 (joueurs réels nécessaires pour tester le chat)

**Priorité finale : P2 — Moyenne**

---

## 5 idées à repousser (post v1.1)

---

### BL-11 — Auroria / Obscurium V2 (quêtes narratives et événements cosmiques)

**VJ :** 7 | **VB :** 5 | **R :** 4 | **C :** 5 | **Score : 7.5**

**Pourquoi repousser :**
Le système existe (`app/entities.tsx`, `computeAuroriaScore()`, `computeObscuriumScore()`, events `cosmic_*` dans `data/newsEvents.ts`). L'écran est accessible via `app/nation.tsx` NAV_ITEMS. Les scores sont calculés dynamiquement depuis les indicateurs nationaux.

Repousser parce que :
- **Niche** : seuls les joueurs avancés (mandatDay > 30) découvrent naturellement les forces cosmiques
- **Contenu** : le mystère fonctionne uniquement si les événements cosmiques sont nombreux et variés — contenu lourd
- **Dépend de la base joueur** : mesurer combien de joueurs atteignent `discovered = true` en v1 avant d'investir

**Trigger de déprogrammation :** Si < 20 % des joueurs v1 déclenchent un event `cosmic_*`, repenser l'accès.

---

### BL-12 — Classement PVP enrichi (badges, trophées, historique)

**VJ :** 6 | **VB :** 5 | **R :** 4 | **C :** 5 | **Score : 6.5**

**Pourquoi repousser :**
`app/ranking-pvp.tsx` affiche déjà `pvp_points`, `spy_ops_success`, `cyber_ops_success`, `alliances_formed`. La structure est fonctionnelle.

Repousser parce que :
- **Chicken-and-egg** : un classement PVP est motivant seulement avec 500+ joueurs actifs
- **Enrichissement cosmétique** : les badges et trophées nécessitent une UI de profil robuste (BL-09) d'abord
- **Faible urgence** : le classement v1 suffit pour la publication

**Trigger de déprogrammation :** Lancer BL-12 quand le DAU dépasse 1 000 et que les métriques montrent un engouement pour le classement PVP.

---

### BL-13 — Alliances bonus V2 (types d'alliances, effets narratifs)

**VJ :** 6 | **VB :** 5 | **R :** 6 | **C :** 7 | **Score : 4.5**

**Pourquoi repousser :**
`services/AllianceService.ts` est cohérent et stable : `ALLIANCE_BONUS_PER_ACTIVE = 0.02`, `MAX_ALLIANCE_BONUS = 0.06`, `computeAllianceBonuses()` propre. `respondToAlliance()` gère accept/reject/break.

Repousser parce que :
- **Complexité élevée** : types d'alliances (militaire, économique, culturel) = nouvelle table Supabase + backend + migration
- **Risque de regression** : modifier AllianceService casse les alliances v1 existantes
- **Valeur marginale** : le système v1 est équilibré, le v2 est une amélioration de profondeur

---

### BL-14 — Télémétrie → Analytics backend (flushTelemetry activé)

**VJ :** 1 | **VB :** 8 | **R :** 4 | **C :** 5 | **Score : 4.5**

**Pourquoi repousser :**
`services/TelemetryService.ts` stocke les événements en local (buffer 200 max). `flushTelemetry()` est un stub explicitement documenté "non activé". 14 types d'événements sont déjà capturés.

Repousser parce que :
- **Inutile avant la production réelle** : les données dev/bêta sont du bruit
- **RGPD** : activer l'envoi nécessite mise à jour de la Privacy Policy et consentement
- **Pas urgent** : les premières semaines post-lancement, les avis store + crash reports (Sentry) sont plus utiles que la télémétrie custom

**Trigger de déprogrammation :** Activer dès que 100 utilisateurs actifs sont atteints, avec consentement opt-in.

---

### BL-15 — Simulateur d'équilibrage (outil interne)

**VJ :** 0 | **VB :** 7 | **R :** 3 | **C :** 4 | **Score : 3.5**

**Pourquoi repousser :**
`logic/funScoreEngine.ts` et `logic/economyHealthEngine.ts` sont déjà accessibles dans `app/dev-stats.tsx` en mode `__DEV__`. Un simulateur externe (script Node.js ou Jupyter) pourrait analyser des parties enregistrées pour détecter les déséquilibres.

Repousser parce que :
- **Outil interne** : n'affecte pas directement les joueurs
- **Données insuffisantes** : le simulateur ne sera utile qu'avec des données de parties réelles (post-lancement)
- **Faisable manuellement** : `dev-stats.tsx` répond aux besoins d'équilibrage pendant la phase bêta

---

## 5 idées à refuser

---

### REFUSE-01 — Chat temps réel (WebSocket / Supabase Realtime)

**Pourquoi refuser :**
`app/chat.tsx` fonctionne en polling REST. Passer à `Realtime` (WebSocket Supabase) introduirait :
- **Coût** : connexions persistantes = coût Supabase × 100 joueurs simultanés
- **Modération** : les messages temps réel nécessitent une modération < 1s (impossible sans IA intégrée)
- **Instabilité** : reconnexions WebSocket sur mobile en cas de changement réseau = état de chat corrompu

Le polling toutes les 30s (prévu dans BL-10) offre 95 % de la valeur pour 5 % de la complexité.

---

### REFUSE-02 — Système de clans / guildes

**Pourquoi refuser :**
Les alliances (3 max, bonus simple) existent déjà. Les clans seraient un doublon plus complexe :
- Membership persistant + rôles (chef, officier, membre) = 3 nouvelles tables Supabase
- Dons entre membres = risque d'exploitation (ressources infinies par transfert)
- Guerre de clans = PVP organisé non compatible avec le gameplay async actuel

Refuser définitivement — si la demande sociale émerge, étendre les alliances plutôt que créer un système parallèle.

---

### REFUSE-03 — Replay de parties classées

**Pourquoi refuser :**
Le journal classé (`JOURNAL_KEY`) enregistre les événements mais pas l'état complet du jeu à chaque tick. Un replay fidèle nécessiterait :
- Snapshot complet de `StrategyGameState` à chaque action (~50–200 KB × N actions) = stockage serveur excessif
- Déterminisme parfait du moteur de jeu (non garanti avec `clockNow()` réel)

Refuser — le journal classé est conçu pour l'anti-triche, pas pour le replay.

---

### REFUSE-04 — PVP direct en temps réel (2 joueurs simultanés)

**Pourquoi refuser :**
Le jeu est architecturalement asynchrone : `StrategyContext`, `AsyncStorage`, timers réels, offline queue. Un mode synchrone nécessiterait :
- Moteur de jeu entièrement réécrit avec état partagé serveur
- Matchmaking (salle d'attente, timeout, reconnexion)
- Latence : `REAL_MS_PER_GAME_DAY = 6h` incompatible avec un adversaire en temps réel

Refuser — le modèle async (espionnage, cyber, alliances) est la bonne approche pour ce genre.

---

### REFUSE-05 — IA générative côté client (génération d'événements GPT)

**Pourquoi refuser :**
Le jeu a déjà un système d'événements riche (15 événements interactifs confirmés, `NEWS_EVENT_MAP`, moteur de news avec `MINOR_NEWS_EVERY` / `MAJOR_NEWS_EVERY`). Ajouter une IA générative côté client introduirait :
- **Coût API** : 1 000 joueurs × 5 events/session = 5 000 appels API/jour → facturation significative
- **Latence** : attendre une réponse LLM pendant une crise = UX dégradée
- **Instabilité** : les sorties LLM peuvent briser le format attendu par `InteractiveNewsModal`
- **Hors gameplay** : le contenu éditorial (événements curatés) est un avantage concurrentiel

Si IA = objectif, l'intégrer côté serveur dans la génération des événements éditoriaux, pas côté client en runtime.

---

## Roadmap suggérée

```
Semaine 1–2   BL-01  Correction cas limites critiques
Semaine 3–4   BL-04  Récompense quotidienne V2 (UI streak)
Semaine 4–6   BL-08  Anti-triche client (events manquants)
Semaine 6–8   BL-02  Publication store iOS + Android
──────────────── LANCEMENT V1.0 ────────────────────────────
Mois 2        BL-03  Push notifications enrichies
Mois 2        BL-06  Équilibrage progression (funScore hints)
Mois 3        BL-07  Espionnage suivi V2 + câblage offline
Mois 3        BL-05  DLC guerre hybride (contenu)
Mois 4        BL-09  Profils joueurs V2
Mois 4        BL-05  DLC cyber (contenu)
Mois 5        BL-10  Chat V2 (pagination, badges)
──────────────── V1.1 ──────────────────────────────────────
Post-lancement BL-11  Auroria / Obscurium V2  (si metric > 20%)
Post-lancement BL-12  Classement PVP enrichi  (si DAU > 1 000)
Post-lancement BL-14  Télémétrie → Analytics  (si DAU > 100)
Post-lancement BL-13  Alliances bonus V2      (si demande forte)
```

---

## Index des dépendances

```
BL-01 ─┬─► BL-02 ─┬─► BL-03
        │          ├─► BL-05
        │          ├─► BL-09
        │          ├─► BL-10
        │          └─► BL-14
        ├─► BL-07
        └─► BL-08

BL-04  (indépendant — peut démarrer immédiatement)
BL-06  (indépendant — peut démarrer immédiatement)
```

---

*Fin du backlog — 15 items scorés, 10 top priorités, 5 à repousser, 5 à refuser.*
