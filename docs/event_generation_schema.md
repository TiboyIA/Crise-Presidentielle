# Schéma de génération d'événements — Président : Nation en Crise

> **Usage** : ce document est destiné à être copié dans Claude, ChatGPT ou tout autre outil IA
> pour générer des événements hors application. Aucun appel IA ne doit exister dans l'app mobile.
> Les événements générés sont collés dans `data/events.ts` après validation manuelle.

---

## 1. Types de référence

### `CrisisEvent` — structure principale

```typescript
{
  id: string;                    // "ev_[slug_unique]" — jamais dupliqué
  category: EventCategory;       // voir liste ci-dessous
  title: string;                 // titre court, percutant (< 60 chars)
  context: string;               // 2-3 phrases de mise en scène narrative
  source: string;                // "Note du Ministère de X" ou source fictive
  choices: EventChoice[];        // 2 à 3 choix obligatoires
  severity?: EventSeverity;      // optionnel — inféré automatiquement si absent
  isDelayedConsequence?: boolean; // true si c'est une conséquence différée
  pack?: "climate";              // uniquement pour le DLC Climat
}
```

### `EventCategory` — valeurs autorisées

```
"social"         — grèves, inégalités, logement, retraites
"economy"        — récession, inflation, chômage, faillites
"security"       — terrorisme, criminalité, ordre public
"diplomacy"      — relations étrangères, accords, tensions
"ecology"        — catastrophes naturelles, pollution, transition
"scandal"        — corruption, affaires, révélations
"media"          — fake news, presse, réseaux sociaux
"opposition"     — motions de censure, blocages parlementaires
"regional"       — tensions locales, séparatismes, outre-mer
"delayed"        — conséquence d'une décision passée
"cyber"          — attaques numériques, espionnage, fuites de données
"health"         — épidémies, hôpitaux, santé publique
"energy"         — pénuries, prix, indépendance énergétique
"agriculture"    — sécheresse, filières, souveraineté alimentaire
"hybrid_warfare" — guerre de l'information, désinformation, ingérence
```

### `EventSeverity` — optionnel

```
"rare"         — événement exceptionnel, réservé aux crises majeures
"major"        — décision stratégique plein écran, pause automatique
"minor"        — carte rapide sur le dashboard, pas de pause
"notification" — info pure, AlertTicker, sans choix conséquent
```

Si absent, le moteur l'infère depuis l'amplitude des effets (somme |effets| ≥ 22 → major).

---

### `EventChoice` — structure d'un choix

```typescript
{
  id: string;               // "a", "b", "c" — séquentiel dans le même événement
  label: string;            // bouton d'action (< 40 chars)
  description: string;      // ce que le joueur fait concrètement (1-2 phrases)
  effects: {                // au moins 1 effet obligatoire — valeurs entières
    popularity?: number;        // -25 à +25
    economy?: number;
    budget?: number;
    debt?: number;
    security?: number;
    health?: number;
    ecology?: number;
    cohesion?: number;
    diplomacy?: number;
    regionalStability?: number;
    authority?: number;
  };
  hiddenEffects?: {         // optionnel — effets cachés au joueur
    scandalRisk?: number;       // risque de scandale accumulé
    peopleFatigue?: number;     // lassitude du peuple
    radicalization?: number;    // radicalisation
    foreignDependence?: number; // dépendance extérieure
    cyberRisk?: number;         // vulnérabilité cyber
    corruption?: number;        // niveau de corruption
    oppositionPower?: number;   // force de l'opposition
  };
  consequence: string;      // résultat narratif après la décision (1-2 phrases)

  // --- Optionnels ---
  ministerEffects?: Array<{
    position: "pm" | "interior" | "economy" | "foreign" | "ecology" | "defense";
    loyalty?: number;       // -30 à +30
    competence?: number;    // -10 à +10
    scandals?: number;      // +1 à +3
    fire?: boolean;         // true = limogeage immédiat
  }>;
  regionEffects?: Array<{
    region: "idf" | "paca" | "auvergne" | "hdf" | "bretagne" | "occitanie" | "grand_est" | "outre_mer";
    tension?: number;           // -20 à +20
    economy?: number;
    security?: number;
    popularity?: number;
    ecology?: number;
    publicHealth?: number;
    socialStability?: number;
  }>;
  mediaEffect?: number;         // couverture médiatique delta
  oppositionEffect?: number;    // force opposition delta
  fulfillsPromise?: Array<      // promesses tenues
    "purchasing_power" | "security" | "ecology" | "industry" | "europe" |
    "secularism" | "education" | "tax_cut" | "social_justice" | "sovereignty"
  >;
  breaksPromise?: Array<        // promesses trahies (mêmes valeurs)
    "purchasing_power" | "security" | "ecology" | "industry" | "europe" |
    "secularism" | "education" | "tax_cut" | "social_justice" | "sovereignty"
  >;
  schedulesEvent?: {
    eventId: string;    // id d'un événement existant dans data/events.ts
    delay: number;      // nombre de tours avant déclenchement (1-12)
  };
  requiresTech?:        // choix réservé si technologie acquise
    "cyber_security" | "electric_grid" | "surveillance_drones" |
    "smart_agriculture" | "admin_ai" | "digital_hospitals" |
    "sovereign_energy" | "antimissile_shield" | "science_education" |
    "strategic_industry";
}
```

