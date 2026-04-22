import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type StreamHintStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "calling_api"
  | "thinking"
  | "streaming"
  | "writing"
  | "searching";

const STAGE_HINTS: Record<StreamHintStage, string[]> = {
  idle: ["正在准备中...", "正在初始化当前会话..."],
  preparing: [
    "正在整理你的问题...",
    "正在准备上下文...",
    "正在匹配最佳处理路径...",
    "正在分析你刚刚的输入...",
    "正在确认本轮目标...",
  ],
  uploading: [
    "正在上传附件...",
    "正在校验文件内容...",
    "正在读取文件信息...",
    "正在预处理上传内容...",
    "正在检查文件可读性...",
  ],
  calling_api: [
    "正在连接服务...",
    "正在提交请求...",
    "正在等待服务响应...",
    "正在建立本轮调用链路...",
    "正在同步请求上下文...",
  ],
  thinking: [
    "正在思考解法...",
    "正在组织回答结构...",
    "正在分析上下文信息...",
    "正在推演下一步操作...",
    "正在评估最优执行路径...",
    "正在结合历史对话进行判断...",
  ],
  streaming: [
    "正在生成内容...",
    "正在整理可读答案...",
    "正在连续输出中...",
    "正在优化表达细节...",
    "正在补全关键步骤说明...",
  ],
  writing: [
    "正在创建文件...",
    "正在写入文件内容...",
    "正在保存文件变更...",
    "正在落盘当前结果...",
    "正在校验写入一致性...",
  ],
  searching: [
    "正在查找相关资料...",
    "正在检索可用信息...",
    "正在比对相关内容...",
    "正在筛选高相关结果...",
    "正在合并多来源信息...",
  ],
};

function pickRandomIndex(max: number, exclude?: number): number {
  if (max <= 1) {
    return 0;
  }
  let index = Math.floor(Math.random() * max);
  if (exclude !== undefined && index === exclude) {
    index = (index + 1) % max;
  }
  return index;
}

export function StreamingIndicator({
  className,
  size = "normal",
  stage = "thinking",
  activitySignal,
  // TODO: 提示出现时间（毫秒）。超过该时长无新活动才显示文案提示。
  // 示例：4000 表示 4 秒后显示“正在思考/写入”等提示。
  idleThresholdMs = 8000,
  // TODO: 提示切换时间（毫秒）。文案显示后按该间隔轮换下一条。
  // 示例：3000 表示每 3 秒切换一次提示文案。
  rotateHintEveryMs = 10000,
  hints,
}: {
  className?: string;
  size?: "normal" | "sm";
  stage?: StreamHintStage;
  activitySignal?: string;
  // TODO: 提示出现时间配置（毫秒）
  idleThresholdMs?: number;
  // TODO: 提示切换时间配置（毫秒）
  rotateHintEveryMs?: number;
  hints?: string[];
}) {
  const lastActivityAtRef = useRef<number>(Date.now());
  const shownHintSetRef = useRef<Set<string>>(new Set());
  const [idleMs, setIdleMs] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);

  const resolvedHints = useMemo(() => {
    if (hints && hints.length > 0) {
      return hints;
    }
    return STAGE_HINTS[stage] ?? STAGE_HINTS.thinking;
  }, [hints, stage]);
  const shouldShowHint = idleMs >= idleThresholdMs && resolvedHints.length > 0;
  const activeHint = useMemo(() => {
    if (!shouldShowHint || resolvedHints.length === 0) {
      return "";
    }
    return resolvedHints[hintIndex % resolvedHints.length] ?? "";
  }, [hintIndex, resolvedHints, shouldShowHint]);

  useEffect(() => {
    lastActivityAtRef.current = Date.now();
    setIdleMs(0);
    shownHintSetRef.current.clear();
    const list = hints && hints.length > 0 ? hints : STAGE_HINTS[stage];
    setHintIndex(pickRandomIndex(Math.max(1, list.length)));
  }, [activitySignal, hints, stage]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setIdleMs(Date.now() - lastActivityAtRef.current);
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    if (!shouldShowHint || resolvedHints.length <= 1) {
      return;
    }
    // 当前文案只记录一次，保证同一阶段尽量不重复展示。
    if (activeHint) {
      shownHintSetRef.current.add(activeHint);
    }
    const rotateTimerId = window.setInterval(() => {
      setHintIndex((prev) => {
        const unseenHints = resolvedHints.filter(
          (hint) => !shownHintSetRef.current.has(hint),
        );
        if (unseenHints.length === 0) {
          // 已全部展示过，清空后重新随机开始下一轮。
          shownHintSetRef.current.clear();
          return pickRandomIndex(resolvedHints.length, prev);
        }
        const nextHint =
          unseenHints[pickRandomIndex(unseenHints.length)] ??
          resolvedHints[0] ??
          "";
        if (!nextHint) {
          return pickRandomIndex(resolvedHints.length, prev);
        }
        const nextIndex = resolvedHints.indexOf(nextHint);
        return nextIndex >= 0 ? nextIndex : pickRandomIndex(resolvedHints.length, prev);
      });
    }, rotateHintEveryMs);
    return () => {
      window.clearInterval(rotateTimerId);
    };
  }, [activeHint, resolvedHints, rotateHintEveryMs, shouldShowHint]);

  const dotSize = size === "sm" ? "w-1.5 h-1.5 mx-0.5" : "w-2 h-2 mx-1";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex">
        <div
          className={cn(
            dotSize,
            "animate-bouncing rounded-full bg-[#a3a1a1] opacity-100",
          )}
        />
        <div
          className={cn(
            dotSize,
            "animate-bouncing rounded-full bg-[#a3a1a1] opacity-100 [animation-delay:0.2s]",
          )}
        />
        <div
          className={cn(
            dotSize,
            "animate-bouncing rounded-full bg-[#a3a1a1] opacity-100 [animation-delay:0.4s]",
          )}
        />
      </div>
      {shouldShowHint && (
        <span className="text-muted-foreground text-sm">{activeHint}</span>
      )}
    </div>
  );
}
