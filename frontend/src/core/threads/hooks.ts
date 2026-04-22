import type { AIMessage, Message } from "@langchain/langgraph-sdk";
import type { ThreadsClient } from "@langchain/langgraph-sdk/client";
import { useStream } from "@langchain/langgraph-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

import { useUserAwareAPIClient } from "../api/user-aware-client";
import { getBackendBaseURL } from "../config";
import { useI18n } from "../i18n/hooks";
import type { FileInMessage } from "../messages/utils";
import type { LocalSettings } from "../settings";
import { useUpdateSubtask } from "../tasks/context";
import type { UploadedFileInfo } from "../uploads";
import { uploadFiles } from "../uploads";

import type { AgentThread, AgentThreadState } from "./types";

export type ToolEndEvent = {
  name: string;
  data: unknown;
};

export type StreamHintStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "calling_api"
  | "thinking"
  | "streaming"
  | "writing"
  | "searching";

export type ThreadStreamOptions = {
  threadId?: string | null | undefined;
  context: LocalSettings["context"];
  isMock?: boolean;
  onStart?: (threadId: string) => void;
  onFinish?: (state: AgentThreadState) => void;
  onToolEnd?: (event: ToolEndEvent) => void;
};

type MessagePerfTrace = {
  traceId: string;
  clickAt: number;
  streamStartAt?: number;
  llmStartAt?: number;
  llmEndAt?: number;
};

declare global {
  interface Window {
    openLog?: () => void;
    closeLog?: () => void;
  }
}

let timelineLogEnabled = false;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getEventRunId(event: { run_id?: unknown; runId?: unknown }): string {
  if (typeof event.run_id === "string" && event.run_id.length > 0) {
    return event.run_id;
  }
  if (typeof event.runId === "string" && event.runId.length > 0) {
    return event.runId;
  }
  return "";
}

function isFileWriteToolEvent(toolName: string, data: unknown): boolean {
  if (toolName === "write_file" || toolName === "str_replace") {
    return true;
  }
  if (toolName !== "bash") {
    return false;
  }
  const command =
    asRecord(data)?.input && asRecord(asRecord(data)?.input)?.command;
  if (typeof command !== "string") {
    return false;
  }
  return /(touch\s+|>>|[^>]>\s*|tee\s+|cat\s+<<|echo\s+.+>)/.test(command);
}

function formatZhTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.toLocaleString("zh-CN", { hour12: false })}.${String(date.getMilliseconds()).padStart(3, "0")}`;
}

function isTimelineLogEnabled(): boolean {
  return timelineLogEnabled;
}

function ensureTimelineLogToggleMethods() {
  if (typeof window === "undefined") {
    return;
  }
  if (typeof window.openLog !== "function") {
    window.openLog = () => {
      timelineLogEnabled = true;
      console.info("[消息链路日志] 已开启");
    };
  }
  if (typeof window.closeLog !== "function") {
    window.closeLog = () => {
      timelineLogEnabled = false;
      console.info("[消息链路日志] 已关闭");
    };
  }
}

function logTimeline(message: string, meta?: Record<string, unknown>) {
  // TODO: 临时链路日志（排查发送/流式/工具耗时），稳定后可删除。
  ensureTimelineLogToggleMethods();
  if (!isTimelineLogEnabled()) {
    return;
  }
  if (meta) {
    console.log(`[消息链路日志] ${message}`, meta);
    return;
  }
  console.log(`[消息链路日志] ${message}`);
}

function clearAllToolProgressTimers(
  timers: Map<string, number>,
  starts: Map<string, number>,
) {
  for (const timerId of timers.values()) {
    window.clearInterval(timerId);
  }
  timers.clear();
  starts.clear();
}

function getStreamErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    const message = Reflect.get(error, "message");
    if (typeof message === "string" && message.trim()) {
      return message;
    }
    const nestedError = Reflect.get(error, "error");
    if (nestedError instanceof Error && nestedError.message.trim()) {
      return nestedError.message;
    }
    if (typeof nestedError === "string" && nestedError.trim()) {
      return nestedError;
    }
  }
  return "Request failed.";
}

export function useThreadStream({
  threadId,
  context,
  isMock,
  onStart,
  onFinish,
  onToolEnd,
}: ThreadStreamOptions) {
  const { t } = useI18n();
  // 使用用户感知的API客户端，确保用户数据隔离
  const apiClient = useUserAwareAPIClient(isMock);
  // Track the thread ID that is currently streaming to handle thread changes during streaming
  const [onStreamThreadId, setOnStreamThreadId] = useState(() => threadId);
  // Ref to track current thread ID across async callbacks without causing re-renders,
  // and to allow access to the current thread id in onUpdateEvent
  const threadIdRef = useRef<string | null>(threadId ?? null);
  const startedRef = useRef(false);
  const perfTraceRef = useRef<MessagePerfTrace | null>(null);
  const toolStartAtRef = useRef<Map<string, number>>(new Map());
  const toolProgressTimerRef = useRef<Map<string, number>>(new Map());
  const [streamHintStage, setStreamHintStage] = useState<StreamHintStage>("idle");

  const listeners = useRef({
    onStart,
    onFinish,
    onToolEnd,
  });

  // Keep listeners ref updated with latest callbacks
  useEffect(() => {
    listeners.current = { onStart, onFinish, onToolEnd };
  }, [onStart, onFinish, onToolEnd]);

  useEffect(() => {
    const normalizedThreadId = threadId ?? null;
    if (!normalizedThreadId) {
      // Just reset for new thread creation when threadId becomes null/undefined
      startedRef.current = false;
      setOnStreamThreadId(normalizedThreadId);
    }
    threadIdRef.current = normalizedThreadId;
  }, [threadId]);

  useEffect(() => {
    ensureTimelineLogToggleMethods();
  }, []);

  const _handleOnStart = useCallback((id: string) => {
    if (!startedRef.current) {
      listeners.current.onStart?.(id);
      startedRef.current = true;
      const trace = perfTraceRef.current;
      if (trace && !trace.streamStartAt) {
        trace.streamStartAt = Date.now();
        setStreamHintStage("streaming");
        logTimeline("流式输出开始", {
          追踪ID: trace.traceId,
          时间: formatZhTime(trace.streamStartAt),
        });
      }
    }
  }, []);

  const handleStreamStart = useCallback(
    (_threadId: string) => {
      threadIdRef.current = _threadId;
      _handleOnStart(_threadId);
    },
    [_handleOnStart],
  );

  const queryClient = useQueryClient();
  const updateSubtask = useUpdateSubtask();

  const thread = useStream<AgentThreadState>({
    client: apiClient,
    assistantId: "lead_agent",
    threadId: onStreamThreadId,
    reconnectOnMount: true,
    fetchStateHistory: { limit: 1 },
    onCreated(meta) {
      handleStreamStart(meta.thread_id);
      setOnStreamThreadId(meta.thread_id);
    },
    onLangChainEvent(event) {
      // TODO: 临时链路日志相关事件处理（模型开始/结束、文件写入进度），后续可整体移除。
      // logTimeline("收到LangChain事件", {
      //   事件名: event.event,
      //   节点名: event.name,
      // });
      const trace = perfTraceRef.current;
      if (event.event === "on_chat_model_start") {
        if (trace) {
          trace.llmStartAt = Date.now();
          setStreamHintStage("thinking");
          logTimeline("大模型调用开始", {
            追踪ID: trace.traceId,
            时间: formatZhTime(trace.llmStartAt),
          });
        }
      }
      if (event.event === "on_chat_model_stream" && trace && !trace.streamStartAt) {
        trace.streamStartAt = Date.now();
        setStreamHintStage("streaming");
        logTimeline("流式输出开始", {
          追踪ID: trace.traceId,
          时间: formatZhTime(trace.streamStartAt),
        });
      }
      if (event.event === "on_chat_model_end") {
        if (trace) {
          trace.llmEndAt = Date.now();
          const llmDuration = trace.llmStartAt
            ? trace.llmEndAt - trace.llmStartAt
            : undefined;
          logTimeline("大模型调用结束", {
            追踪ID: trace.traceId,
            时间: formatZhTime(trace.llmEndAt),
            ...(llmDuration !== undefined
              ? { 大模型调用耗时毫秒: llmDuration }
              : {}),
          });
        }
      }
      if (event.event === "on_tool_start") {
        const runId = getEventRunId(event);
        const startAt = Date.now();
        if (runId) {
          toolStartAtRef.current.set(runId, startAt);
        }
        if (isFileWriteToolEvent(event.name, event.data)) {
          setStreamHintStage("writing");
          logTimeline("文件创建/写入开始", {
            追踪ID: trace?.traceId,
            工具: event.name,
            时间: formatZhTime(startAt),
          });
        } else {
          setStreamHintStage("searching");
        }
      }
      if (event.event === "on_tool_end") {
        const runId = getEventRunId(event);
        const startAt = runId ? toolStartAtRef.current.get(runId) : undefined;
        if (runId) {
          toolStartAtRef.current.delete(runId);
        }
        if (isFileWriteToolEvent(event.name, event.data)) {
          const endAt = Date.now();
          logTimeline("文件创建/写入完成", {
            追踪ID: trace?.traceId,
            工具: event.name,
            时间: formatZhTime(endAt),
            ...(startAt ? { 文件操作耗时毫秒: endAt - startAt } : {}),
          });
        }
        if (trace) {
          setStreamHintStage("thinking");
        }
        listeners.current.onToolEnd?.({
          name: event.name,
          data: event.data,
        });
      }
    },
    onUpdateEvent(data) {
      const updates: Array<Partial<AgentThreadState> | null> = Object.values(
        data || {},
      );
      for (const update of updates) {
        if (update && "title" in update && update.title) {
          void queryClient.setQueriesData(
            {
              queryKey: ["threads", "search"],
              exact: false,
            },
            (oldData: Array<AgentThread> | undefined) => {
              return oldData?.map((t) => {
                if (t.thread_id === threadIdRef.current) {
                  return {
                    ...t,
                    values: {
                      ...t.values,
                      title: update.title,
                    },
                  };
                }
                return t;
              });
            },
          );
        }
      }
    },
    onCustomEvent(event: unknown) {
      if (
        typeof event === "object" &&
        event !== null &&
        "type" in event &&
        event.type === "task_running"
      ) {
        const e = event as {
          type: "task_running";
          task_id: string;
          message: AIMessage;
        };
        updateSubtask({ id: e.task_id, latestMessage: e.message });
      }
    },
    onError(error) {
      setStreamHintStage("idle");
      clearAllToolProgressTimers(
        toolProgressTimerRef.current,
        toolStartAtRef.current,
      );
      const trace = perfTraceRef.current;
      if (trace) {
        const endAt = Date.now();
        logTimeline("本次消息流程异常结束", {
          追踪ID: trace.traceId,
          时间: formatZhTime(endAt),
          总耗时毫秒: endAt - trace.clickAt,
          错误:
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "未知错误",
        });
        perfTraceRef.current = null;
      }
      setOptimisticMessages([]);
      toast.error(getStreamErrorMessage(error));
    },
    onFinish(state) {
      setStreamHintStage("idle");
      clearAllToolProgressTimers(
        toolProgressTimerRef.current,
        toolStartAtRef.current,
      );
      const trace = perfTraceRef.current;
      const endAt = Date.now();
      if (trace) {
        const totalDuration = endAt - trace.clickAt;
        const streamDuration = trace.streamStartAt
          ? endAt - trace.streamStartAt
          : undefined;
        logTimeline("流式输出结束", {
          追踪ID: trace.traceId,
          时间: formatZhTime(endAt),
          ...(streamDuration !== undefined
            ? { 流式输出耗时毫秒: streamDuration }
            : {}),
        });
        logTimeline("本次消息处理完成", {
          追踪ID: trace.traceId,
          总耗时毫秒: totalDuration,
        });
        perfTraceRef.current = null;
      }
      listeners.current.onFinish?.(state.values);
      void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
    },
  });

  // Optimistic messages shown before the server stream responds
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const sendInFlightRef = useRef(false);
  // Track message count before sending so we know when server has responded
  const prevMsgCountRef = useRef(thread.messages.length);

  // Clear optimistic when server messages arrive (count increases)
  useEffect(() => {
    if (
      optimisticMessages.length > 0 &&
      thread.messages.length > prevMsgCountRef.current
    ) {
      setOptimisticMessages([]);
    }
  }, [thread.messages.length, optimisticMessages.length]);

  const sendMessage = useCallback(
    async (
      threadId: string,
      message: PromptInputMessage,
      extraContext?: Record<string, unknown>,
    ) => {
      if (sendInFlightRef.current) {
        return;
      }
      sendInFlightRef.current = true;
      const clickAt = Date.now();
      const traceId = `${clickAt}-${Math.random().toString(36).slice(2, 8)}`;
      clearAllToolProgressTimers(
        toolProgressTimerRef.current,
        toolStartAtRef.current,
      );
      perfTraceRef.current = { traceId, clickAt };
      setStreamHintStage("preparing");

      const text = message.text.trim();

      // Capture current count before showing optimistic messages
      prevMsgCountRef.current = thread.messages.length;

      // Build optimistic files list with uploading status
      const optimisticFiles: FileInMessage[] = (message.files ?? []).map(
        (f) => ({
          filename: f.filename ?? "",
          size: 0,
          status: "uploading" as const,
        }),
      );

      // Create optimistic human message (shown immediately)
      const optimisticHumanMsg: Message = {
        type: "human",
        id: `opt-human-${Date.now()}`,
        content: text ? [{ type: "text", text }] : "",
        additional_kwargs:
          optimisticFiles.length > 0 ? { files: optimisticFiles } : {},
      };

      const newOptimistic: Message[] = [optimisticHumanMsg];
      if (optimisticFiles.length > 0) {
        // Mock AI message while files are being uploaded
        newOptimistic.push({
          type: "ai",
          id: `opt-ai-${Date.now()}`,
          content: t.uploads.uploadingFiles,
          additional_kwargs: { element: "task" },
        });
      }
      setOptimisticMessages(newOptimistic);

      _handleOnStart(threadId);

      let uploadedFileInfo: UploadedFileInfo[] = [];
      const callApiWithTimer = async <T>(
        apiName: string,
        apiCall: () => Promise<T>,
      ): Promise<T> => {
        const startAt = Date.now();
        const trace = perfTraceRef.current;
        try {
          const result = await apiCall();
          return result;
        } catch (error) {
          const endAt = Date.now();
          logTimeline(`接口调用失败：${apiName}`, {
            追踪ID: trace?.traceId,
            时间: formatZhTime(endAt),
            接口耗时毫秒: endAt - startAt,
            错误: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      };

      try {
        // Upload files first if any
        if (message.files && message.files.length > 0) {
          setStreamHintStage("uploading");
          setIsUploading(true);
          try {
            // Convert FileUIPart to File objects by fetching blob URLs
            const filePromises = message.files.map(async (fileUIPart) => {
              if (fileUIPart.url && fileUIPart.filename) {
                try {
                  // Fetch the blob URL to get the file data
                  const response = await callApiWithTimer(
                    `读取本地文件数据(${fileUIPart.filename})`,
                    () => fetch(fileUIPart.url),
                  );
                  const blob = await response.blob();

                  // Create a File object from the blob
                  return new File([blob], fileUIPart.filename, {
                    type: fileUIPart.mediaType || blob.type,
                  });
                } catch (error) {
                  console.error(
                    `Failed to fetch file ${fileUIPart.filename}:`,
                    error,
                  );
                  return null;
                }
              }
              return null;
            });

            const conversionResults = await Promise.all(filePromises);
            const files = conversionResults.filter(
              (file): file is File => file !== null,
            );
            const failedConversions = conversionResults.length - files.length;

            if (failedConversions > 0) {
              throw new Error(
                `Failed to prepare ${failedConversions} attachment(s) for upload. Please retry.`,
              );
            }

            if (!threadId) {
              throw new Error("Thread is not ready for file upload.");
            }

            if (files.length > 0) {
              const uploadResponse = await callApiWithTimer(
                "上传附件接口",
                () => uploadFiles(threadId, files),
              );
              uploadedFileInfo = uploadResponse.files;

              // Update optimistic human message with uploaded status + paths
              const uploadedFiles: FileInMessage[] = uploadedFileInfo.map(
                (info) => ({
                  filename: info.filename,
                  size: info.size,
                  path: info.virtual_path,
                  status: "uploaded" as const,
                }),
              );
              setOptimisticMessages((messages) => {
                if (messages.length > 1 && messages[0]) {
                  const humanMessage: Message = messages[0];
                  return [
                    {
                      ...humanMessage,
                      additional_kwargs: { files: uploadedFiles },
                    },
                    ...messages.slice(1),
                  ];
                }
                return messages;
              });
            }
          } catch (error) {
            console.error("Failed to upload files:", error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "Failed to upload files.";
            toast.error(errorMessage);
            setOptimisticMessages([]);
            throw error;
          } finally {
            setIsUploading(false);
          }
        }

        // Build files metadata for submission (included in additional_kwargs)
        const filesForSubmit: FileInMessage[] = uploadedFileInfo.map(
          (info) => ({
            filename: info.filename,
            size: info.size,
            path: info.virtual_path,
            status: "uploaded" as const,
          }),
        );

        setStreamHintStage("calling_api");
        const submitPayload: Parameters<typeof thread.submit>[0] = {
          messages: [
            {
              type: "human",
              content: [
                {
                  type: "text",
                  text,
                },
              ],
              additional_kwargs:
                filesForSubmit.length > 0 ? { files: filesForSubmit } : {},
            },
          ],
        };
        const submitOptions: Parameters<typeof thread.submit>[1] = {
          threadId: threadId,
          streamMode: ["values", "messages-tuple", "events", "custom"],
          streamSubgraphs: true,
          streamResumable: true,
          config: {
            recursion_limit: 1000,
          },
          context: {
            ...extraContext,
            ...context,
            thinking_enabled: context.mode !== "flash",
            is_plan_mode: context.mode === "pro" || context.mode === "ultra",
            subagent_enabled: context.mode === "ultra",
            reasoning_effort:
              context.reasoning_effort ??
              (context.mode === "ultra"
                ? "high"
                : context.mode === "pro"
                  ? "medium"
                  : context.mode === "thinking"
                    ? "low"
                    : undefined),
            thread_id: threadId,
          },
        };
        await callApiWithTimer("提交消息并开启流式接口", () =>
          thread.submit(submitPayload, submitOptions),
        );
        void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
      } catch (error) {
        setOptimisticMessages([]);
        setIsUploading(false);
        throw error;
      } finally {
        sendInFlightRef.current = false;
      }
    },
    [thread, _handleOnStart, t.uploads.uploadingFiles, context, queryClient],
  );

  // Merge thread with optimistic messages for display
  const mergedThread =
    optimisticMessages.length > 0
      ? ({
          ...thread,
          messages: [...thread.messages, ...optimisticMessages],
        } as typeof thread)
      : thread;

  return [mergedThread, sendMessage, isUploading, streamHintStage] as const;
}

export function useThreads(
  params: Parameters<ThreadsClient["search"]>[0] = {
    limit: 50,
    sortBy: "updated_at",
    sortOrder: "desc",
    select: ["thread_id", "updated_at", "values"],
  },
) {
  // 使用用户感知的API客户端，确保只查询当前用户的线程
  const apiClient = useUserAwareAPIClient();
  return useQuery<AgentThread[]>({
    queryKey: ["threads", "search", params],
    queryFn: async () => {
      const maxResults = params.limit;
      const initialOffset = params.offset ?? 0;
      const DEFAULT_PAGE_SIZE = 50;

      // Preserve prior semantics: if a non-positive limit is explicitly provided,
      // delegate to a single search call with the original parameters.
      if (maxResults !== undefined && maxResults <= 0) {
        const response =
          await apiClient.threads.search<AgentThreadState>(params);
        return response as AgentThread[];
      }

      const pageSize =
        typeof maxResults === "number" && maxResults > 0
          ? Math.min(DEFAULT_PAGE_SIZE, maxResults)
          : DEFAULT_PAGE_SIZE;

      const threads: AgentThread[] = [];
      let offset = initialOffset;

      while (true) {
        if (typeof maxResults === "number" && threads.length >= maxResults) {
          break;
        }

        const currentLimit =
          typeof maxResults === "number"
            ? Math.min(pageSize, maxResults - threads.length)
            : pageSize;

        if (typeof maxResults === "number" && currentLimit <= 0) {
          break;
        }

        const response = (await apiClient.threads.search<AgentThreadState>({
          ...params,
          limit: currentLimit,
          offset,
        })) as AgentThread[];

        threads.push(...response);

        if (response.length < currentLimit) {
          break;
        }

        offset += response.length;
      }

      return threads;
    },
    refetchOnWindowFocus: false,
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  // 使用用户感知的API客户端，确保只能删除当前用户的线程
  const apiClient = useUserAwareAPIClient();
  return useMutation({
    mutationFn: async ({ threadId }: { threadId: string }) => {
      await apiClient.threads.delete(threadId);

      const response = await fetch(
        `${getBackendBaseURL()}/api/threads/${encodeURIComponent(threadId)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ detail: "Failed to delete local thread data." }));
        throw new Error(error.detail ?? "Failed to delete local thread data.");
      }
    },
    onSuccess(_, { threadId }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread> | undefined) => {
          if (oldData == null) {
            return oldData;
          }
          return oldData.filter((t) => t.thread_id !== threadId);
        },
      );
    },
    onSettled() {
      void queryClient.invalidateQueries({ queryKey: ["threads", "search"] });
    },
  });
}

export function useRenameThread() {
  const queryClient = useQueryClient();
  // 使用用户感知的API客户端，确保只能重命名当前用户的线程
  const apiClient = useUserAwareAPIClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      title,
    }: {
      threadId: string;
      title: string;
    }) => {
      await apiClient.threads.updateState(threadId, {
        values: { title },
      });
    },
    onSuccess(_, { threadId, title }) {
      queryClient.setQueriesData(
        {
          queryKey: ["threads", "search"],
          exact: false,
        },
        (oldData: Array<AgentThread>) => {
          return oldData.map((t) => {
            if (t.thread_id === threadId) {
              return {
                ...t,
                values: {
                  ...t.values,
                  title,
                },
              };
            }
            return t;
          });
        },
      );
    },
  });
}