---

## 2. Règles d'équilibre

| Règle | Détail |
|-------|--------|
| **Amplitude** | Somme des \|effets\| d'un choix : 15-35 pour major, 8-20 pour minor |
| **Asymétrie** | Chaque choix doit avoir un profil distinct — pas deux options identiques |
| **Dette** | `debt` positif = augmentation de la dette. Toujours cohérent avec `budget` |
| **Aucune valeur absurde** | Jamais de -100 ou +100 sur un seul choix |
| **2 à 3 choix** | Minimum 2, maximum 3. Jamais 1 seul choix |
| **Conséquence narrative** | `consequence` ne répète pas `description` — c'est le résultat, pas l'intention |
| **ID unique** | Format `ev_[categorie]_[slug]` — vérifier dans `data/events.ts` qu'il n'existe pas |
| **Pas de vraie personne** | Aucun nom réel, aucun parti réel, aucun pays réel nommé directement |
| **Pas de haine** | Pas de contenu discriminatoire, pas de cible ethnique ou religieuse |

---

## 3. Exemples JSON valides

### Exemple 1 — Cyberattaque

```json
{
  "id": "ev_cyber_infra_attack",
  "category": "cyber",
  "title": "Cyberattaque sur les infrastructures critiques",
  "context": "Des systèmes hospitaliers et des réseaux ferroviaires tombent en panne simultanément. Les services de renseignement suspectent une attaque coordonnée d'origine étatique étrangère.",
  "source": "Alerte ANSSI — niveau critique",
  "severity": "major",
  "choices": [
    {
      "id": "a",
      "label": "Riposter par des contre-mesures cyber",
      "description": "Autoriser une réponse offensive discrète contre les serveurs identifiés.",
      "effects": {
        "security": 10,
        "diplomacy": -12,
        "authority": 6,
        "budget": -8
      },
      "hiddenEffects": {
        "cyberRisk": -15,
        "foreignDependence": -5
      },
      "consequence": "Les attaques cessent temporairement. La tension diplomatique monte.",
      "requiresTech": "cyber_security"
    },
    {
      "id": "b",
      "label": "Isoler les systèmes et patcher en urgence",
      "description": "Déconnecter les réseaux touchés et mobiliser les équipes techniques en 72h.",
      "effects": {
        "health": -6,
        "economy": -8,
        "security": 4,
        "budget": -5
      },
      "hiddenEffects": {
        "cyberRisk": -8,
        "peopleFatigue": 6
      },
      "consequence": "La crise est contenue mais les perturbations durent plusieurs jours."
    },
    {
      "id": "c",
      "label": "Minimiser publiquement l'incident",
      "description": "Communiquer sur un incident technique mineur pour éviter la panique.",
      "effects": {
        "popularity": -5,
        "authority": -8,
        "cohesion": -6
      },
      "hiddenEffects": {
        "scandalRisk": 15,
        "cyberRisk": 8
      },
      "consequence": "La vérité finit par filtrer. La crédibilité du gouvernement est entamée."
    }
  ]
}
```

