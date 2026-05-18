import type {
  CampaignPromises,
  HiddenPolitics,
  NationalIndicators,
  StrategyGameState,
  StrategyResources,
} from "@/types/strategy";

// ── Dimensions du vecteur ─────────────────────────────────────────────────────

export type RepDimension =
  | "military"
  | "diplomatic"
  | "economic"
  | "technological"
  | "ecological"
  | "authoritarian"
  | "social"
  | "integrity";

export type ReputationVector = Record<RepDimension, number>; // chaque dim ∈ [0, 100]

// ── Métadonnées des dimensions ────────────────────────────────────────────────

export interface DimMeta {
  label:    string;
  color:    string;
  icon:     string;  // MaterialCommunityIcons
}

export const DIM_META: Record<RepDimension, DimMeta> = {
  military:     { label: "Militaire",      color: "#FF4040", icon: "sword-cross"        },
  diplomatic:   { label: "Diplomatique",   color: "#4a9fff", icon: "handshake-outline"  },
  economic:     { label: "Économique",     color: "#3fbe7a", icon: "chart-line"          },
  technological:{ label: "Technologique",  color: "#a78bfa", icon: "cpu-64-bit"          },
  ecological:   { label: "Écologique",     color: "#52c97a", icon: "leaf"               },
  authoritarian:{ label: "Autoritaire",    color: "#FF8040", icon: "gavel"              },
  social:       { label: "Social",         color: "#FFB020", icon: "account-group"       },
  integrity:    { label: "Intégrité",      color: "#c9a84c", icon: "shield-star-outline" },
};

// ── Profil final ──────────────────────────────────────────────────────────────

export interface ReputationProfile {
  vector:             ReputationVector;
  dominantDimension:  RepDimension;
  secondDimension:    RepDimension;
  title:              string;
  subtitle:           string;
  titleColor:         string;
}

// ── Helpers de normalisation ──────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function norm(value: number, max: number): number {
  return clamp((value / max) * 100);
}

// Score d'alliance : % de relations positives (allied + friendly) parmi les 20 pays.
function allianceScore(state: StrategyGameState): number {
  const rels = state.relations ?? [];
  if (rels.length === 0) return 50;
  const positive = rels.filter((r) => r.status === "allied" || r.status === "friendly").length;
  return clamp((positive / rels.length) * 100);
}

// Score des promesses de campagne : moyenne pondérée de l'état de chaque promesse.
function promiseScore(promises: CampaignPromises): number {
  const selected = promises.selected;
  if (selected.length === 0) return 50;
  const scores = selected.map((domain): number => {
    const status = promises.status[domain] ?? "en cours";
    switch (status) {
      case "tenue":    return 100;
      case "partielle":return 60;
      case "en cours": return 30;
      case "trahie":   return 0;
    }
  });
  return clamp(scores.reduce((s, x) => s + x, 0) / scores.length);
}

// Bonus de réformes écologiques : recherche d'IDs contenant "green", "ecolog", "climat".
function ecologicalReformBonus(state: StrategyGameState): number {
  const completed = state.reforms?.filter((r) => r.applied).map((r) => r.id) ?? [];
  const greenCount = completed.filter((id) =>
    /green|ecolog|climat|environment|renouv/i.test(id),
  ).length;
  return clamp(greenCount * 12);
}

// Taux de complétion des recherches stratégiques (approximation : max = 18 items).
function researchCompletion(state: StrategyGameState): number {
  const completed = (state.strategyResearch?.completed ?? []).length;
  return norm(completed, 18);
}

// ── Calcul du vecteur ─────────────────────────────────────────────────────────
//
// Chaque dimension est dérivée de l'état courant — aucune modification de schéma.
// Les plafonds de normalisation sont des approximations de "très bon niveau",
// pas des maximums absolus (un joueur peut dépasser, la valeur est clampée à 100).
//
// Pondérations : chaque dimension reflète 2-3 sources complémentaires,
// évitant qu'un seul indicateur domine artificiellement.

