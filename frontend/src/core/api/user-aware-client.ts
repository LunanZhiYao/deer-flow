/**
 * 用户感知的API客户端
 * 
 * 该模块包装LangGraph SDK的Client，自动在请求中添加用户ID，
 * 确保用户数据隔离。
 */
import { Client as LangGraphClient } from "@langchain/langgraph-sdk/client";
import { getLangGraphBaseURL } from "../config";
import { useUserId } from "../auth";
import { sanitizeRunStreamOptions } from "./stream-mode";

/**
 * 创建支持用户隔离的LangGraph客户端
 * 
 * @param userId - 用户ID
 * @param isMock - 是否使用mock模式
 * @returns LangGraph客户端实例
 */
function createUserAwareClient(userId: string | null, isMock?: boolean): LangGraphClient {
  const client = new LangGraphClient({
    apiUrl: getLangGraphBaseURL(isMock),
    defaultHeaders: userId ? {
      "X-User-ID": userId,
    } : undefined,
  });

  // 包装原始的runStream方法
  const originalRunStream = client.runs.stream.bind(client.runs);
  client.runs.stream = ((threadId, assistantId, payload) => {
    // 在payload中添加用户ID到context
    const enhancedPayload = {
      ...payload,
      context: {
        ...payload.context,
        user_id: userId,
      },
    };
    return originalRunStream(
      threadId,
      assistantId,
      sanitizeRunStreamOptions(enhancedPayload),
    );
  }) as typeof client.runs.stream;

  // 包装原始的joinStream方法
  const originalJoinStream = client.runs.joinStream.bind(client.runs);
  client.runs.joinStream = ((threadId, runId, options) => {
    const enhancedOptions = {
      ...options,
      context: {
        ...options?.context,
        user_id: userId,
      },
    };
    return originalJoinStream(
      threadId,
      runId,
      sanitizeRunStreamOptions(enhancedOptions),
    );
  }) as typeof client.runs.joinStream;

  // 包装线程创建方法，添加用户ID到metadata
  const originalCreateThread = client.threads.create.bind(client.threads);
  client.threads.create = ((payload?: any) => {
    const enhancedPayload = {
      ...payload,
      metadata: {
        ...payload?.metadata,
        user_id: userId,
      },
    };
    return originalCreateThread(enhancedPayload);
  }) as typeof client.threads.create;

  // 包装线程搜索方法，添加用户ID过滤
  const originalSearchThreads = client.threads.search.bind(client.threads);
  client.threads.search = ((params?: any) => {
    const enhancedParams = {
      ...params,
      metadata: {
        ...params?.metadata,
        user_id: userId,
      },
    };
    return originalSearchThreads(enhancedParams);
  }) as typeof client.threads.search;

  return client;
}

// 客户端缓存
const _clients = new Map<string, LangGraphClient>();

/**
 * 获取API客户端（带用户ID）
 * 
 * 这个函数应该在React组件中使用，因为它需要获取当前用户ID。
 * 
 * @param isMock - 是否使用mock模式
 * @returns LangGraph客户端实例
 */
export function getAPIClient(isMock?: boolean): LangGraphClient {
  // 注意：这个函数不使用用户ID，保持向后兼容
  const cacheKey = isMock ? "mock" : "default";
  let client = _clients.get(cacheKey);

  if (!client) {
    client = createUserAwareClient(null, isMock);
    _clients.set(cacheKey, client);
  }

  return client;
}

/**
 * 获取用户感知的API客户端
 * 
 * 这个函数需要传入用户ID，用于需要用户数据隔离的场景。
 * 
 * @param userId - 用户ID
 * @param isMock - 是否使用mock模式
 * @returns LangGraph客户端实例
 */
export function getUserAwareAPIClient(userId: string | null, isMock?: boolean): LangGraphClient {
  const cacheKey = userId ? `${isMock ? "mock" : "default"}-${userId}` : (isMock ? "mock" : "default");
  let client = _clients.get(cacheKey);

  if (!client) {
    client = createUserAwareClient(userId, isMock);
    _clients.set(cacheKey, client);
  }

  return client;
}

/**
 * React Hook: 获取用户感知的API客户端
 * 
 * 自动从认证上下文中获取用户ID，并创建支持用户数据隔离的API客户端。
 * 
 * @param isMock - 是否使用mock模式
 * @returns LangGraph客户端实例
 */
export function useUserAwareAPIClient(isMock?: boolean): LangGraphClient {
  const userId = useUserId();
  return getUserAwareAPIClient(userId, isMock);
}
