export type OversightAuthorityId =
  | "haip"
  | "cms"
  | "apdc"
  | "clp"
  | "ccn"
  | "ccpu";

export interface OversightAuthorityDef {
  id: OversightAuthorityId;
  name: string;
  abbreviation: string;
  icon: string;
  domain: string;
}

export const OVERSIGHT_AUTHORITY_DEFS: Record<OversightAuthorityId, OversightAuthorityDef> = {
  haip: {
    id:           "haip",
    name:         "Haute Autorité d'Intégrité Publique",
    abbreviation: "H.A.I.P.",
    icon:         "scale-balance",
    domain:       "Intégrité publique & conflits d'intérêts",
  },
  cms: {
    id:           "cms",
    name:         "Commission des Marchés Stratégiques",
    abbreviation: "C.M.S.",
    icon:         "file-document-outline",
    domain:       "Marchés publics & appels d'offres",
  },
  apdc: {
    id:           "apdc",
    name:         "Autorité de Protection des Données Civiques",
    abbreviation: "A.P.D.C.",
    icon:         "shield-lock-outline",
    domain:       "Données civiles & cybersécurité",
  },
  clp: {
    id:           "clp",
    name:         "Conseil des Libertés Publiques",
    abbreviation: "C.L.P.",
    icon:         "text-box-check-outline",
    domain:       "Libertés fondamentales & droits civils",
  },
  ccn: {
    id:           "ccn",
    name:         "Cour des Comptes Nationale",
    abbreviation: "C.C.N.",
    icon:         "bank-outline",
    domain:       "Finances publiques & dette",
  },
  ccpu: {
    id:           "ccpu",
    name:         "Comité de Contrôle des Pouvoirs d'Urgence",
    abbreviation: "C.C.P.U.",
    icon:         "alert-octagon-outline",
    domain:       "Pouvoirs exceptionnels & état d'urgence",
  },
};

export const AUTHORITY_IDS: OversightAuthorityId[] = ["haip", "cms", "apdc", "clp", "ccn", "ccpu"];