export function computeReputationVector(state: StrategyGameState): ReputationVector {
  const res = state.resources;
  const ind = state.nationalIndicators ?? { popularity: 60, economy: 55, security: 50, ecology: 45, cohesion: 60, publicBudget: 20 };
  const hp  = state.hiddenPolitics   ?? { eliteTrust: 65, scandalRisk: 20, mediaMood: 55, popularFatigue: 15, regionalTension: 30, institutionalStability: 70 };
  const st  = state.stats;
  const promises = state.campaignPromises ?? { selected: [], progress: {}, status: {} };

  // ── military ──────────────────────────────────────────────────────────────
  // Investissement militaire + opérations lancées + niveau de sécurité
  const milRes  = norm(res.military, 200);
  const milOps  = norm(st.totalOperations, 40);
  const milSec  = ind.security;
  const military = clamp(milRes * 0.40 + milOps * 0.35 + milSec * 0.25);

  // ── diplomatic ────────────────────────────────────────────────────────────
  // Influence + qualité des alliances + humeur des médias (vecteur d'image internationale)
  const dipInf   = norm(res.influence, 500);
  const dipAlly  = allianceScore(state);
  const dipMedia = hp.mediaMood;
  const diplomatic = clamp(dipInf * 0.35 + dipAlly * 0.40 + dipMedia * 0.25);

  // ── economic ──────────────────────────────────────────────────────────────
  // Indicateur économique + équilibre budgétaire + trésorerie
  const ecoInd    = ind.economy;
  const ecoBudget = clamp(((ind.publicBudget + 150) / 250) * 100); // range −150…+100 → 0-100
  const ecoMoney  = norm(res.money, 3000);
  const economic   = clamp(ecoInd * 0.45 + ecoBudget * 0.35 + ecoMoney * 0.20);

  // ── technological ─────────────────────────────────────────────────────────
  // Investissement technologique + cyberdéfense + recherche complétée
  const techRes    = norm(res.technology, 200);
  const techCyber  = norm(res.cyberDefense, 150);
  const techRes2   = researchCompletion(state);
  const technological = clamp(techRes * 0.40 + techCyber * 0.35 + techRes2 * 0.25);

  // ── ecological ────────────────────────────────────────────────────────────
  // Indicateur d'écologie + bonus réformes vertes + énergie
  const ecolInd   = ind.ecology;
  const ecolBonus = ecologicalReformBonus(state);
  const ecolEner  = norm(res.energy, 200);
  const ecological = clamp(ecolInd * 0.70 + ecolBonus * 0.20 + ecolEner * 0.10);

  // ── authoritarian ─────────────────────────────────────────────────────────
  // Investissement militaire + sécurité + faible cohésion + médias sous pression
  // Valeur haute = gouvernance musclée / centralisée ; valeur basse = libérale / ouverte
  const authMil    = milRes;
  const authSec    = ind.security;
  const authAntiCo = 100 - ind.cohesion;
  const authMedia  = 100 - hp.mediaMood;
  const authoritarian = clamp(authMil * 0.30 + authSec * 0.30 + authAntiCo * 0.20 + authMedia * 0.20);

  // ── social ────────────────────────────────────────────────────────────────
  // Cohésion + popularité + absence de lassitude populaire
  const soCohesion  = ind.cohesion;
  const soPopularity = ind.popularity;
  const soAntiFatigue = 100 - hp.popularFatigue;
  const social = clamp(soCohesion * 0.40 + soPopularity * 0.35 + soAntiFatigue * 0.25);

  // ── integrity ────────────────────────────────────────────────────────────
  // Absence de scandale + confiance des élites + tenue des promesses
  const intNoScandal = 100 - hp.scandalRisk;
  const intElite     = hp.eliteTrust;
  const intPromises  = promiseScore(promises);
  const integrity = clamp(intNoScandal * 0.40 + intElite * 0.30 + intPromises * 0.30);

  return { military, diplomatic, economic, technological, ecological, authoritarian, social, integrity };
}

// ── Tri des dimensions ────────────────────────────────────────────────────────

export function rankDimensions(v: ReputationVector): RepDimension[] {
  return (Object.keys(v) as RepDimension[]).sort((a, b) => v[b] - v[a]);
}

// ── Génération du titre de réputation ────────────────────────────────────────
//
// Logique en deux passes :
//  1. Combo (top1 + top2) → titre spécifique si défini dans COMBO_TITLES.
//  2. Fallback sur le titre de la dimension dominante seule.
//
// Modificateurs contextuels :
//  - Si "authoritarian" est dans le top-2 et que integrity < 30 → suffixe "Contesté"
//  - Si "diplomatic" est dominant mais integrity < 30 → "Diplomate Fragile" (titre spec)
//  - Si "economic" est dominant et social < 30 → "Froid Gestionnaire" (titre spec)
//
// Les suffixes négatifs ne sont appliqués qu'une seule fois — pas de cumul.

const DIM_SINGLE_TITLE: Record<RepDimension, { title: string; subtitle: string }> = {
  military:     { title: "Stratège Militaire",        subtitle: "La force prime sur toutes les autres considérations." },
  diplomatic:   { title: "Architecte Mondial",         subtitle: "Les alliances et les accords définissent votre héritage." },
  economic:     { title: "Gestionnaire Économique",    subtitle: "La rigueur budgétaire guide chaque décision." },
  technological:{ title: "Président Technologique",    subtitle: "L'innovation est votre principal levier de puissance." },
  ecological:   { title: "Gardien Écologique",         subtitle: "L'environnement n'est pas un sacrifice acceptable." },
  authoritarian:{ title: "Dirigeant Ferme",            subtitle: "La stabilité passe avant tout compromis." },
  social:       { title: "Réformateur Social",         subtitle: "Chaque décision vise d'abord le bien-être collectif." },
  integrity:    { title: "Gardien des Institutions",   subtitle: "La transparence et la confiance sont inviolables." },
};

type ComboKey = `${RepDimension}_${RepDimension}`;

