"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const Icon = mounted && isDark ? Sun : Moon;
  const label = mounted && isDark ? "Modo claro" : "Modo escuro";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
      className={`flex items-center gap-2 rounded-md border text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] ${
        collapsed ? "h-9 w-9 justify-center" : "w-full px-3 py-2"
      }`}
      aria-label={label}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
