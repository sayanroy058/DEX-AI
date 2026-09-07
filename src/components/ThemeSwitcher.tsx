import { useEffect, useState } from "react";
import { Sun, Moon, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyTheme, readTheme, type ThemeMode } from "@/lib/theme";

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "other", label: "Other", icon: Palette },
];

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>(readTheme);

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      if (next) setTheme(next);
    };
    window.addEventListener("dex-theme-change", onThemeChange as EventListener);
    return () => window.removeEventListener("dex-theme-change", onThemeChange as EventListener);
  }, []);

  return (
    <div className={cn("flex w-full items-center gap-1 rounded-lg border border-border/60 bg-muted/20 p-1", compact && "p-0.5")}>
      {THEMES.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={theme === t.id}
            onClick={() => {
              setTheme(t.id);
              applyTheme(t.id);
            }}
            className={cn(
              "h-7 min-w-0 flex-1 justify-center px-2 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
              compact ? "h-6 px-2 text-[11px]" : "",
              theme === t.id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
            title={t.label}
          >
            <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            <span className={cn("truncate", compact ? "hidden sm:inline" : "")}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
