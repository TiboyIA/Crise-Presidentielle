# Changelog technique — État de Crise

Historique des changements techniques significatifs.
Pour ajouter une entrée : `npm run changelog` (génère un modèle en tête de fichier).

Format de version : `1.0.0-ops.N` (N = incrément ops par-dessus la version app).
Types : `gameplay` · `UI` · `backend` · `build` · `sécurité` · `ops` · `debug`
Risque : `faible` · `modéré` · `élevé` · `critique`

---

<!--CHANGELOG_INSERT_POINT-->

## [1.0.0-ops.8] — 2026-05-26 · `ops`

**Runbook incidents développeur**

| Champ | Valeur |
|---|---|
| Commit | `95fc8ab` |
| Fichiers modifiés | `docs/runbook_incidents.md` |
| Type | ops |
| Risque | faible — documentation seule |
| Tests effectués | Lecture croisée avec le code réel (clés AsyncStorage, fichiers storage/, services/) |
| Rollback possible | Oui — supprimer le fichier |

**Notes développeur**
14 procédures de résolution d'incidents ancrées dans le code réel : clés AsyncStorage exactes (`etat_de_crise_save_v4`, `ranked_pending_submit_v1`), fichiers précis (`config/devSandbox.ts`, `services/RankedService.ts`), commandes vérifiées. Tableau récapitulatif en fin de document.

---

## [1.0.0-ops.7] — 2026-05-26 · `ops`

**Documentation variables d'environnement (.env.example + env_setup.md)**

| Champ | Valeur |
|---|---|
| Commit | `6665048` |
| Fichiers modifiés | `.env.example`, `docs/env_setup.md` |
| Type | ops |
| Risque | faible — documentation et modèle sans valeurs réelles |
| Tests effectués | Vérification manuelle que `.env.example` ne contient aucune clé réelle |
| Rollback possible | Oui — git revert |

**Notes développeur**
`.env.example` restructuré avec légende `[OBLIGATOIRE/BUILD NATIF/DEVELOPPEMENT/OPTIONNEL]`. `EXPO_PUBLIC_ENABLE_DEV_SANDBOX=false` ajouté avec avertissement production explicite. `docs/env_setup.md` couvre création, variables, interdictions de commit, sandbox et vérification via `npm run doctor`.

---

## [1.0.0-ops.6] — 2026-05-26 · `build` · `ops`

**Preflight build check — contrôle pré-EAS**

| Champ | Valeur |
|---|---|
| Commit | `8bb4f14` |
| Fichiers modifiés | `scripts/preflight-build.ts`, `package.json` |
| Type | build · ops |
| Risque | faible — script read-only, ne modifie rien |
| Tests effectués | `npm run preflight` (preview) et `npm run preflight:prod` (production, bloqué sandbox) validés |
| Rollback possible | Oui — supprimer le script et retirer les entrées package.json |

**Notes développeur**
10 checks : typecheck (filtré hors supabase/deno), tests golden, taille assets, version app.json, profils EAS, sandbox bloquée en prod, secrets non trackés git (`git ls-files`), package Android, app-bundle. Génère `preflight-report.json`. Exit 1 si bloquants. Corrigé pour Windows (`shell: true` sur spawnSync npm/npx).

---

## [1.0.0-ops.5] — 2026-05-26 · `ops`

**System Doctor — diagnostic projet local**

| Champ | Valeur |
|---|---|
| Commit | `dc69071` |
| Fichiers modifiés | `scripts/system-doctor.ts`, `package.json` |
| Type | ops |
| Risque | faible — lecture seule, aucune modification de fichier |
| Tests effectués | `npm run doctor` exécuté et validé (17 OK, 2 ⚠️ attendus, 1 ❌ assets réel) |
| Rollback possible | Oui — supprimer le script |

**Notes développeur**
15 vérifications : Node ≥ 18, gestionnaire paquets, fichiers racine, `.env.local`, variables Supabase (sans afficher les valeurs), sandbox, dossiers requis, typecheck défini, taille assets, `node_modules`, `expo-router`, `tsx`, cache `.expo`, `.gitignore`. Exit 1 si bloquants.

---

## [1.0.0-ops.4] — 2026-05-26 · `gameplay` · `UI`

**MODE DELTA météo — 5 systèmes (épisodes méditerranéens, opportunités, trust alertes, transports, doctrine)**

| Champ | Valeur |
|---|---|
| Commit | `acba053` |
| Fichiers modifiés | `logic/weatherAlertTrustEngine.ts`, `logic/weatherDoctrineEngine.ts`, `logic/weatherOpportunityEngine.ts`, `logic/weatherTransportEngine.ts`, `logic/weatherEnergyPressureEngine.ts`, `logic/agroWeatherEngine.ts`, `logic/missionReportEngine.ts`, `logic/enemyOperationEngine.ts`, `data/newsEvents.ts`, `context/StrategyContext.tsx`, `app/journal-crise.tsx`, `types/strategy.ts` |
| Type | gameplay · UI |
| Risque | modéré — 9 nouveaux fichiers logique, intégration dans `advanceMandateDay` et `resolveInteractiveNews` |
| Tests effectués | TypeScript 0 erreur ; test fonctionnel manuel journal-crise (trust bar, transport widget, doctrine chips, opportunity card) |
| Rollback possible | Oui — tous les nouveaux champs `StrategyGameState` sont optionnels (`?`) ; sauvegardes existantes compatibles |

