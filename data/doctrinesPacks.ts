import type { GovernanceDoctrine } from "@/types/strategy";

export const DOCTRINE_PACK = {
  id: "politiques_avancees" as const,
  title: "Bundle Politiques Avancées",
  price: "2,99 €",
  doctrines: ["souverainiste", "ecologiste", "liberal"] as GovernanceDoctrine[],
};

export const FREE_DOCTRINES = new Set<GovernanceDoctrine>([
  "democratique", "technocratique", "securitaire", "populiste", "autoritaire",
]);

export function isDoctrineInPack(id: GovernanceDoctrine): boolean {
  return DOCTRINE_PACK.doctrines.includes(id);
}
