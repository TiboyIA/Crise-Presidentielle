import type { AchievementId } from "@/types/strategy";

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  category: "politique" | "economie" | "securite" | "diplomatie" | "endurance";
}

export const ACHIEVEMENTS: Record<AchievementId, AchievementDef> = {
  premier_serment: {
    id: "premier_serment",
    title: "Premier Serment",
    description: "Lancer votre premier mandat",
    icon: "🏛️",
    category: "politique",
  },
  premiere_reforme: {
    id: "premiere_reforme",
    title: "Réformateur",
    description: "Compléter votre première réforme nationale",
    icon: "📜",
    category: "politique",
  },
  top3_mondial: {
    id: "top3_mondial",
    title: "Puissance Mondiale",
    description: "Atteindre le top 3 du classement mondial",
    icon: "🌍",
    category: "diplomatie",
  },
  economie_forte: {
    id: "economie_forte",
    title: "Économie Forte",
    description: "Porter l'indicateur économique au-dessus de 80",
    icon: "📈",
    category: "economie",
  },
  securite_max: {
    id: "securite_max",
    title: "État Sécurisé",
    description: "Porter l'indicateur sécurité au-dessus de 80",
    icon: "🛡️",
    category: "securite",
  },
  cyberbouclier: {
    id: "cyberbouclier",
    title: "Cyberbouclier",
    description: "Atteindre 80 de cyberdéfense",
    icon: "💻",
    category: "securite",
  },
  diplomate_etoile: {
    id: "diplomate_etoile",
    title: "Diplomate Étoile",
    description: "Avoir 3 pays alliés simultanément",
    icon: "🤝",
    category: "diplomatie",
  },
  bilan_excellent: {
    id: "bilan_excellent",
    title: "Bilan Excellent",
    description: "Obtenir un score de mandat supérieur à 80",
    icon: "⭐",
    category: "politique",
  },
  reformateur_senior: {
    id: "reformateur_senior",
    title: "Réformateur Senior",
    description: "Compléter 4 réformes nationales",
    icon: "🏆",
    category: "politique",
  },
  endurance: {
    id: "endurance",
    title: "L'Endurant",
    description: "Dépasser le jour 200 du mandat",
    icon: "⏳",
    category: "endurance",
  },
  grande_puissance: {
    id: "grande_puissance",
    title: "Grande Puissance",
    description: "Atteindre 300 de puissance globale",
    icon: "🌟",
    category: "politique",
  },
  populaire: {
    id: "populaire",
    title: "Chef Populaire",
    description: "Maintenir la popularité au-dessus de 85",
    icon: "❤️",
    category: "politique",
  },
};

export const ACHIEVEMENT_LIST: AchievementDef[] = Object.values(ACHIEVEMENTS);
