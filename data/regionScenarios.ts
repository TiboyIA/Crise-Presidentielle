import type { CrisisEvent } from "@/data/events";
import type { Region, RegionTrait } from "@/data/regions";

/**
 * Module 2 — Scénarios régionaux dynamiques.
 *
 * Génère, à la volée, un `CrisisEvent` ciblé sur une région précise.
 * On distingue deux familles :
 *  - "demand"      → la région DEMANDE quelque chose au gouvernement
 *                    (négociation possible, choix multiples).
 *  - "catastrophe" → un évènement extérieur FRAPPE la région (climat,
 *                    accident industriel…). Les choix portent sur la
 *                    réponse de l'État, pas sur la prévention.
 *
 * Conventions de design :
 *  - Tous les évènements générés portent un id préfixé `rgn_` pour
 *    pouvoir être identifiés par les couches UI / log.
 *  - La catégorie est toujours "regional" pour qu'ils soient repérables
 *    par le crisisDirector et les futures statistiques.
 *  - Les `regionEffects` ciblent la région concernée — c'est la région
 *    qui paie le prix (ou qui est apaisée), pas une autre.
 */
export type RegionalScenarioKind = "demand" | "catastrophe";

interface ScenarioDef {
  /** Sous-titre court du type "Inondation côtière à Marseille" */
  title: (region: Region) => string;
  context: (region: Region) => string;
  source: (region: Region) => string;
  choices: (region: Region) => CrisisEvent["choices"];
}

/**
 * Tronque le préfixe "Région : " devant pour rester lisible dans le
 * journal et le ticker.
 */
function buildId(kind: RegionalScenarioKind, region: Region, turn: number) {
  return `rgn_${kind}_${region.id}_t${turn}`;
}

// ─── Demandes (régions qui appellent l'État à l'aide) ────────────────

