// Central image registry — all require() calls resolved at build time
// Reuses assets from the original game version

export const BG = {
  splash:      require("../assets/images/splash_bg_v2.png"),
  investiture: require("../assets/images/create/hero_investiture.png"),
  front:       require("../assets/images/screens/front_header.png"),
  journal:     require("../assets/images/journal/journal_header.png"),
  research:    require("../assets/images/screens/research_header.png"),
  cabinet:     require("../assets/images/screens/cabinet_header.png"),
  dashboard:   require("../assets/images/dashboard/dashboard_hero.png"),
} as const;

export const BUILDING_IMG: Record<string, any> = {
  presidential_palace: require("../assets/images/create/hero_investiture.png"),
  economy_ministry:    require("../assets/images/gauges/economy.png"),
  defense_ministry:    require("../assets/images/gauges/security.png"),
  intelligence_ministry: require("../assets/images/dashboard/icon_intel.png"),
  cyber_ministry:      require("../assets/images/research/cyber_security.png"),
  energy_ministry:     require("../assets/images/research/sovereign_energy.png"),
  diplomacy_ministry:  require("../assets/images/gauges/diplomacy.png"),
  research_center:     require("../assets/images/research/science_education.png"),
  central_bank:        require("../assets/images/gauges/budget.png"),
  media_agency:        require("../assets/images/meta/media.png"),
  military_hq:         require("../assets/images/countermeasures/military.png"),
};

export const RESOURCE_IMG: Record<string, any> = {
  money:        require("../assets/images/gauges/budget.png"),
  influence:    require("../assets/images/gauges/popularity.png"),
  energy:       require("../assets/images/research/sovereign_energy.png"),
  intelligence: require("../assets/images/dashboard/icon_intel.png"),
  technology:   require("../assets/images/research/science_education.png"),
  military:     require("../assets/images/gauges/security.png"),
  cyberDefense: require("../assets/images/research/cyber_security.png"),
};

export const NEWS_IMG: Record<string, any> = {
  cyber:          require("../assets/images/events/event_cyber.png"),
  economie:       require("../assets/images/events/event_economy.png"),
  social:         require("../assets/images/events/event_social.png"),
  diplomatie:     require("../assets/images/events/event_diplomacy.png"),
  guerre_hybride: require("../assets/images/hybrid/hybrid_warfare.png"),
  monde:          require("../assets/images/screens/front_header.png"),
  national:       require("../assets/images/events/event_regional.png"),
  classement:     require("../assets/images/home/mandate_seal.png"),
};

export const OPERATION_IMG: Record<string, any> = {
  espionage:            require("../assets/images/hybrid/vector_espionage.png"),
  cyber_attack:         require("../assets/images/hybrid/vector_cyber.png"),
  influence:            require("../assets/images/hybrid/vector_disinformation.png"),
  sanctions:            require("../assets/images/countermeasures/sanctions.png"),
  trade_deal:           require("../assets/images/gauges/economy.png"),
  military_threat:      require("../assets/images/countermeasures/military.png"),
  diplomatic_summit:    require("../assets/images/events/event_diplomacy.png"),
  propaganda:           require("../assets/images/hybrid/vector_social_manipulation.png"),
  infrastructure_attack: require("../assets/images/hybrid/vector_infrastructure_attack.png"),
  treaty:               require("../assets/images/gauges/diplomacy.png"),
};
