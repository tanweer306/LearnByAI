"use client"; // Must be first line

import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

// Extract props type safely
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