const DEMAND_BY_TRAIT: Record<RegionTrait, ScenarioDef> = {
  capital: {
    title: (r) => `Manifestation massive à ${r.capital}`,
    context: (r) =>
      `Une coordination citoyenne appelle à un grand rassemblement dans les rues de ${r.capital}. ` +
      `La préfecture craint des débordements et demande des consignes claires.`,
    source: () => "Note de la Préfecture de police",
    choices: (r) => [
      {
        id: "a",
        label: "Recevoir les organisateurs à l'Élysée",
        description: "Désamorcer par le dialogue, accepter quelques concessions symboliques.",
        effects: { popularity: 4, authority: -3, cohesion: 3 },
        consequence: "Le cortège se tient dans le calme. La rue apprécie l'écoute.",
        regionEffects: [{ region: r.id, tension: -8, popularity: 5 }],
        mediaEffect: 3,
      },
      {
        id: "b",
        label: "Interdire le rassemblement",
        description: "Décret préfectoral, dispositif anti-émeute déployé.",
        effects: { popularity: -8, authority: 5, security: 2, cohesion: -4 },
        hiddenEffects: { radicalization: 6, peopleFatigue: 4 },
        consequence: "La manif a lieu malgré tout. Affrontements, images difficiles.",
        regionEffects: [{ region: r.id, tension: 10, security: -4 }],
        mediaEffect: -6,
        oppositionEffect: 5,
      },
      {
        id: "c",
        label: "Encadrer sans interdire",
        description: "Parcours imposé, forces de l'ordre en retrait.",
        effects: { popularity: 1, authority: 1 },
        consequence: "Le rassemblement reste massif mais maîtrisé.",
        regionEffects: [{ region: r.id, tension: -2 }],
      },
    ],
  },
  coastal: {
    title: (r) => `Crise littorale à ${r.name}`,
    context: (r) =>
      `Les élus de ${r.name} alertent sur l'érosion accélérée du trait de côte et ` +
      `réclament un plan d'urgence pour protéger ports et zones touristiques.`,
    source: (r) => `Préfecture maritime — ${r.capital}`,
    choices: (r) => [
      {
        id: "a",
        label: "Débloquer un fonds littoral spécifique",
        description: "200 M€ pour digues, brise-lames et relogement.",
        effects: { ecology: 4, popularity: 3, budget: -5, debt: 3 },
        consequence: "Les communes obtiennent le plan demandé. Travaux dès l'été.",
        regionEffects: [
          { region: r.id, tension: -6, ecology: 6, economy: 3 },
        ],
      },
      {
        id: "b",
        label: "Renvoyer au plan national déjà voté",
        description: "Pas de fonds supplémentaire, application du droit commun.",
        effects: { authority: 2, popularity: -4 },
        consequence: "Les élus locaux dénoncent un abandon. Mobilisation à venir.",
        regionEffects: [
          { region: r.id, tension: 9, popularity: -7, ecology: -3 },
        ],
        oppositionEffect: 4,
      },
      {
        id: "c",
        label: "Étude d'impact préalable",
        description: "Mission confiée au CEREMA, décision dans 6 mois.",
        effects: { popularity: -1 },
        consequence: "Statu quo. Les élus reviendront à la charge.",
        regionEffects: [{ region: r.id, tension: 3 }],
      },
    ],
  },
  industrial: {
    title: (r) => `Menace de fermetures à ${r.name}`,
    context: (r) =>
      `Plusieurs sites industriels de ${r.name} annoncent des plans sociaux. ` +
      `Les élus locaux réclament une intervention de l'État avant la fin du mois.`,
    source: (r) => `Chambre régionale — ${r.capital}`,
    choices: (r) => [
      {
        id: "a",
        label: "Aides ciblées + commande publique",
        description: "Subventions et carnets de commandes garantis.",
        effects: { economy: 4, budget: -7, debt: 4, popularity: 3 },
        consequence: "Les sites obtiennent un sursis. Le bassin respire.",
        regionEffects: [
          { region: r.id, tension: -8, economy: 8, popularity: 5 },
        ],
        fulfillsPromise: ["industry"],
      },
      {
        id: "b",
        label: "Nationalisation temporaire",
        description: "Reprise par l'État pour préparer la transition.",
        effects: { authority: 3, economy: -2, budget: -10, debt: 6 },
        hiddenEffects: { foreignDependence: -3 },
        consequence: "Mesure forte, marchés crispés, ouvriers soulagés.",
        regionEffects: [{ region: r.id, tension: -10, economy: 4 }],
        oppositionEffect: 6,
      },
      {
        id: "c",
        label: "Laisser le marché ajuster",
        description: "Accompagnement social classique seulement.",
        effects: { economy: -3, popularity: -6, cohesion: -4 },
        hiddenEffects: { radicalization: 5, peopleFatigue: 4 },
        consequence: "Plans sociaux confirmés. Colère locale.",
        regionEffects: [
          { region: r.id, tension: 12, economy: -6, popularity: -8 },
        ],
        breaksPromise: ["industry"],
      },
    ],
  },
  agricultural: {
    title: (r) => `Blocage agricole en ${r.name}`,
    context: (r) =>
      `Les agriculteurs de ${r.name} bloquent autoroutes et préfectures. ` +
      `Ils exigent un moratoire fiscal et une renégociation des prix d'achat.`,
    source: (r) => `Préfecture — ${r.capital}`,
    choices: (r) => [
      {
        id: "a",
        label: "Concéder un paquet d'urgence",
        description: "Allègements fiscaux, indemnisations sécheresse.",
        effects: { popularity: 4, budget: -6, debt: 3 },
        consequence: "Levée des barrages dans la nuit.",
        regionEffects: [
          { region: r.id, tension: -10, economy: 5, popularity: 5 },
        ],
      },
      {
        id: "b",
        label: "Faire évacuer par les gendarmes",
        description: "Ordre public d'abord, négociation ensuite.",
        effects: { authority: 6, popularity: -7, security: 3, cohesion: -5 },
        hiddenEffects: { radicalization: 8, peopleFatigue: 5 },
        consequence: "Évacuations musclées, images dans tout le pays.",
        regionEffects: [
          { region: r.id, tension: 14, security: -5, popularity: -8 },
        ],
        mediaEffect: -8,
        oppositionEffect: 5,
      },
      {
        id: "c",
        label: "Médiation Bercy + FNSEA",
        description: "Arbitrage en chambre, sans annonce.",
        effects: { authority: 1 },
        consequence: "Blocage levé partiellement. Le sujet reviendra.",
        regionEffects: [{ region: r.id, tension: -3 }],
      },
    ],
  },
  strategic: {
    title: (r) => `Demande sécuritaire — ${r.name}`,
    context: (r) =>
      `Les élus de ${r.name} alertent sur une montée des trafics et une présence accrue ` +
      `de groupes armés. Ils demandent un renfort exceptionnel de l'État.`,
    source: () => `Ministère des Outre-mer / Intérieur`,
    choices: (r) => [
      {
        id: "a",
        label: "Envoyer GIGN + renforts militaires",
        description: "Dispositif exceptionnel pour 6 mois.",
        effects: { security: 5, authority: 4, budget: -5 },
        consequence: "Présence visible. Calme retrouvé… provisoirement.",
        regionEffects: [
          { region: r.id, tension: -10, security: 10 },
        ],
      },
      {
        id: "b",
        label: "Plan de développement économique",
        description: "S'attaquer aux causes — emploi, formation, logement.",
        effects: { popularity: 3, economy: 1, budget: -8, debt: 4 },
        consequence: "Réponse de fond saluée, mais lente à produire ses effets.",
        regionEffects: [
          { region: r.id, tension: -5, economy: 6, popularity: 5 },
        ],
        fulfillsPromise: ["industry"],
      },
      {
        id: "c",
        label: "Statu quo — moyens existants",
        description: "Pas de renfort, communiqué rassurant.",
        effects: { popularity: -3, authority: -3 },
        consequence: "Les élus dénoncent l'abandon. Mobilisation locale.",
        regionEffects: [{ region: r.id, tension: 10, security: -3 }],
        oppositionEffect: 4,
      },
    ],
  },
  alpine: {
    title: (r) => `Coupures d'énergie en ${r.name}`,
    context: (r) =>
      `Plusieurs vallées de ${r.name} subissent des délestages programmés. ` +
      `Industriels et collectivités exigent une priorité de réseau et un plan d'investissement.`,
    source: (r) => `RTE — Direction régionale ${r.capital}`,
    choices: (r) => [
      {
        id: "a",
        label: "Plan d'investissement réseau",
        description: "Priorité sur les lignes alpines, fonds dédiés.",
        effects: { economy: 3, ecology: 2, budget: -6, debt: 3 },
        consequence: "Travaux lancés, délestages allégés sous 3 mois.",
        regionEffects: [
          { region: r.id, tension: -8, economy: 5 },
        ],
      },
      {
        id: "b",
        label: "Réquisition des barrages privés",
        description: "Décret d'urgence, gestion publique temporaire.",
        effects: { authority: 5, economy: -2 },
        hiddenEffects: { foreignDependence: -4 },
        consequence: "Mesure choc, contestée par les exploitants.",
        regionEffects: [{ region: r.id, tension: -6 }],
        oppositionEffect: 5,
      },
      {
        id: "c",
        label: "Maintenir les délestages",
        description: "Pas d'investissement supplémentaire pour l'instant.",
        effects: { popularity: -5, economy: -2 },
        consequence: "Industriels furieux, communes en grève fiscale.",
        regionEffects: [
          { region: r.id, tension: 12, economy: -6, popularity: -6 },
        ],
      },
    ],
  },
};