### Exemple 2 — Crise sociale

```json
{
  "id": "ev_social_pension_reform_clash",
  "category": "social",
  "title": "Débordements lors des manifestations contre la réforme des retraites",
  "context": "La troisième semaine de mobilisation tourne mal. Des heurts éclatent dans plusieurs villes entre forces de l'ordre et manifestants. Des images font le tour des réseaux sociaux.",
  "source": "Note de la Place Beauvau",
  "severity": "major",
  "choices": [
    {
      "id": "a",
      "label": "Suspendre la réforme et rouvrir le dialogue",
      "description": "Annoncer une pause dans le processus législatif et convoquer une conférence sociale.",
      "effects": {
        "popularity": 12,
        "authority": -15,
        "cohesion": 8,
        "economy": -4
      },
      "hiddenEffects": {
        "oppositionPower": 10,
        "peopleFatigue": -10
      },
      "consequence": "Les syndicats reprennent les négociations. Le gouvernement perd de sa crédibilité réformatrice.",
      "breaksPromise": ["social_justice"]
    },
    {
      "id": "b",
      "label": "Maintenir le cap et appeler au calme",
      "description": "Confirmer la réforme en discours télévisé tout en condamnant les violences.",
      "effects": {
        "authority": 8,
        "popularity": -10,
        "cohesion": -12,
        "security": -5
      },
      "hiddenEffects": {
        "radicalization": 10,
        "peopleFatigue": 8
      },
      "consequence": "Les manifestations continuent. Une partie de l'opinion perçoit le gouvernement comme sourd."
    },
    {
      "id": "c",
      "label": "Proposer un référendum consultatif",
      "description": "Soumettre la réforme à consultation populaire pour désamorcer la crise démocratique.",
      "effects": {
        "popularity": 6,
        "authority": -6,
        "cohesion": 10,
        "budget": -3
      },
      "hiddenEffects": {
        "oppositionPower": -5,
        "peopleFatigue": -5
      },
      "consequence": "La tension redescend. Le résultat du référendum reste incertain."
    }
  ]
}
```

### Exemple 3 — Crise de la dette

```json
{
  "id": "ev_economy_debt_downgrade",
  "category": "economy",
  "title": "Les agences de notation abaissent la note souveraine",
  "context": "Pour la deuxième fois en trois ans, la dette nationale est dégradée d'un cran. Les marchés réagissent par une hausse des taux d'emprunt. Le ministre de l'Économie demande une audience urgente.",
  "source": "Note de Bercy — confidentiel",
  "severity": "major",
  "choices": [
    {
      "id": "a",
      "label": "Plan de rigueur budgétaire immédiat",
      "description": "Annoncer des coupes dans les dépenses publiques et un gel du recrutement dans la fonction publique.",
      "effects": {
        "economy": 8,
        "budget": 12,
        "debt": -8,
        "popularity": -14,
        "cohesion": -8
      },
      "hiddenEffects": {
        "peopleFatigue": 12,
        "oppositionPower": 8
      },
      "consequence": "Les marchés se stabilisent. L'impopularité du gouvernement grimpe.",
      "fulfillsPromise": ["industry"]
    },
    {
      "id": "b",
      "label": "Emprunter pour investir dans la croissance",
      "description": "Lancer un grand plan d'investissement public malgré le déficit, en pariant sur la relance.",
      "effects": {
        "economy": 10,
        "budget": -8,
        "debt": 15,
        "popularity": 5,
        "ecology": 4
      },
      "hiddenEffects": {
        "foreignDependence": 8
      },
      "consequence": "La croissance repart légèrement. La dette continue de gonfler."
    },
    {
      "id": "c",
      "label": "Négocier un soutien européen",
      "description": "Solliciter un mécanisme de stabilité auprès des partenaires européens.",
      "effects": {
        "diplomacy": 10,
        "economy": 5,
        "authority": -6,
        "budget": 4,
        "debt": -5
      },
      "hiddenEffects": {
        "foreignDependence": 15
      },
      "consequence": "L'aide arrive mais au prix de conditions budgétaires imposées de l'extérieur.",
      "fulfillsPromise": ["europe"]
    }
  ]
}
```

### Exemple 4 — Guerre hybride

