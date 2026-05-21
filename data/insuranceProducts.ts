import type { InsuranceProductId } from "@/types/strategy";

export interface InsuranceProductDef {
  id: InsuranceProductId;
  name: string;
  icon: string;
  coveredRisk: string;
  coveredEventIds: string[];
  coveredNewsTypes: string[];
  basePremiumCost: number;
  coverageRate: number;
  deductible: number;
  maxPayout: number;
  riskLabel: string;
  color: string;
}

export const INSURANCE_PRODUCTS: Record<InsuranceProductId, InsuranceProductDef> = {
  cyber: {
    id: "cyber",
    name: "Assurance Cyber",
    icon: "🛡️",
    coveredRisk: "Cyberattaques sur les infrastructures nationales",
    coveredEventIds: ["cyber_power_grid", "cyber_banking", "world_russia_cyber", "world_cyber_forum"],
    coveredNewsTypes: ["cyber"],
    basePremiumCost: 200,
    coverageRate: 0.6,
    deductible: 80,
    maxPayout: 600,
    riskLabel: "Cyberdéfense",
    color: "#4a9fff",
  },
  climat: {
    id: "climat",
    name: "Assurance Climatique",
    icon: "🌡️",
    coveredRisk: "Crises climatiques et catastrophes naturelles",
    coveredEventIds: ["heatwave_crisis", "ecological_disaster", "world_climate_summit"],
    coveredNewsTypes: [],
    basePremiumCost: 150,
    coverageRate: 0.5,
    deductible: 60,
    maxPayout: 400,
    riskLabel: "Écologie",
    color: "#52c97a",
  },
  energie: {
    id: "energie",
    name: "Assurance Énergétique",
    icon: "⚡",
    coveredRisk: "Pénuries et chocs sur l'approvisionnement énergétique",
    coveredEventIds: ["fuel_shortage", "blackout_national", "energy_blackmail_crisis", "world_energy_crisis"],
    coveredNewsTypes: [],
    basePremiumCost: 180,
    coverageRate: 0.55,
    deductible: 70,
    maxPayout: 500,
    riskLabel: "Énergie",
    color: "#f59e0b",
  },
  dette: {
    id: "dette",
    name: "Assurance Dette",
    icon: "🏦",
    coveredRisk: "Crises de la dette souveraine et déficit budgétaire",
    coveredEventIds: ["debt_crisis", "debt_crisis_event", "debt_escalation"],
    coveredNewsTypes: [],
    basePremiumCost: 250,
    coverageRate: 0.45,
    deductible: 120,
    maxPayout: 700,
    riskLabel: "Dette souveraine",
    color: "#e8a93a",
  },
  industrie: {
    id: "industrie",
    name: "Assurance Industrielle",
    icon: "🏭",
    coveredRisk: "Récessions et chocs économiques structurels",
    coveredEventIds: ["economic_recession", "industrial_disaster", "inflation_spike"],
    coveredNewsTypes: [],
    basePremiumCost: 200,
    coverageRate: 0.5,
    deductible: 100,
    maxPayout: 500,
    riskLabel: "Économie nationale",
    color: "#a78bfa",
  },
  troubles_sociaux: {
    id: "troubles_sociaux",
    name: "Assurance Sociale",
    icon: "✊",
    coveredRisk: "Troubles civils, grèves et mouvements sociaux",
    coveredEventIds: ["social_unrest", "transport_strike", "artisan_revolt"],
    coveredNewsTypes: [],
    basePremiumCost: 180,
    coverageRate: 0.55,
    deductible: 80,
    maxPayout: 450,
    riskLabel: "Cohésion sociale",
    color: "#e54848",
  },
};

export const INSURANCE_PRODUCT_LIST: InsuranceProductDef[] = Object.values(INSURANCE_PRODUCTS);
