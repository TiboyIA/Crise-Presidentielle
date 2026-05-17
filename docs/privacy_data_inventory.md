# Inventaire des données & conformité stores — Président : Nation en Crise

## Principes fondamentaux

- Compte **anonyme par défaut** — pas d'email ni de nom réel requis
- Le pseudonyme (`display_name`) est choisi librement par le joueur, uniquement pour le mode classé et le chat
- Aucune collecte de localisation, contacts, photos, caméra, micro, ou identifiant publicitaire
- Aucun SDK analytics tiers branché (TelemetryService = buffer local uniquement, `flushTelemetry()` est un stub non activé)
- Les JWT (access tokens) ne sont jamais persistés en clair — SecureStore ou mémoire uniquement
- Toutes les communications client ↔ serveur sont chiffrées (HTTPS/TLS)

---

## 1. Données envoyées à Supabase

### 1.1 Compte joueur (Supabase Auth)

| Donnée | Type | Quand collectée | Table / stockage |
|--------|------|-----------------|-----------------|
| `user.id` | UUID généré automatiquement | Création du compte anonyme (1er lancement) | `auth.users` |
| Email | Adresse e-mail Google ou Apple | Uniquement si le joueur **lie volontairement** son compte Google/Apple | `auth.users` |

L'email n'est jamais affiché à d'autres joueurs. Il sert uniquement à restaurer la progression en cas de réinstallation.

---

### 1.2 Profil joueur (table `players`)

| Donnée | Type | Quand collectée |
|--------|------|-----------------|
| `id` | UUID (= `user.id`) | Enregistrement de l'appareil |
| `display_name` | Pseudonyme choisi | Première run classée |
| `push_token` | Token Expo (`ExponentPushToken[...]`) | Si le joueur **accepte** les notifications push |

---

### 1.3 Appareil (table `devices`)

Collecté à chaque lancement, lors de `registerDevice()` dans `SyncService`.

| Donnée | Type | Exemple |
|--------|------|---------|
| `platform` | "ios" ou "android" | "ios" |
| `os_version` | Version de l'OS | "17.4" |
| `app_version` | Version de l'app | "1.0.0" |
| `device_id` | UUID serveur (anti-triche) | `a3f8…` (stocké localement dans AsyncStorage `sync_device_id_v1`) |
| `last_seen` | Timestamp serveur | — |

Ces données servent exclusivement à l'anti-triche (mode classé) et au support technique. Elles ne sont jamais utilisées à des fins publicitaires.

---

### 1.4 Sauvegarde cloud (table `saves`)

| Donnée | Type | Note |
|--------|------|------|
| État de la partie | Objet JSON (max 500 Ko) | Indicateurs, ressources, bâtiments, recherches — **aucune PII** |
| `saveVersion` | Entier (1–10) | Version du schéma |
| `saveChecksum` | Hash djb2 (8 chars hex) | Détection de corruption — non secret |
| `saved_at` | Timestamp assigné côté serveur | — |

---

### 1.5 Mode classé

**`/ranked-start`** — démarrage d'une run :

| Donnée | Type |
|--------|------|
| `countryId` | Identifiant du pays joué |
| `doctrine` | Doctrine choisie |
| `displayName` | Pseudonyme |

**`/ranked-submit`** — soumission en fin de partie :

| Donnée | Type | Note |
|--------|------|------|
| `runId` | UUID | Identifiant de la run |
| `events[]` | Journal de décisions de gameplay | Séquences de choix, timings — **aucune PII** |
| `finalIndicators` | Scores des jauges (0–100) | popularité, économie, sécurité, écologie, cohésion |
| `mandateDays` | Entier | Durée du mandat |
| `journalHash` | Hash djb2 | Intégrité du journal |
| `deviceId` | UUID interne | Anti-triche |
| `appVersion` | String | Anti-triche |

**Classement public** (`leaderboard_entries`) — visible par tous les joueurs :

`display_name`, `country_id`, `doctrine`, `score`, `mandate_days`, `rank_title`, `global_power`, `season`

Le `player_id` est présent dans la table mais n'est pas exposé dans les réponses de l'API classement.

---

### 1.6 Alliances (table `alliances`)

| Donnée | Type |
|--------|------|
| `initiator_id` | UUID du joueur invitant |
| `target_id` | UUID du joueur cible |
| `status` | pending / active / rejected / broken |
| `created_at`, `expires_at` | Timestamps serveur |

---

### 1.7 Espionnage (table `spy_ops`)

| Donnée | Type |
|--------|------|
| `attacker_id` | UUID du joueur attaquant |
| `target_id` | UUID de la cible |
| `op_type` | intel_probe / doctrine_scan / score_range |
| `result_json` | Statistiques publiques partielles de la cible (pays, doctrine ou fourchette de score) |

