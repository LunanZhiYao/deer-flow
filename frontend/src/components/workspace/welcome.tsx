"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";

import { useI18n } from "@/core/i18n/hooks";
import { useAuth } from "@/core/auth";
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
  const { userId } = useAuth();
  const isUltra = useMemo(() => mode === "ultra", [mode]);
  const colors = useMemo(() => {
    if (isUltra) {
      return ["#E62B34"];
    }
    return ["var(--color-foreground)"];
  }, [isUltra]);
  
  useEffect(() => {
    waved = true;
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "mx-auto flex w-full flex-col items-center justify-center gap-6 px-8 py-8 text-center",
        className,
      )}
    >
      <div className="text-3xl font-bold tracking-tight">
        {searchParams.get("mode") === "skill" ? (
          <div className="inline-flex items-center gap-3">
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block text-4xl"
            >
              ✨
            </motion.span>
            <span className="text-4xl text-[#E62B34]">
              {t.welcome.createYourOwnSkill}
            </span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="inline-block text-4xl"
            >
              ✨
            </motion.span>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <motion.div
              animate={isUltra ? { scale: [1, 1.2, 1] } : { rotate: [0, 20, 0] }}
              transition={{ duration: isUltra ? 2 : 0.6, repeat: isUltra ? Infinity : 2 }}
              className={cn(
                "inline-block text-4xl",
              )}
            >
              {isUltra ? "🚀" : "👋"}
            </motion.div>
            <AuroraText colors={colors} className="text-4xl">
              {t.welcome.greeting}
            </AuroraText>
          </div>
        )}
      </div>
      
      {searchParams.get("mode") === "skill" ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-lg text-base leading-relaxed text-foreground/90"
        >
          {t.welcome.createYourOwnSkillDescription.includes("\n") ? (
            <pre className="whitespace-pre font-sans">
              {t.welcome.createYourOwnSkillDescription}
            </pre>
          ) : (
            <p>{t.welcome.createYourOwnSkillDescription}</p>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-lg text-base leading-relaxed text-foreground/90"
        >
          {t.welcome.description.includes("\n") ? (
            <pre className="whitespace-pre font-sans">{t.welcome.description}</pre>
          ) : (
            <p className="animate-fade-in">{t.welcome.description}</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
