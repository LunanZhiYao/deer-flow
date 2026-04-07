"use client";

import { useState, useEffect } from "react";

import { getSuggestionsConfig } from "./suggestions-api";
import type { SuggestionsConfig } from "./suggestions-api";

export function useSuggestionsConfig() {
  const [config, setConfig] = useState<SuggestionsConfig>({
    enabled: true,
    model_name: null,
    max_suggestions: 3,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getSuggestionsConfig();
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load suggestions config"));
        // 保留默认配置
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, isLoading, error };
}
