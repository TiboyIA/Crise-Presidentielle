// ── Mode Confort de Commandement + Mode Une Main + Mode Faible Charge Mentale
//    + Profils d'accessibilité
//
// Les 3 toggles (enabled/oneHand/lowLoad) restent indépendants.
// Le profil actif ajuste : fontScale, spacingScale, animDuration, reducedInfo,
// extraConfirm, contrastBoost.
// Les fonctions fs() et pad() utilisent le max(profil, mode Confort) pour
// ne jamais réduire l'accessibilité si le mode Confort est actif.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { loadComfortStorage, saveComfortStorage } from "@/storage/comfortStorage";
import type { ComfortStorage } from "@/storage/comfortStorage";
import { PROFILES, PROFILE_LIST } from "@/constants/accessibilityProfiles";
import type { AccessibilityProfile, ProfileId } from "@/constants/accessibilityProfiles";

export interface ComfortContextValue {
  /** Mode Confort actif ou non */
  enabled: boolean;
  toggle: () => void;
  /** Échelle de taille de police : profil × confort, jamais en dessous de 1 */
  fs: (base: number) => number;
  /** Échelle de padding/gap : profil × confort, jamais en dessous de 1 */
  pad: (base: number) => number;
  /** Durée d'animation recommandée (ms) : 0 si confort, sinon valeur profil */
  animDuration: number;
  /** Mode Une Main actif ou non */
  oneHand: boolean;
  toggleOneHand: () => void;
  /** Mode Faible Charge Mentale actif ou non */
  lowLoad: boolean;
  toggleLowLoad: () => void;
  /** Profil d'accessibilité actif */
  profile: AccessibilityProfile;
  /** Change le profil actif et persiste */
  setProfile: (id: ProfileId) => void;
  /** Réduit la densité d'information sur les écrans clés */
  reducedInfo: boolean;
  /** Ajoute une confirmation pour toutes les actions (pas seulement offensives) */
  extraConfirm: boolean;
  /** Renforce les contrastes sur les valeurs textuelles */
  contrastBoost: boolean;
}

export { PROFILES, PROFILE_LIST };
export type { AccessibilityProfile, ProfileId };

export const ComfortContext = createContext<ComfortContextValue | null>(null);

export function ComfortProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ComfortStorage>({
    enabled: false, oneHand: false, lowLoad: false, profileId: "standard",
  });

  useEffect(() => {
    loadComfortStorage().then((s) => setPrefs(s));
  }, []);

  const toggle = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      void saveComfortStorage(next);
      return next;
    });
  }, []);

  const toggleOneHand = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, oneHand: !prev.oneHand };
      void saveComfortStorage(next);
      return next;
    });
  }, []);

  const toggleLowLoad = useCallback(() => {
    setPrefs((prev) => {
      const next = { ...prev, lowLoad: !prev.lowLoad };
      void saveComfortStorage(next);
      return next;
    });
  }, []);

  const setProfile = useCallback((id: ProfileId) => {
    setPrefs((prev) => {
      const next = { ...prev, profileId: id };
      void saveComfortStorage(next);
      return next;
    });
  }, []);

  const { enabled, oneHand, lowLoad, profileId } = prefs;
  const profile = PROFILES[profileId] ?? PROFILES.standard;

  // Mode Confort a ses propres valeurs fixes (rétrocompatibilité).
  // Le profil étend ces valeurs quand Confort est désactivé, ou
  // prend le max des deux quand les deux sont actifs.
  const finalFontScale    = enabled ? Math.max(1.13, profile.fontScale)  : profile.fontScale;
  const finalSpacingScale = enabled ? Math.max(1.35, profile.spacingScale) : profile.spacingScale;
  const animDuration      = enabled ? 0 : profile.animDuration;

  const fs  = useCallback((base: number) => Math.round(base * finalFontScale),    [finalFontScale]);
  const pad = useCallback((base: number) => Math.round(base * finalSpacingScale), [finalSpacingScale]);

  const value = useMemo<ComfortContextValue>(() => ({
    enabled, toggle, fs, pad,
    animDuration,
    oneHand, toggleOneHand,
    lowLoad, toggleLowLoad,
    profile, setProfile,
    reducedInfo:   profile.reducedInfo,
    extraConfirm:  profile.extraConfirm,
    contrastBoost: profile.contrastBoost,
  }), [
    enabled, toggle, fs, pad, animDuration,
    oneHand, toggleOneHand,
    lowLoad, toggleLowLoad,
    profile, setProfile,
  ]);

  return (
    <ComfortContext.Provider value={value}>
      {children}
    </ComfortContext.Provider>
  );
}

export function useComfort(): ComfortContextValue {
  const ctx = useContext(ComfortContext);
  if (!ctx) throw new Error("useComfort must be used inside ComfortProvider");
  return ctx;
}