Les résultats d'espionnage n'exposent que des données de jeu agrégées (fourchettes), jamais d'informations personnelles.

---

### 1.8 Cyberattaque (table `cyber_ops`)

| Donnée | Type |
|--------|------|
| `attacker_id` | UUID |
| `target_id` | UUID |
| `magnitude` | Impact (2–5 %, tiré aléatoirement côté serveur) |
| `status`, `created_at`, `resolves_at` | Timestamps serveur |

---

### 1.9 Chat (table `chat_messages`)

| Donnée | Type | Limites |
|--------|------|---------|
| `content` | Message texte | Max 200 caractères ; filtre liste noire côté serveur |
| `player_id` | UUID | Lié au compte |
| `display_name` | Pseudonyme | Visible publiquement |
| `season`, `created_at` | Entier / timestamp serveur | — |

Les messages sont publics (visibles de tous les joueurs connectés). Le joueur consent implicitement à la publication dès l'envoi.

---

### 1.10 Notifications push (table `players`)

| Donnée | Type | Condition |
|--------|------|-----------|
| `push_token` | `ExponentPushToken[…]` | Uniquement si le joueur **accepte** la permission système |

La permission est demandée à l'exécution (`requestPermissionsAsync()`). Le token est validé côté serveur (doit commencer par `ExponentPushToken[`). Les notifications sont utilisées pour les événements multijoueur (résolution d'alliance, espionnage, cyberattaque).

---

## 2. Données envoyées à RevenueCat

