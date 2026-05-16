import { useContext } from "react";
import { useColorScheme } from "react-native";
import { ThemeContext } from "@/context/ThemeContext";
import baseColors from "@/constants/colors";

export function useColors() {
  const theme = useContext(ThemeContext);
  if (theme) return theme.colors;
  // Fallback when used outside ThemeProvider (e.g. Storybook, tests)
  const scheme = useColorScheme();
  const palette = scheme === "dark" ? baseColors.dark : baseColors.light;
  return { ...palette, radius: baseColors.radius };
}
