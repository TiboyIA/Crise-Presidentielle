import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import baseColors from "@/constants/colors";
import { FREE_THEME_ID, getTheme, type ThemeDef, type ThemeId } from "@/data/themes";
import { loadThemeStorage, saveThemeStorage, type ThemeStorage } from "@/storage/themes";

type ColorPalette = typeof baseColors.light & { radius: number };

export interface ThemeContextValue {
  colors: ColorPalette;
  selectedTheme: ThemeDef;
  ownedThemeIds: ThemeId[];
  isOwned: (id: ThemeId) => boolean;
  selectTheme: (id: ThemeId) => void;
  grantTheme: (id: ThemeId) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function buildColors(themeId: ThemeId): ColorPalette {
  const theme = getTheme(themeId);
  return { ...baseColors.light, ...theme.overrides, radius: baseColors.radius };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ThemeStorage>({
    selectedThemeId: FREE_THEME_ID,
    ownedThemeIds: [FREE_THEME_ID],
  });

  useEffect(() => {
    loadThemeStorage().then(setData);
  }, []);

  const persist = useCallback((next: ThemeStorage) => {
    setData(next);
    void saveThemeStorage(next);
  }, []);

  const selectTheme = useCallback(
    (id: ThemeId) => {
      if (!data.ownedThemeIds.includes(id)) return;
      persist({ ...data, selectedThemeId: id });
    },
    [data, persist],
  );

  const grantTheme = useCallback(
    (id: ThemeId) => {
      if (data.ownedThemeIds.includes(id)) return;
      persist({ selectedThemeId: id, ownedThemeIds: [...data.ownedThemeIds, id] });
    },
    [data, persist],
  );

  const isOwned = useCallback(
    (id: ThemeId) => data.ownedThemeIds.includes(id),
    [data],
  );

  return (
    <ThemeContext.Provider
      value={{
        colors: buildColors(data.selectedThemeId),
        selectedTheme: getTheme(data.selectedThemeId),
        ownedThemeIds: data.ownedThemeIds,
        isOwned,
        selectTheme,
        grantTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