```json
{
  "id": "ev_hybrid_disinfo_campaign",
  "category": "hybrid_warfare",
  "title": "Campagne de désinformation élaborée visant les élections régionales",
  "context": "Des milliers de faux comptes relaient des rumeurs sur des fraudes électorales. Les services de renseignement ont remonté l'opération à des serveurs situés à l'étranger. La presse commence à couvrir l'affaire.",
  "source": "Rapport de la délégation au renseignement",
  "severity": "major",
  "choices": [
    {
      "id": "a",
      "label": "Révéler publiquement l'ingérence",
      "description": "Conférence de presse avec preuves à l'appui pour nommer l'acteur étranger responsable.",
      "effects": {
        "diplomacy": -14,
        "authority": 10,
        "cohesion": 8,
        "security": 5
      },
      "hiddenEffects": {
        "radicalization": -6,
        "foreignDependence": -8
      },
      "consequence": "L'opinion se soude autour de la souveraineté nationale. La tension diplomatique s'intensifie."
    },
    {
      "id": "b",
      "label": "Contre-attaque discrète sur les réseaux",
      "description": "Déployer une cellule spécialisée pour neutraliser les comptes et noyer les fausses informations.",
      "effects": {
        "security": 8,
        "cohesion": 5,
        "diplomacy": -4
      },
      "hiddenEffects": {
        "cyberRisk": -10,
        "radicalization": -4
      },
      "consequence": "La campagne est ralentie sans escalade publique.",
      "requiresTech": "cyber_security"
    },
    {
      "id": "c",
      "label": "Renforcer la résilience citoyenne",
      "description": "Lancer en urgence un programme d'éducation aux médias dans les écoles et les médias publics.",
      "effects": {
        "cohesion": 10,
        "popularity": 4,
        "budget": -5,
        "economy": -2
      },
      "hiddenEffects": {
        "radicalization": -10,
        "peopleFatigue": -4
      },
      "consequence": "L'effet est lent mais durable. La société civile se mobilise pour la vérification des faits.",
      "fulfillsPromise": ["education"]
    }
  ]
}
```

### Exemple 5 — Diplomatie

```json
{
  "id": "ev_diplomacy_ally_treaty",
  "category": "diplomacy",
  "title": "Un allié stratégique propose un traité de défense mutuelle renforcé",
  "context": "Dans un contexte de tensions régionales, un partenaire majeur propose de rehausser le niveau de notre coopération militaire et économique. Le traité impliquerait le stationnement de troupes alliées sur le territoire national.",
  "source": "Note du Quai d'Orsay",
  "severity": "major",
  "choices": [
    {
      "id": "a",
      "label": "Signer le traité dans sa forme actuelle",
      "description": "Accepter l'accord complet incluant les bases militaires alliées.",
      "effects": {
        "security": 14,
        "diplomacy": 12,
        "authority": -6,
        "cohesion": -8
      },
      "hiddenEffects": {
        "foreignDependence": 15,
        "radicalization": 8
      },
      "consequence": "La sécurité nationale est renforcée. Des voix souverainistes s'élèvent contre la perte d'indépendance.",
      "fulfillsPromise": ["europe"]
    },
    {
      "id": "b",
      "label": "Négocier un accord partiel sans bases militaires",
      "description": "Accepter la coopération économique et le partage de renseignements, refuser le stationnement de troupes.",
      "effects": {
        "diplomacy": 6,
        "security": 5,
        "authority": 4,
        "cohesion": 4
      },
      "hiddenEffects": {
        "foreignDependence": 5
      },
      "consequence": "L'allié accepte un compromis. La relation reste solide sans contrainte territoriale.",
      "fulfillsPromise": ["sovereignty"]
    },
    {
      "id": "c",
      "label": "Décliner et renforcer l'armée nationale",
      "description": "Refuser le traité et annoncer un plan de réarmement autonome.",
      "effects": {
        "authority": 10,
        "security": 6,
        "diplomacy": -10,
        "budget": -10,
        "debt": 6
      },
      "hiddenEffects": {
        "foreignDependence": -12
      },
      "consequence": "Le pays gagne en indépendance stratégique au prix d'un isolement diplomatique relatif.",
      "fulfillsPromise": ["sovereignty"]
    }
  ]
}
```

