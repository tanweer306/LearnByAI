"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeAwareLogoProps {
  className?: string;
}

export function ThemeAwareLogo({
  className = "h-10 w-auto",
}: ThemeAwareLogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent flash during hydration
  if (!mounted) {
    return <div className={className} data-oid="wbgci41" />;
  }

  const currentTheme = theme === "system" ? systemTheme : theme;
  const logoSrc =
    currentTheme === "dark"
      ? "/images/dark-theme-logo.png"
      : "/images/light-theme-logo.png";

  return (
    <img
      src={logoSrc}
      alt="LearnByAi Logo"
      className={className}
      data-oid="qwwcexz"
    />
  );
}
