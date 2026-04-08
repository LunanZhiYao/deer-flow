import { env } from "@/env";

function getBaseOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return undefined;
}

export function getBackendBaseURL() {
  if (typeof window !== "undefined") {
    return "";
  }
  if (env.NEXT_PUBLIC_BACKEND_BASE_URL) {
    return new URL(env.NEXT_PUBLIC_BACKEND_BASE_URL, "http://localhost:2026")
      .toString()
      .replace(/\/+$/, "");
  }
  return "http://gateway:8001";
}

// 添加手动控制开关suggestion
export function isSuggestionsEnabled(): boolean {
  const value = env.NEXT_PUBLIC_ENABLE_SUGGESTIONS;
  if (value === undefined || value === "") {
    return false;
  }
  return value.toLowerCase() === "true" || value === "1";
}


export function getLangGraphBaseURL(isMock?: boolean) {
  if (env.NEXT_PUBLIC_LANGGRAPH_BASE_URL) {
    return new URL(
      env.NEXT_PUBLIC_LANGGRAPH_BASE_URL,
      getBaseOrigin(),
    ).toString();
  } else if (isMock) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/mock/api`;
    }
    return "http://localhost:3000/mock/api";
  } else {
    // LangGraph SDK requires a full URL, construct it from current origin
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/langgraph`;
    }
    // Fallback for SSR
    return "http://localhost:2026/api/langgraph";
  }
}