// ─── Catastrophes (régions frappées par un évènement subi) ───────────

const CATASTROPHE_BY_TRAIT: Partial<Record<RegionTrait, ScenarioDef>> = {
  coastal: {
    title: (r) => `Inondation majeure à ${r.name}`,
    context: (r) =>
      `Une tempête frappe le littoral de ${r.name}. Plusieurs communes sont sous les eaux, ` +
      `routes coupées, habitations évacuées.`,
    source: () => "Sécurité Civile — alerte rouge",
    choices: (r) => [
      {
        id: "a",
        label: "État de catastrophe naturelle + aide d'urgence",
        description: "Décret immédiat, équipes nationales déployées.",
        effects: { popularity: 5, authority: 3, budget: -8, debt: 4 },
        consequence: "L'État est en première ligne. Sinistrés rassurés.",
        regionEffects: [
          { region: r.id, tension: -8, publicHealth: -3, ecology: -5 },
        ],
      },
      {
        id: "b",
        label: "Réponse locale — préfet aux manettes",
        description: "Pas d'annonce nationale, gestion départementale.",
        effects: { popularity: -4, authority: -2 },
        consequence: "Le préfet improvise. Critiques sur l'absence du Président.",
        regionEffects: [
          { region: r.id, tension: 10, publicHealth: -6, ecology: -7 },
        ],
        mediaEffect: -5,
      },
    ],
  },
  industrial: {
    title: (r) => `Accident industriel à ${r.name}`,
    context: (r) =>
      `Une explosion sur un site classé Seveso à ${r.name} provoque un nuage toxique. ` +
      `Périmètre de sécurité, écoles évacuées.`,
    source: () => "DREAL + Préfecture",
    choices: (r) => [
      {
        id: "a",
        label: "Mobilisation maximale + enquête publique",
        description: "Indemnisations rapides, transparence totale.",
        effects: { popularity: 3, authority: 2, budget: -6, debt: 3 },
        consequence: "Réponse saluée. Confiance préservée malgré le drame.",
        regionEffects: [
          { region: r.id, tension: -5, publicHealth: -7, ecology: -8 },
        ],
      },
      {
        id: "b",
        label: "Communication minimale",
        description: "Limiter l'impact médiatique, traiter en interne.",
        effects: { popularity: -8, authority: -3 },
        hiddenEffects: { corruption: 4 },
        consequence: "Fuites dans la presse. Soupçons de connivence avec l'industriel.",
        regionEffects: [
          { region: r.id, tension: 14, publicHealth: -10, ecology: -10 },
        ],
        mediaEffect: -8,
        oppositionEffect: 6,
      },
    ],
  },
  agricultural: {
    title: (r) => `Sécheresse historique en ${r.name}`,
    context: (r) =>
      `Un épisode de sécheresse exceptionnelle ravage les cultures de ${r.name}. ` +
      `Les nappes phréatiques sont au plus bas, l'irrigation est restreinte.`,
    source: () => "Météo-France + Ministère de l'Agriculture",
    choices: (r) => [
      {
        id: "a",
        label: "Plan eau d'urgence + indemnisations",
        description: "Bassines temporaires, compensations pertes récolte.",
        effects: { popularity: 3, ecology: -2, budget: -7, debt: 4 },
        consequence: "Agriculteurs partiellement soulagés. Écolos critiques.",
        regionEffects: [
          { region: r.id, tension: -7, economy: 4 },
        ],
      },
      {
        id: "b",
        label: "Restrictions strictes uniquement",
        description: "Priorité à la ressource, pas d'indemnisation supplémentaire.",
        effects: { ecology: 3, popularity: -5 },
        consequence: "Exploitations en faillite. Manifestations annoncées.",
        regionEffects: [
          { region: r.id, tension: 11, economy: -7, ecology: 4 },
        ],
      },
    ],
  },
  strategic: {
    title: (r) => `Tensions sécuritaires à ${r.name}`,
    context: (r) =>
      `Émeutes nocturnes à ${r.name} après un incident impliquant les forces de l'ordre. ` +
      `Plusieurs nuits d'affrontements, commerces pillés.`,
    source: () => "Préfecture — alerte niveau 3",
    choices: (r) => [
      {
        id: "a",
        label: "Couvre-feu + renforts CRS",
        description: "Restauration de l'ordre par tous moyens.",
        effects: { authority: 5, security: 3, popularity: -4, cohesion: -4 },
        hiddenEffects: { radicalization: 6 },
        consequence: "Calme revenu. Cicatrice durable.",
        regionEffects: [
          { region: r.id, tension: -8, security: 5, popularity: -5 },
        ],
      },
      {
        id: "b",
        label: "Médiation + plan social d'urgence",
        description: "Délégation ministérielle sur place, écoute des familles.",
        effects: { popularity: 4, cohesion: 5, budget: -5 },
        consequence: "Apaisement progressif. Tensions sous-jacentes demeurent.",
        regionEffects: [
          { region: r.id, tension: -6, popularity: 6 },
        ],
      },
    ],
  },
};

