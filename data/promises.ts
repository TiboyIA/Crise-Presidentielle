export type PromiseTag =
  | "purchasing_power"
  | "security"
  | "ecology"
  | "industry"
  | "europe"
  | "secularism"
  | "education"
  | "tax_cut"
  | "social_justice"
  | "sovereignty";

export interface CampaignPromise {
  tag: PromiseTag;
  label: string;
  description: string;
}

export interface PlayerPromise extends CampaignPromise {
  status: "pending" | "fulfilled" | "broken";
  resolvedTurn?: number;
}

export const PROMISE_POOL: CampaignPromise[] = [
  {
    tag: "purchasing_power",
    label: "Restaurer le pouvoir d'achat",
    description: "Stopper l'érosion du salaire réel des Français.",
  },
  {
    tag: "security",
    label: "Rétablir l'ordre républicain",
    description: "Sécurité dans les rues, fermeté face à la délinquance.",
  },
  {
    tag: "ecology",
    label: "Tenir les engagements climatiques",
    description: "Réduire les émissions, accélérer la transition.",
  },
  {
    tag: "industry",
    label: "Réindustrialiser la France",
    description: "Relocaliser la production, soutenir les usines.",
  },
  {
    tag: "europe",
    label: "Une France au cœur de l'Europe",
    description: "Renforcer la coopération européenne.",
  },
  {
    tag: "secularism",
    label: "Défendre la laïcité",
    description: "Stricte neutralité de l'État.",
  },
  {
    tag: "education",
    label: "Réinvestir dans l'école",
    description: "Plus de moyens, plus d'enseignants.",
  },
  {
    tag: "tax_cut",
    label: "Baisser les impôts",
    description: "Alléger la fiscalité des classes moyennes.",
  },
  {
    tag: "social_justice",
    label: "Plus de justice sociale",
    description: "Redistribuer, protéger les plus fragiles.",
  },
  {
    tag: "sovereignty",
    label: "Souveraineté nationale",
    description: "Reprendre le contrôle de nos frontières et de nos décisions.",
  },
];

export function getPromiseLabel(tag: PromiseTag): string {
  const p = PROMISE_POOL.find((x) => x.tag === tag);
  return p ? p.label : tag;
}
