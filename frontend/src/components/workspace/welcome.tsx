"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

import { AuroraText } from "../ui/aurora-text";

let waved = false;

export function Welcome({
  className,
  mode,
}: {
  className?: string;
  mode?: "ultra" | "pro" | "thinking" | "flash";
}) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const isUltra = useMemo(() => mode === "ultra", [mode]);
  const colors = useMemo(() => {
    if (isUltra) {
      return ["#efefbb", "#e9c665", "#e3a812"];
    }
    return ["var(--color-foreground)"];
  }, [isUltra]);
  useEffect(() => {
    waved = true;
  }, []);
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col items-center justify-center gap-3 px-8 py-6 text-center",
        className,
      )}
    >
      <div className="text-2xl font-bold tracking-tight">
        {searchParams.get("mode") === "skill" ? (
          <div className="inline-flex items-center gap-2">
            <span className="animate-pulse">✨</span>
            <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              {t.welcome.createYourOwnSkill}
            </span>
            <span className="animate-pulse">✨</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "inline-block text-2xl transition-transform duration-300",
                !waved ? "animate-wave" : "hover:animate-wave"
              )}
            >
              {isUltra ? "🚀" : "👋"}
            </div>
            <AuroraText colors={colors}>{t.welcome.greeting}</AuroraText>
          </div>
        )}
      </div>
      {searchParams.get("mode") === "skill" ? (
        <div className="text-muted-foreground max-w-md text-sm leading-relaxed">
          {t.welcome.createYourOwnSkillDescription.includes("\n") ? (
            <pre className="font-sans whitespace-pre">
              {t.welcome.createYourOwnSkillDescription}
            </pre>
          ) : (
            <p>{t.welcome.createYourOwnSkillDescription}</p>
          )}
        </div>
      ) : (
        <div className="text-muted-foreground/80 max-w-md text-sm leading-relaxed">
          {t.welcome.description.includes("\n") ? (
            <pre className="whitespace-pre">{t.welcome.description}</pre>
          ) : (
            <p className="animate-fade-in">{t.welcome.description}</p>
          )}
        </div>
      )}
    </div>
  );
}