/**
 * Construit un évènement régional pour la région et le tour donnés.
 *
 * Si `kind = "catastrophe"` mais que le trait régional n'a pas de
 * scénario catastrophe défini (capital, alpine), on retombe
 * automatiquement sur une demande pour ne pas faire foirer
 * silencieusement le tirage côté GameContext. La factory ne renvoie
 * `null` que si AUCUN scénario n'est défini pour ce trait — ce qui
 * ne devrait jamais arriver (`DEMAND_BY_TRAIT` est exhaustif).
 */
export function buildRegionalScenario(
  region: Region,
  turn: number,
  kind: RegionalScenarioKind,
): CrisisEvent | null {
  let resolvedKind: RegionalScenarioKind = kind;
  let def: ScenarioDef | undefined =
    kind === "demand"
      ? DEMAND_BY_TRAIT[region.trait]
      : CATASTROPHE_BY_TRAIT[region.trait];
  if (!def && kind === "catastrophe") {
    // Trait sans catastrophe (capital, alpine) → on bascule en demande.
    def = DEMAND_BY_TRAIT[region.trait];
    resolvedKind = "demand";
  }
  if (!def) return null;
  return {
    id: buildId(resolvedKind, region, turn),
    category: "regional",
    title: def.title(region),
    context: def.context(region),
    source: def.source(region),
    choices: def.choices(region),
  };
}

/**
 * Vrai si l'id d'un évènement a été généré par cette factory.
 * Utilisé par GameContext pour repérer un tour régional sans
 * persister un drapeau séparé.
 */
export function isRegionalScenarioId(id: string): boolean {
  return id.startsWith("rgn_");
}
