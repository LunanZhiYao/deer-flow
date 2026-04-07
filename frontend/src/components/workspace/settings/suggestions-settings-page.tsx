"use client";

import { useI18n } from "@/core/i18n/hooks";
import { useSuggestionsConfig } from "@/core/api/use-suggestions-config";
import { SettingsSection } from "./settings-section";

export function SuggestionsSettingsPage() {
  const { t } = useI18n();
  const { config, isLoading, error } = useSuggestionsConfig();

  return (
    <SettingsSection
      title={t.settings.sections.suggestions}
      description={t.settings.suggestions.description}
    >
      {isLoading ? (
        <div className="text-muted-foreground text-sm">
          {t.common.loading}
        </div>
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t.settings.suggestions.enabled}
              </label>
              <p className="text-muted-foreground text-sm">
                {t.settings.suggestions.enabledDescription}
              </p>
            </div>
            <div className="text-lg font-semibold">
              {config.enabled ? t.common.yes : t.common.no}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t.settings.suggestions.maxSuggestions}
              </label>
              <p className="text-muted-foreground text-sm">
                {t.settings.suggestions.maxSuggestionsDescription}
              </p>
            </div>
            <div className="text-lg font-semibold">
              {config.max_suggestions}
            </div>
          </div>

          {config.model_name && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  {t.settings.suggestions.modelName}
                </label>
                <p className="text-muted-foreground text-sm">
                  {t.settings.suggestions.modelNameDescription}
                </p>
              </div>
              <div className="text-lg font-semibold">
                {config.model_name}
              </div>
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