---

## 4. Prompt développeur — à copier dans Claude ou ChatGPT

```
Tu es un générateur de contenu pour le jeu de stratégie politique "Président : Nation en Crise".

CONTEXTE DU JEU :
Le joueur incarne un chef d'État fictif d'un pays fictif francophone.
Il prend des décisions qui affectent des jauges : popularité, économie, budget,
dette, sécurité, santé, écologie, cohésion, diplomatie, stabilité régionale, autorité.
Toutes les décisions ont des conséquences narratives et mécaniques.

RÈGLES ABSOLUES :
- Aucun nom de personne réelle, aucun parti politique réel, aucun pays réel nommé directement
- Pas de contenu haineux, discriminatoire ou ciblant une ethnie/religion
- Pas de valeurs d'effets absurdes (jamais ±100, maximum ±25 par jauge)
- Chaque événement a 2 ou 3 choix avec des profils distincts
- Le format JSON doit être valide et strictement conforme au schéma ci-dessous

SCHÉMA :
[coller le contenu de la section 1 de ce document]

EXEMPLES DE RÉFÉRENCE :
[coller 1 ou 2 exemples de la section 3]

TÂCHE :
Génère [N] événements de catégorie "[category]" au format JSON strict.
Chaque événement doit être unique, équilibré et cohérent avec un contexte politique réaliste.
Retourne uniquement le tableau JSON, sans commentaires ni texte autour.
Format : CrisisEvent[] compatible TypeScript.
```

---

## 5. Checklist de validation avant intégration

Copier dans `data/events.ts` uniquement si toutes les cases sont cochées.

### Technique
- [ ] `id` est unique — chercher dans `data/events.ts` avec Ctrl+F
- [ ] `id` respecte le format `ev_[categorie]_[slug]`
- [ ] `category` est une valeur autorisée de `EventCategory`
- [ ] `severity` est absent ou vaut `"rare"` / `"major"` / `"minor"` / `"notification"`
- [ ] Chaque `choice.id` est `"a"`, `"b"`, `"c"` (séquentiel)
- [ ] Toutes les valeurs d'effets sont des entiers
- [ ] Aucune valeur d'effet dépasse ±25
- [ ] `fulfillsPromise` et `breaksPromise` n'utilisent que les tags autorisés
- [ ] `regionEffects.region` n'utilise que les RegionId autorisés
- [ ] `ministerEffects.position` n'utilise que les positions autorisées
- [ ] `requiresTech` n'utilise que les TechId autorisés
- [ ] `schedulesEvent.eventId` pointe vers un id qui existe dans `data/events.ts`

### Contenu
- [ ] Aucun nom de personne réelle
- [ ] Aucun parti politique réel nommé
- [ ] Aucun pays réel nommé directement (préférer "une puissance étrangère", "un allié européen")
- [ ] Pas de contenu haineux ou discriminatoire
- [ ] Le `context` est narrativement cohérent avec la `category`
- [ ] La `consequence` de chaque choix est différente de sa `description`
- [ ] Les effets sont cohérents avec la logique du choix (ex: coupes budgétaires → `budget` positif, `popularity` négatif)
- [ ] Au moins un choix a des effets négatifs sur une jauge importante

### Équilibre
- [ ] Les 2-3 choix ont des profils mécaniques distincts
- [ ] Aucun choix n'est strictement dominé par un autre (pas de "meilleur choix évident")
- [ ] Si `severity: "major"`, la somme des |effets| du choix le plus fort est ≥ 15

---

## 6. Intégration dans le code

Après validation, ajouter l'événement dans `data/events.ts` :

```typescript
// Dans le tableau EVENTS existant, ajouter à la fin :
export const EVENTS: CrisisEvent[] = [
  // ... événements existants ...

  // --- Nouveaux événements générés le YYYY-MM-DD ---
  {
    id: "ev_cyber_infra_attack",
    // ...
  },
];
```

Puis vérifier que TypeScript compile sans erreur :

```bash
npx tsc --noEmit
```

Si le compilateur détecte une valeur invalide (mauvais `category`, mauvais `region`, etc.),
il l'indiquera précisément — c'est le filet de sécurité final.
