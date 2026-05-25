import type { StrategyMinisterId } from "@/data/strategyMinisters";

export interface MinisterCandidate {
  id: string;
  name: string;
  domain: string;
  competence: number;        // 0-100
  loyalty: number;           // 0-100
  charisma: number;          // 0-100
  integrity: number;         // 0-100
  crisisExperience: number;  // 0-100
  politicalCost: number;     // 0-100  — disruption de la nomination
  appointmentRisk: number;   // 0-100  — risque médiatique post-nomination
}

// 3 candidats par poste, profils variés :
//  _01 = technocrate compétent (modéré en loyauté, coût modéré)
//  _02 = fidèle loyal (compétence correcte, faible coût)
//  _03 = réformateur charismatique (haut coût + risque, fort potentiel)

export const CANDIDATE_POOL: Record<StrategyMinisterId, MinisterCandidate[]> = {
  pm: [
    { id: "pm_01", name: "Clarisse Veuillot",     domain: "Gouvernance",         competence: 73, loyalty: 76, charisma: 67, integrity: 76, crisisExperience: 66, politicalCost: 30, appointmentRisk: 18 },
    { id: "pm_02", name: "Renaud Thibodeau",       domain: "Gouvernance",         competence: 65, loyalty: 88, charisma: 52, integrity: 83, crisisExperience: 56, politicalCost: 16, appointmentRisk: 11 },
    { id: "pm_03", name: "Amélie Sauvageon",       domain: "Gouvernance",         competence: 83, loyalty: 57, charisma: 80, integrity: 62, crisisExperience: 78, politicalCost: 58, appointmentRisk: 46 },
  ],
  economie: [
    { id: "eco_01", name: "Sylvain Rouzard",       domain: "Économie",            competence: 82, loyalty: 65, charisma: 54, integrity: 72, crisisExperience: 74, politicalCost: 38, appointmentRisk: 24 },
    { id: "eco_02", name: "Delphine Bertholet",    domain: "Économie",            competence: 70, loyalty: 82, charisma: 62, integrity: 79, crisisExperience: 58, politicalCost: 20, appointmentRisk: 14 },
    { id: "eco_03", name: "Éric Lamarre",          domain: "Économie",            competence: 77, loyalty: 52, charisma: 74, integrity: 54, crisisExperience: 68, politicalCost: 57, appointmentRisk: 52 },
  ],
  defense: [
    { id: "def_01", name: "Patricia Godin",        domain: "Sécurité",            competence: 76, loyalty: 72, charisma: 60, integrity: 82, crisisExperience: 84, politicalCost: 30, appointmentRisk: 16 },
    { id: "def_02", name: "Édouard Perdriau",      domain: "Sécurité",            competence: 68, loyalty: 86, charisma: 54, integrity: 74, crisisExperience: 76, politicalCost: 18, appointmentRisk: 12 },
    { id: "def_03", name: "Marianne Devaux",       domain: "Sécurité",            competence: 84, loyalty: 58, charisma: 70, integrity: 64, crisisExperience: 80, politicalCost: 62, appointmentRisk: 42 },
  ],
  affaires_etrangeres: [
    { id: "ae_01",  name: "Luc Castellan",         domain: "Diplomatie",          competence: 80, loyalty: 68, charisma: 73, integrity: 76, crisisExperience: 70, politicalCost: 34, appointmentRisk: 22 },
    { id: "ae_02",  name: "Aurore Monroux",        domain: "Diplomatie",          competence: 73, loyalty: 84, charisma: 64, integrity: 82, crisisExperience: 62, politicalCost: 18, appointmentRisk: 13 },
    { id: "ae_03",  name: "Victor Vergniaux",      domain: "Diplomatie",          competence: 86, loyalty: 52, charisma: 82, integrity: 57, crisisExperience: 80, politicalCost: 66, appointmentRisk: 56 },
  ],
  ecologie: [
    { id: "eco2_01", name: "Véronique Ferrier",    domain: "Écologie",            competence: 76, loyalty: 67, charisma: 71, integrity: 79, crisisExperience: 63, politicalCost: 34, appointmentRisk: 27 },
    { id: "eco2_02", name: "Baptiste Chaillot",    domain: "Écologie",            competence: 65, loyalty: 84, charisma: 57, integrity: 83, crisisExperience: 52, politicalCost: 16, appointmentRisk: 11 },
    { id: "eco2_03", name: "Sandrine Rousselin",   domain: "Écologie",            competence: 79, loyalty: 54, charisma: 77, integrity: 64, crisisExperience: 73, politicalCost: 56, appointmentRisk: 44 },
  ],
  sante: [
    { id: "san_01", name: "Nicolas Gardin",        domain: "Santé publique",      competence: 83, loyalty: 65, charisma: 62, integrity: 81, crisisExperience: 79, politicalCost: 36, appointmentRisk: 19 },
    { id: "san_02", name: "Françoise Laubert",     domain: "Santé publique",      competence: 71, loyalty: 82, charisma: 59, integrity: 76, crisisExperience: 66, politicalCost: 20, appointmentRisk: 15 },
    { id: "san_03", name: "Thierry Mesnil",        domain: "Santé publique",      competence: 77, loyalty: 57, charisma: 73, integrity: 59, crisisExperience: 71, politicalCost: 54, appointmentRisk: 46 },
  ],
  cybersecurite: [
    { id: "cyb_01", name: "Diane Colonna",         domain: "Cyber",               competence: 90, loyalty: 62, charisma: 50, integrity: 79, crisisExperience: 82, politicalCost: 42, appointmentRisk: 20 },
    { id: "cyb_02", name: "Renaud Dujardin",       domain: "Cyber",               competence: 81, loyalty: 76, charisma: 55, integrity: 83, crisisExperience: 73, politicalCost: 24, appointmentRisk: 13 },
    { id: "cyb_03", name: "Marlène Frimont",       domain: "Cyber",               competence: 86, loyalty: 54, charisma: 67, integrity: 67, crisisExperience: 79, politicalCost: 60, appointmentRisk: 38 },
  ],
  renseignement: [
    { id: "ren_01", name: "Julien Noblat",         domain: "Renseignement",       competence: 81, loyalty: 76, charisma: 51, integrity: 86, crisisExperience: 87, politicalCost: 26, appointmentRisk: 14 },
    { id: "ren_02", name: "Christiane Escoffier",  domain: "Renseignement",       competence: 76, loyalty: 84, charisma: 57, integrity: 80, crisisExperience: 79, politicalCost: 18, appointmentRisk: 11 },
    { id: "ren_03", name: "Fabien Pellegrin",      domain: "Renseignement",       competence: 86, loyalty: 57, charisma: 64, integrity: 67, crisisExperience: 84, politicalCost: 56, appointmentRisk: 44 },
  ],
  interieur: [
    { id: "int_01", name: "Marion Audras",         domain: "Sécurité intérieure", competence: 77, loyalty: 73, charisma: 65, integrity: 77, crisisExperience: 76, politicalCost: 34, appointmentRisk: 27 },
    { id: "int_02", name: "Philippe Lhomme",       domain: "Sécurité intérieure", competence: 68, loyalty: 87, charisma: 57, integrity: 81, crisisExperience: 69, politicalCost: 18, appointmentRisk: 13 },
    { id: "int_03", name: "Annick Pleynet",        domain: "Sécurité intérieure", competence: 82, loyalty: 54, charisma: 73, integrity: 61, crisisExperience: 79, politicalCost: 60, appointmentRisk: 50 },
  ],
  industrie: [
    { id: "ind_01", name: "Cédric Duchesne",       domain: "Économie industrielle", competence: 81, loyalty: 68, charisma: 60, integrity: 73, crisisExperience: 71, politicalCost: 35, appointmentRisk: 24 },
    { id: "ind_02", name: "Laure Varambault",      domain: "Économie industrielle", competence: 73, loyalty: 83, charisma: 57, integrity: 79, crisisExperience: 63, politicalCost: 20, appointmentRisk: 14 },
    { id: "ind_03", name: "Marc-Antoine Combelles", domain: "Économie industrielle", competence: 83, loyalty: 54, charisma: 76, integrity: 57, crisisExperience: 76, politicalCost: 63, appointmentRisk: 53 },
  ],
  communication: [
    { id: "com_01", name: "Bénédicte Quinet",      domain: "Médias",              competence: 73, loyalty: 76, charisma: 83, integrity: 76, crisisExperience: 66, politicalCost: 28, appointmentRisk: 21 },
    { id: "com_02", name: "Stéphane Deschênes",    domain: "Médias",              competence: 65, loyalty: 89, charisma: 71, integrity: 81, crisisExperience: 58, politicalCost: 16, appointmentRisk: 11 },
    { id: "com_03", name: "Corinne Marcillat",     domain: "Médias",              competence: 76, loyalty: 54, charisma: 90, integrity: 57, crisisExperience: 71, politicalCost: 57, appointmentRisk: 52 },
  ],
};
