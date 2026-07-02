"use client";

import {
  BarChart3,
  Clock,
  Gauge,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  TrendingUp,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/nav";
import { ThemeToggle } from "./theme-toggle";

const ICONS: Record<string, typeof Gauge> = {
  "/executivo": LayoutDashboard,
  "/jornada": Route,
  "/envelhecimento": Clock,
  "/progresso": Gauge,
  "/gargalos": TrendingUp,
  "/responsaveis": Users,
  "/comercial": BarChart3,
  "/closer": Trophy,
  "/reunioes": Video,
};

const STORAGE_KEY = "sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const groups = ["Operação", "Comercial"] as const;
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r bg-[var(--surface)] p-3 transition-[width] duration-200 ease-out ${
        mounted && collapsed ? "w-[68px]" : "w-64"
      }`}
    >
      {/* header */}
      <div
        className={`mb-6 flex items-center ${collapsed ? "justify-center" : "justify-between"} px-1`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--text-primary)] text-[11px] font-semibold text-[var(--page)]">
              C
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Catena</div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Dashboard
              </div>
            </div>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expandir" : "Recolher"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* nav */}
      <div className="flex-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g} className="mb-5">
            {!collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {g}
              </div>
            )}
            <nav className="flex flex-col gap-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = pathname === n.href;
                const Icon = ICONS[n.href] ?? Gauge;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    title={collapsed ? n.label : undefined}
                    className={`flex items-center gap-2.5 rounded-md border text-sm transition-colors ${
                      collapsed ? "h-9 w-9 justify-center self-center" : "px-2.5 py-2"
                    } ${
                      active
                        ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--page)]"
                        : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="flex-1">{n.label}</span>}
                    {!collapsed && n.phase && (
                      <span
                        className={
                          active
                            ? "text-[10px] text-[var(--page)]/60"
                            : "text-[10px] text-[var(--text-muted)]"
                        }
                      >
                        F{n.phase}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className={collapsed ? "flex justify-center" : ""}>
        <ThemeToggle collapsed={collapsed} />
      </div>
    </aside>
  );
}