**Notes développeur**
`weatherAlertTrust` (0–100) intégré dans 3 familles d'événements + forecasts. `weatherDoctrine` (5 valeurs) applique des multiplicateurs sur coût/cohésion/trust/fatigue. `weatherOpportunity` spawne à 45 % par période 10 jours. Transport purement dérivé (aucun nouveau champ d'état). Anti-spam épisodes méditerranéens : gap minimum 20 jours (`lastMediterraneanEventAt`).

---

## [1.0.0-ops.3] — 2026-05-25 · `gameplay`

**RH Cabinet + Salle météo (10 fonctionnalités)**

| Champ | Valeur |
|---|---|
| Commits | `fbe0599` `6ed147f` `d19753d` `9bd4851` `42abdfe` `a712e53` `e4aed94` `ab247a6` `6333c24` `d729d33` |
| Fichiers modifiés | `logic/crisisStaffingEngine.ts`, `logic/forecastUncertaintyEngine.ts`, `logic/weatherEngine.ts`, `app/strategy-cabinet.tsx`, `app/journal-crise.tsx`, `context/StrategyContext.tsx`, `types/strategy.ts` |
| Type | gameplay |
| Risque | modéré — ajouts sur `StrategyGameState` en `?` ; tick 10-jours étendu |
| Tests effectués | TypeScript 0 erreur ; tests golden 40/40 |
| Rollback possible | Oui — tous les champs optionnels ; `advanceMandateDay` revient à l'état antérieur en supprimant les ticks |

**Notes développeur**
Cellule de crise interministérielle (`crisisStaffingEngine`), fuite talents, culture de gouvernement (6 orientations), formation et évaluation ministérielles, conflits cabinet, moral administratif, plan de succession, burnout. Salle météo avec prévisions incertaines (`forecastUncertaintyEngine`) et niveaux de confiance.

---

## [1.0.0-ops.2] — 2026-05-19–22 · `gameplay` · `build`

**Tests golden + feature flags + assurance souveraine + cat-bonds + actuariat**

| Champ | Valeur |
|---|---|
| Commits | `ca65d1d` `636245b` `deb6f30` `c799418` `c84c4ba` |
| Fichiers modifiés | `tests/golden/`, `core/computeState.ts`, `core/gameSelectors.ts`, `config/features.ts`, `logic/catBondEngine.ts`, `logic/crisisCostSharingEngine.ts`, `storage/saveMigrations.ts`, `package.json` |
| Type | gameplay · build |
| Risque | faible — tests en lecture seule ; feature flags compile-time sans impact runtime si désactivés |
| Tests effectués | `npm run test:golden` — 40 tests (computeState, gameSelectors, buildingUpgrade, research, migration v1→v3) |
| Rollback possible | Oui — tests peuvent être retirés sans affecter le jeu ; feature flags peuvent être désactivés sans régression |

**Notes développeur**
`CURRENT_SAVE_VERSION = 3`. Migration v1→v2→v3 testée en golden. 8 feature flags compile-time dans `config/features.ts`. Fonds de Résilience, assurance souveraine (6 produits), obligations catastrophe (3 bonds), moteurs actuariels (réassurance, passifs longue traîne).

---

## [1.0.0-ops.1] — 2026-05-18 · `sécurité`

**Audit sécurité complet — stockage, cloud save, achats, OAuth, MASVS, zero trust**

| Champ | Valeur |
|---|---|
| Commit | `faf8514` |
| Fichiers modifiés | `storage/strategyStorage.ts`, `services/SyncService.ts`, `lib/entitlements.ts`, `context/AuthContext.tsx`, `app/alliances.tsx`, `supabase/functions/save-sync/`, `docs/security_*.md`, `docs/zero_trust_client_policy.md` |
| Type | sécurité |
| Risque | modéré — modification du flux de sync cloud et des entitlements |
| Tests effectués | Tests manuels achat/restore sur sandbox RevenueCat ; vérification JWT exclu du PendingSubmit |
| Rollback possible | Partiel — les durciements Edge Function nécessitent un rollback Supabase séparé |

**Notes développeur**
JWT exclu de `PendingSubmit`. Garde corruption AsyncStorage. Validation client cloud save (taille, version, clés dangereuses, checksum djb2). `score-submit` désactivé (HTTP 410) — zero trust. Rate limit alliances 10 inv/jour. Audit MASVS : 0 critique, 1 élevé (suppression compte), 2 moyens. Voir `docs/security_masvs_audit.md`.

---

## [1.0.0-ops.0] — 2026-05-15 · `debug` · `build`

**Fix P0 — env guard, clés RevenueCat, eas.json environments**

| Champ | Valeur |
|---|---|
| Commit | `4fec02f` |
| Fichiers modifiés | `config/env.ts`, `lib/purchases.ts`, `eas.json` |
| Type | debug · build |
| Risque | élevé — correctif production bloquant ; RevenueCat non initialisé sans ce fix |
| Tests effectués | Build EAS preview validé post-fix ; achat sandbox iOS vérifié |
| Rollback possible | Non recommandé — le bug causait un crash au démarrage sur build natif |

**Notes développeur**
`config/env.ts` créé : guard explicite sur `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` avec message d'erreur actionnable. `lib/purchases.ts` : distinction clé iOS / Android. `eas.json` : champ `environment` ajouté aux 3 profils (development/preview/production).
