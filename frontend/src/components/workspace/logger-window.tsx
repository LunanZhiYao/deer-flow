"use client";

import {
  CopyIcon,
  XIcon,
  Trash2Icon,
  SearchIcon,
  Minimize2Icon,
  Maximize2Icon,
  SettingsIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger, type LogEntry, type LogLevel } from "@/core/logger";
import { cn } from "@/lib/utils";

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

const CATEGORY_ICONS: Record<string, string> = {
  "前端发送文字": "📤",
  "接口调用": "🔌",
  "调用大模型": "🤖",
  "大模型调用成功": "✅",
  "大模型处理": "🔄",
  "大模型处理完成": "🏁",
  "工具调用": "🛠️",
  "工具调用完成": "✅",
  "返回数据": "📥",
  "显示数据": "👁️",
  "完成任务": "🎉",
  "系统": "⚙️",
};

export function LoggerWindow() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const logsEndRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs(logger.getLogs());

    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (headerRef.current && headerRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLevel = selectedLevel === "all" || log.level === selectedLevel;
    const matchesCategory = selectedCategory === "all" || log.category === selectedCategory;

    return matchesSearch && matchesLevel && matchesCategory;
  });

  const categories = logger.getCategories();

  const handleClear = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const handleCopy = () => {
    const text = filteredLogs
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleTimeString("zh-CN");
        const duration = log.duration ? ` (${log.duration}ms)` : "";
        return `[${time}] [${log.category}] ${log.message}${duration}`;
      })
      .join("\n");

    navigator.clipboard.writeText(text).catch(console.error);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "error":
        return "text-red-500";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      case "debug":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  const getLevelBg = (level: LogLevel) => {
    switch (level) {
      case "error":
        return "bg-red-50 dark:bg-red-950/30";
      case "warn":
        return "bg-yellow-50 dark:bg-yellow-950/30";
      case "info":
        return "bg-blue-50 dark:bg-blue-950/30";
      case "debug":
        return "bg-gray-50 dark:bg-gray-900/30";
      default:
        return "bg-gray-50 dark:bg-gray-900/30";
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50 size-12 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
        variant="default"
      >
        <SettingsIcon className="size-5" />
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col rounded-lg border bg-background shadow-2xl",
        isMinimized ? "w-64" : "w-[600px]",
        isDragging && "cursor-grabbing"
      )}
      style={{
        left: position.x,
        top: position.y,
        height: isMinimized ? "auto" : "500px",
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        ref={headerRef}
        className="flex cursor-grab items-center justify-between border-b px-4 py-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">📋 DeerFlow 日志系统</span>
          <span className="text-muted-foreground text-xs">
            ({filteredLogs.length} 条)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? (
              <Maximize2Icon className="size-4" />
            ) : (
              <Minimize2Icon className="size-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex flex-col gap-2 border-b p-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="搜索日志..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <Button size="icon" variant="ghost" className="size-9" onClick={handleCopy}>
                <CopyIcon className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="size-9" onClick={handleClear}>
                <Trash2Icon className="size-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Tabs
                value={selectedLevel}
                onValueChange={(v) => setSelectedLevel(v as LogLevel | "all")}
                className="w-fit"
              >
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="h-6 px-2 text-xs">
                    全部
                  </TabsTrigger>
                  {LOG_LEVELS.map((level) => (
                    <TabsTrigger key={level} value={level} className="h-6 px-2 text-xs">
                      {level === "debug"
                        ? "调试"
                        : level === "info"
                          ? "信息"
                          : level === "warn"
                            ? "警告"
                            : "错误"}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    {selectedCategory === "all" ? "全部分类" : selectedCategory}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuLabel>选择分类</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedCategory("all")}>
                    全部
                  </DropdownMenuItem>
                  {categories.map((cat) => (
                    <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)}>
                      {CATEGORY_ICONS[cat] || "📄"} {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoScroll(!autoScroll);
                }}
              >
                {autoScroll ? "自动滚动: 开" : "自动滚动: 关"}
              </Button>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                暂无日志
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={cn(
                      "rounded-md border p-2 text-sm",
                      getLevelBg(log.level)
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">
                          {CATEGORY_ICONS[log.category] || "📄"}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatTime(log.timestamp)}
                        </span>
                        <span className="font-medium">{log.category}</span>
                      </div>
                      <span className={cn("text-xs font-medium", getLevelColor(log.level))}>
                        {log.level === "debug"
                          ? "调试"
                          : log.level === "info"
                            ? "信息"
                            : log.level === "warn"
                              ? "警告"
                              : "错误"}
                      </span>
                    </div>
                    <div className="mt-1 pl-8">
                      <p>{log.message}</p>
                      {log.duration && (
                        <p className="text-muted-foreground text-xs mt-1">
                          耗时: {log.duration}ms
                        </p>
                      )}
                      {log.data && (
                        <details className="mt-1">
                          <summary className="text-muted-foreground cursor-pointer text-xs">
                            查看详情
                          </summary>
                          <pre className="mt-1 max-h-32 overflow-auto rounded bg-black/5 p-2 text-xs">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
