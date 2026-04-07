import { getBackendBaseURL } from "@/core/config";

export interface SuggestionsConfig {
  enabled: boolean;
  model_name: string | null;
  max_suggestions: number;
}

export async function getSuggestionsConfig(): Promise<SuggestionsConfig> {
  const response = await fetch(`${getBackendBaseURL()}/api/suggestions/config`);
  if (!response.ok) {
    throw new Error(`Failed to fetch suggestions config: ${response.statusText}`);
  }
  return response.json() as Promise<SuggestionsConfig>;
}