const COMBO_TITLES: Partial<Record<ComboKey, { title: string; subtitle: string }>> = {
  military_authoritarian:  { title: "Stratège Autoritaire",    subtitle: "L'ordre est maintenu par la force et la discipline." },
  authoritarian_military:  { title: "Stratège Autoritaire",    subtitle: "L'ordre est maintenu par la force et la discipline." },
  military_social:         { title: "Protecteur Souverain",    subtitle: "Vous défendez la nation tout en préservant sa cohésion." },
  social_military:         { title: "Protecteur Souverain",    subtitle: "Vous défendez la nation tout en préservant sa cohésion." },
  military_diplomatic:     { title: "Puissance Tempérée",      subtitle: "La force militaire au service d'une diplomatie mesurée." },
  diplomatic_military:     { title: "Puissance Tempérée",      subtitle: "La force militaire au service d'une diplomatie mesurée." },
  diplomatic_integrity:    { title: "Diplomate Intègre",       subtitle: "La confiance internationale est votre premier actif." },
  integrity_diplomatic:    { title: "Diplomate Intègre",       subtitle: "La confiance internationale est votre premier actif." },
  diplomatic_social:       { title: "Médiateur des Nations",   subtitle: "Vos alliances reflètent vos valeurs sociales." },
  social_diplomatic:       { title: "Médiateur des Nations",   subtitle: "Vos alliances reflètent vos valeurs sociales." },
  economic_military:       { title: "Froid Gestionnaire",      subtitle: "Les chiffres et la puissance guident vos arbitrages." },
  military_economic:       { title: "Froid Gestionnaire",      subtitle: "Les chiffres et la puissance guident vos arbitrages." },
  economic_social:         { title: "Réformateur Social",      subtitle: "L'économie au service de la justice sociale." },
  social_economic:         { title: "Réformateur Social",      subtitle: "L'économie au service de la justice sociale." },
  economic_technological:  { title: "Modernisateur",           subtitle: "La croissance par l'innovation, la rentabilité par la technologie." },
  technological_economic:  { title: "Modernisateur",           subtitle: "La croissance par l'innovation, la rentabilité par la technologie." },
  technological_military:  { title: "Défenseur Numérique",     subtitle: "La cyberpuissance comme première ligne de défense." },
  military_technological:  { title: "Défenseur Numérique",     subtitle: "La cyberpuissance comme première ligne de défense." },
  technological_integrity: { title: "Entrepreneur d'État",     subtitle: "L'État au service de l'innovation, sans compromis éthiques." },
  integrity_technological: { title: "Entrepreneur d'État",     subtitle: "L'État au service de l'innovation, sans compromis éthiques." },
  social_integrity:        { title: "Humaniste Engagé",        subtitle: "Vos convictions morales guident chaque réforme sociale." },
  integrity_social:        { title: "Humaniste Engagé",        subtitle: "Vos convictions morales guident chaque réforme sociale." },
  ecological_social:       { title: "Président Vert",          subtitle: "La transition écologique est votre projet de société." },
  social_ecological:       { title: "Président Vert",          subtitle: "La transition écologique est votre projet de société." },
  ecological_economic:     { title: "Développement Durable",   subtitle: "Croissance et environnement ne s'excluent pas." },
  economic_ecological:     { title: "Développement Durable",   subtitle: "Croissance et environnement ne s'excluent pas." },
};

export function computeReputationProfile(state: StrategyGameState): ReputationProfile {
  const vector = computeReputationVector(state);
  const ranked = rankDimensions(vector);
  const top1   = ranked[0];
  const top2   = ranked[1];

  const comboKey: ComboKey = `${top1}_${top2}`;
  const base = COMBO_TITLES[comboKey] ?? DIM_SINGLE_TITLE[top1];

  let { title, subtitle } = base;

  // Modificateurs contextuels — un seul peut s'appliquer
  if (top1 === "diplomatic" && vector.integrity < 30) {
    title    = "Diplomate Fragile";
    subtitle = "Influent sur la scène mondiale, mais fragilisé par les scandales internes.";
  } else if (top1 === "economic" && vector.social < 28) {
    title    = "Froid Gestionnaire";
    subtitle = "L'efficacité économique prime sur la cohésion sociale.";
  } else if ((top1 === "authoritarian" || top2 === "authoritarian") && vector.integrity < 30) {
    title    = title + " Contesté";
    subtitle = "La gouvernance ferme se heurte à une légitimité fragilisée.";
  }

  return {
    vector,
    dominantDimension: top1,
    secondDimension:   top2,
    title,
    subtitle,
    titleColor: DIM_META[top1].color,
  };
}

// ── Résumé court (3 dimensions les plus marquées) ────────────────────────────
//
// Utile pour un affichage compact : seulement les 3 barres les plus hautes,
// sans surcharger l'écran avec 8 dimensions.

export function getTopDimensions(
  v: ReputationVector,
  count = 3,
): Array<{ dim: RepDimension; value: number; meta: DimMeta }> {
  return rankDimensions(v)
    .slice(0, count)
    .map((dim) => ({ dim, value: v[dim], meta: DIM_META[dim] }));
}
