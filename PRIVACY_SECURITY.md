# Politique de confidentialité & sécurité — Président : Nation en Crise

> Document interne. À compléter avant soumission App Store / Google Play.  
> Dernière mise à jour : mai 2026

---

## 1. Données collectées

### 1.1 Données personnelles
| Donnée | Collectée ? | Lieu de stockage | Durée |
|--------|-------------|------------------|-------|
| Nom du président (saisi par le joueur) | Oui | AsyncStorage local uniquement | Tant que la sauvegarde existe |
| Identifiant appareil | Non | — | — |
| Email / compte | Non | — | — |
| Localisation | Non | — | — |
| Contacts | Non | — | — |
| Photos / caméra | Non | — | — |

### 1.2 Données de jeu (non personnelles)
| Donnée | Lieu | Notes |
|--------|------|-------|
| État de la partie (jauges, ressources, décisions) | AsyncStorage local | Unencrypted — jeu solo offline |
| Progrès tutoriel | AsyncStorage local | |
| Statistiques de partie (parties jouées, crises résolues) | AsyncStorage local | Agrégats anonymes |
| Entitlements / packs achetés | AsyncStorage local + RevenueCat | RevenueCat est source de vérité |

### 1.3 Données transmises à des tiers
| Service | Données transmises | Pourquoi | Opt-out possible ? |
|---------|-------------------|----------|-------------------|
| RevenueCat | Informations d'achat Play Store / App Store | Validation des achats in-app | Non (requis pour les achats) |
| Backend IA (serveur hébergé par le développeur) | Contexte de jeu anonymisé (jauges, thèmes) pour générer des événements | Génération de contenu | Oui (mode offline sans IA) |
| Google Play / Apple App Store | Aucune donnée directe de l'app | Infrastructure standard | — |

---

## 2. Droits des utilisateurs (RGPD art. 15-22)

### 2.1 Droit d'accès
Toutes les données sont stockées localement sur l'appareil du joueur.  
Le joueur peut les consulter via les paramètres de son OS (Paramètres → Apps → Président).

### 2.2 Droit à l'effacement
**Depuis l'application** : "Nouvelle partie" écrase la sauvegarde actuelle.  
**Effacement complet** : désinstaller l'application supprime toutes les données AsyncStorage.  
**Données RevenueCat** : contactez support@revenuecat.com avec l'identifiant d'achat.

### 2.3 Droit à la portabilité
Non implémenté (roadmap). Les données sont purement locales et non transférées à des serveurs de jeu.

### 2.4 Durée de conservation
- Données locales : effacées à la désinstallation de l'app
- Données RevenueCat : selon la politique RevenueCat (généralement 3 ans après le dernier achat)
- Logs serveur IA : aucune rétention des payloads — les requêtes ne contiennent pas de données personnelles

---

## 3. Sécurité technique

### 3.1 Stockage local
- **AsyncStorage** : non chiffré — acceptable car aucune donnée personnelle sensible
- Quand ajouter du chiffrement : si un compte utilisateur ou des données financières sont ajoutés, utiliser `expo-secure-store` (Keychain iOS / Keystore Android)

### 3.2 Achats in-app
- RevenueCat est la source de vérité pour tous les achats
- Les entitlements sont vérifiés côté serveur RevenueCat à chaque lancement
- Un cache local existe (AsyncStorage) pour le mode offline — les packs actuels sont gratuits, ce qui rend ce point non critique

### 3.3 Communications réseau
- Toutes les communications sont en HTTPS uniquement (enforced en production dans `lib/api.ts`)
- Aucune clé secrète n'est embarquée dans le bundle de l'application
- Les clés sont stockées dans EAS Secrets (tableau de bord Expo)

### 3.4 Code de l'application
- Fonctions debug derrière `__DEV__` (inaccessibles en production)
- Aucun secret hardcodé (vérifié par audit)
- Validation stricte des réponses du serveur IA (whitelist + clamping)
- Obfuscation : Hermes (React Native) offusque le bytecode en production

---

## 4. Risques résiduels documentés

| Risque | Niveau | Mitigation actuelle | Mitigation future |
|--------|--------|---------------------|-------------------|
| Bypass entitlement (appareil rooté) | Moyen | RevenueCat vérifie côté serveur au lancement | SecureStore si packs payants réels |
| Appels IA abusifs (endpoint public) | Moyen | Rate limiting côté serveur recommandé | Authentification par token de session |
| Modification de la sauvegarde locale | Faible | Jeu solo — aucun impact sur les autres joueurs | Signature HMAC si sauvegarde cloud ajoutée |
| App modifiée (APK/IPA tamperée) | Moyen | Hermes bytecode + ProGuard R8 | Play Integrity (Android) + App Attest (iOS) |
| Fuite de données via logs | Faible | Tous les logs sensibles sont derrière `__DEV__` | Audit des logs tiers (RevenueCat SDK) |

---

## 5. Contacts

- **Responsable du traitement** : [NOM / SOCIÉTÉ À COMPLÉTER]  
- **Email de contact DPO** : [EMAIL À COMPLÉTER]  
- **Politique de confidentialité publique** : [URL À HÉBERGER ET AJOUTER dans app.json]  
- **Autorité de contrôle** : CNIL (Commission Nationale de l'Informatique et des Libertés) — www.cnil.fr

---

## 6. Checklist avant soumission stores

### Google Play
- [ ] Politique de confidentialité hébergée à une URL publique
- [ ] Déclaration de confidentialité remplie dans la Play Console (Data Safety)
- [ ] Permissions déclarées : `INTERNET`, `VIBRATE` uniquement
- [ ] Play Integrity API configurée (optionnel mais recommandé)
- [ ] RevenueCat Android key dans EAS Secrets (pas dans eas.json)

### Apple App Store
- [ ] Politique de confidentialité hébergée à une URL publique
- [ ] App Privacy Labels remplis dans App Store Connect
- [ ] `ios.bundleIdentifier` présent dans app.json ✅
- [ ] Profil iOS dans eas.json ✅
- [ ] App Attest configuré (optionnel mais recommandé)
- [ ] RevenueCat iOS key ajoutée dans `lib/purchases.ts` pour iOS

---

## 7. Commandes de maintenance sécurité

```bash
# Vérifier les vulnérabilités des dépendances
npm audit

# Vérifier que .env n'est pas dans git
git check-ignore -v .env

# Lister les secrets EAS du projet
eas secret:list

# Ajouter un secret EAS (ne jamais mettre dans eas.json)
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://ton-api.fly.dev
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_xxxx
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_xxxx
```