RevenueCat est le prestataire de gestion des achats in-app. Le SDK utilise **exclusivement la clé publique** (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`). La clé secrète n'est jamais dans l'app.

| Donnée | Type | Quand |
|--------|------|-------|
| `app_user_id` | UUID Supabase du joueur | Après connexion (`Purchases.logIn(userId)`) |
| Historique d'achats | Géré par App Store / Google Play | Lors d'un achat ou d'une restauration |
| Identifiants internes RC | UUID RC anonyme initial | Initialisation du SDK |

RevenueCat reçoit également les reçus d'achat directement depuis App Store / Google Play (flux RevenueCat ↔ store, pas client → RC directement).

Voir la politique de confidentialité RevenueCat : https://www.revenuecat.com/privacy

---

## 3. Données uniquement locales — jamais envoyées au serveur

| Donnée | Clé de stockage | Stockage | Nature |
|--------|----------------|---------|--------|
| État de partie actuel | `@strategy_v1` | AsyncStorage | Données de jeu, aucune PII |
| Cache entitlements | `entitlements_verified_cache_v1` | **SecureStore** (chiffré) | Liste des packs achetés, TTL 30 jours |
| Cache bonus slots | `@bonus_save_slots_v1` | AsyncStorage | Booléen (cache UI uniquement) |
| Buffer télémétrie | `@telemetry_buffer_v1` | AsyncStorage | Événements gameplay anonymes (max 200), `sessionId` non persisté |
| Journal ranked en cours | `ranked_journal_v1` | AsyncStorage | Décisions de gameplay, aucune PII |
| Run meta ranked | `ranked_run_meta_v1` | AsyncStorage | `runId`, `seed`, `startedAt` |
| Soumission en attente | `ranked_pending_submit_v1` | AsyncStorage | Run à envoyer — **JWT exclu** |
| Upload sauvegarde en attente | `sync_pending_upload_v1` | AsyncStorage | Sauvegarde à uploader (réseau indisponible) |
| Device ID serveur | `sync_device_id_v1` | AsyncStorage | UUID anti-triche reçu du serveur |

**Télémétrie** : le `sessionId` est généré aléatoirement à chaque lancement et n'est **pas persisté**. Il n'est pas lié au compte joueur. `flushTelemetry()` est un stub — aucun envoi serveur n'est implémenté ni activé.

---

## 4. Classification des données

### Données liées au compte (linked to user)

Ces données sont associées à l'`user.id` sur le serveur :

- `display_name`
- `push_token`
- `platform`, `os_version`, `app_version`
- État de la partie (sauvegarde cloud)
- Historique des runs classées et journal d'événements
- Relations d'alliance, opérations d'espionnage et cyberattaque
- Messages de chat
- Entitlements (packs achetés)

### Données techniques non personnalisées

- `device_id` (UUID interne, anti-triche, non exposé dans l'UI)
- `journalHash`, `saveChecksum` (hashes d'intégrité, non secrets, non PII)

### Ce qui n'est jamais collecté

- Localisation (GPS, réseau, IP stockée)
- Contacts
- Photos, vidéos, caméra, microphone
- Identifiant publicitaire (IDFA / GAID)
- Données biométriques
- Données de navigation web ou d'autres apps
- Nom réel (seul le pseudonyme choisi est utilisé)
- Email (sauf si le joueur lie Google/Apple — optionnel)

---

## 5. Finalités du traitement

| Finalité | Données impliquées |
|----------|-------------------|
| **Fonctionnement de l'app** | `user.id`, `platform`, `os_version`, `app_version`, `device_id`, `push_token` |
| **Sauvegarde de progression** | État de partie, `saveVersion`, `saveChecksum`, `saved_at` |
| **Classement mondial** | `display_name`, `country_id`, `doctrine`, `score`, `mandate_days`, `season` |
| **Anti-triche** | Journal d'événements, `journalHash`, `device_id`, `app_version`, `finalIndicators` |
| **Achats in-app** | `app_user_id` (RC), entitlements |
| **Multijoueur** | `user.id`, `display_name`, `push_token`, UUIDs partenaires |
| **Notifications push** | `push_token` |

---

## 6. Permissions à justifier

### Android (`AndroidManifest.xml`)

| Permission | Justification |
|------------|--------------|
| `android.permission.INTERNET` | Sauvegarde cloud, mode classé, multijoueur, achats in-app |
| `android.permission.VIBRATE` | Retour haptique sur les actions de jeu |
| `android.permission.POST_NOTIFICATIONS` *(Android 13+)* | Notifications des événements multijoueur — demandée à l'exécution uniquement |

**Permissions non déclarées et non demandées :** ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, READ_CONTACTS, READ_EXTERNAL_STORAGE, CAMERA, RECORD_AUDIO, READ_PHONE_STATE, BLUETOOTH.

### iOS (`Info.plist`)

| Clé | Valeur justificative |
|-----|---------------------|
| `NSUserNotificationsUsageDescription` | "Pour vous alerter des événements multijoueur : résolution d'alliances, d'espionnage et de cyberattaques." |

**Clés non déclarées :** NSLocationWhenInUseUsageDescription, NSCameraUsageDescription, NSMicrophoneUsageDescription, NSContactsUsageDescription, NSPhotoLibraryUsageDescription, NSFaceIDUsageDescription.

---

## 7. Texte de base — Politique de confidentialité

> **Politique de confidentialité — Président : Nation en Crise**
> Dernière mise à jour : [DATE]
>
> ### 1. Données collectées
>
> **Compte joueur.** Un identifiant anonyme est créé automatiquement au premier lancement. Vous pouvez optionnellement lier votre compte Google ou Apple pour sécuriser votre progression — votre adresse e-mail est alors transmise à notre fournisseur d'authentification (Supabase) et n'est jamais communiquée à d'autres joueurs.
>
> **Pseudonyme.** Un nom d'affichage que vous choisissez librement lors du mode classé. Il est visible dans le classement mondial et dans le chat.
>
> **Données de jeu.** Votre progression (sauvegarde cloud), vos résultats en mode classé, et vos interactions multijoueur (alliances, espionnage, cyberattaques, chat) sont stockés sur nos serveurs pour le bon fonctionnement du jeu. Ces données ne contiennent aucune information personnelle au-delà de votre pseudonyme.
>
> **Informations techniques.** Plateforme (iOS/Android), version de l'OS, version de l'app — utilisées à des fins d'anti-triche et de support.
>
> **Notifications.** Si vous acceptez, votre identifiant de notification push est enregistré pour vous alerter des événements multijoueur. Vous pouvez révoquer cette permission à tout moment dans les réglages de votre appareil.
>
> **Achats.** Les achats in-app sont traités par Apple App Store / Google Play et RevenueCat. Nous ne stockons pas vos données bancaires.
>
> ### 2. Ce que nous ne collectons pas
>
> Nous ne collectons jamais : localisation, contacts, photos, caméra, microphone, identifiant publicitaire, ni aucune donnée provenant d'autres applications.
>
> ### 3. Partage des données
>
> - **Supabase** : hébergement et traitement des données de jeu.
> - **RevenueCat** : traitement des achats in-app.
> - **Apple / Google** : traitement des paiements et push notifications.
>
> Nous ne vendons jamais vos données et ne les partageons avec aucun annonceur ou réseau publicitaire.
>
> ### 4. Suppression des données
>
> Pour demander la suppression de vos données, contactez-nous à : [EMAIL CONTACT]. Votre compte et toutes les données associées seront supprimés dans un délai de 30 jours.
>
> ### 5. Contact
>
> [EMAIL / SITE WEB]

---

## 8. Checklist App Store (Apple)

### Privacy Nutrition Label

#### Données collectées et **liées à l'utilisateur**

| Catégorie Apple | Sous-type | Finalité |
|----------------|-----------|---------|
| Identifiers → User ID | UUID Supabase | App Functionality |
| Contact Info → Email Address | Email Google/Apple | App Functionality *(optionnel, si lié)* |
| Gameplay Content | Pseudonyme, messages de chat | App Functionality, Leaderboard |
| Usage Data → Other Usage Data | Journal de gameplay, indicateurs finaux | Anti-Cheat, Leaderboard |
| Identifiers → Device ID | Push token (Expo) | App Functionality |
| Purchases | Historique achats (via RC) | Purchases |
| Diagnostics → App Info & Performance | Version app, plateforme, version OS | App Functionality |

#### Données collectées mais **non liées à l'utilisateur**

| Catégorie Apple | Sous-type | Finalité |
|----------------|-----------|---------|
| Identifiers → Device ID | `device_id` UUID interne | Anti-Cheat |

#### Données **non collectées**
- Location Data ✗
- Health & Fitness ✗
- Financial Info ✗
- Sensitive Info ✗
- Contacts ✗
- Browsing History ✗
- Search History ✗
- Photos or Videos ✗
- Audio Data ✗
- Other Data ✗

#### Tracking
L'app **ne fait pas** de tracking publicitaire cross-app. Répondre **Non** à "Does your app use data for tracking purposes?" dans App Store Connect.

---

## 9. Checklist Play Store (Google)

### Data Safety Section

#### Données partagées avec des tiers

| Tiers | Type de données | Raison |
|-------|----------------|--------|
| RevenueCat | User ID (UUID Supabase), historique achats | Traitement achats in-app |
| Supabase | Toutes les données listées ci-dessous | Infrastructure du jeu |

#### Données collectées

| Type Play Store | Données | Chiffré en transit | Opt-in | Supprimable par l'utilisateur |
|----------------|---------|-------------------|--------|-------------------------------|
| App info & performance → App version | Version app, plateforme, OS | Oui | Non | Oui |
| Identifiers → User IDs | UUID Supabase, device_id | Oui | Non (automatique) | Oui |
| App activity → In-app search history | — | — | — | — |
| App activity → Other user-generated content | Messages de chat | Oui | Oui | Oui |
| App activity → Other actions | Journal gameplay, runs classées, alliances, ops | Oui | Oui (mode classé) | Oui |
| Personal info → Name | Pseudonyme | Oui | Oui | Oui |
| Personal info → Email address | Email (si compte Google/Apple lié) | Oui | Oui (optionnel) | Oui |
| Device or other identifiers | Push token | Oui | Oui | Oui |
| Financial info → Purchase history | Packs achetés (via RC) | Oui | Oui | Oui |

#### Questions clés Play Store

| Question | Réponse |
|----------|---------|
| Votre app collecte ou partage des données utilisateur ? | **Oui** |
| Toutes les données sont-elles chiffrées en transit ? | **Oui** (HTTPS/TLS) |
| Proposez-vous un moyen de demander la suppression des données ? | **Oui** (email contact) |
| L'app cible-t-elle les enfants de moins de 13 ans ? | **Non** |
| L'app utilise-t-elle des identifiants publicitaires (GAID) ? | **Non** |

---

## 10. Points de vigilance avant soumission

- [ ] **Politique de confidentialité** : ajouter une URL publique dans App Store Connect et Play Console (obligatoire)
- [ ] **Email de contact RGPD** : accessible depuis les métadonnées du store ou via un lien dans l'app
- [ ] **Région Supabase** : si hors UE (ex. US-East), mentionner le transfert de données dans la politique de confidentialité
- [ ] **Age rating** : classer l'app 12+ (violence politique thématique, compétition en ligne avec autres joueurs)
- [ ] **Chat** : confirmer que la longueur max (200 chars) et la liste noire côté serveur sont suffisantes pour les règles de contenu des stores
- [ ] **Télémétrie** : si `flushTelemetry()` est activé à l'avenir, mettre à jour la déclaration Data Safety / Nutrition Label avant publication
- [ ] **App Integrity** : `AppIntegrityService` est en scaffolding. Play Integrity (Android) / App Attest (iOS) n'envoient pas de PII — les tokens sont opaques. Aucune déclaration store supplémentaire requise lors de l'activation.
- [ ] **Notifications** : confirmer que `usePushNotifications` n'est appelé qu'après authentification (déjà le cas — le hook dépend de `accessToken`)
- [ ] **Suppression de compte** : Apple exige un mécanisme de suppression de compte in-app depuis juin 2022. Ajouter un bouton "Supprimer mon compte" dans les paramètres si l'app supporte des comptes liés (Google/Apple).
