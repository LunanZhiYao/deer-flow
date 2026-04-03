"use client";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  duration?: number;
  data?: any;
}

export type LogCategory =
  | "前端发送文字"
  | "接口调用"
  | "调用大模型"
  | "大模型调用成功"
  | "大模型处理"
  | "大模型处理完成"
  | "工具调用"
  | "工具调用完成"
  | "返回数据"
  | "显示数据"
  | "完成任务"
  | "系统";

interface LoggerConfig {
  enabled: boolean;
  maxLogs: number;
  consoleOutput: boolean;
  localStorageKey: string;
}

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  maxLogs: 500,
  consoleOutput: true,
  localStorageKey: "deerflow-logs",
};

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private timers: Map<string, number> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(this.config.localStorageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("加载日志失败:", e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const data = JSON.stringify(this.logs.slice(-this.config.maxLogs));
      localStorage.setItem(this.config.localStorageKey, data);
    } catch (e) {
      console.warn("保存日志失败:", e);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case "error":
        return "#ef4444";
      case "warn":
        return "#f59e0b";
      case "info":
        return "#3b82f6";
      case "debug":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any
  ): LogEntry {
    if (!this.config.enabled) {
      return {} as LogEntry;
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    this.logs.push(entry);

    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(-this.config.maxLogs);
    }

    this.saveToStorage();

    if (this.config.consoleOutput) {
      this.outputToConsole(entry);
    }

    return entry;
  }

  private outputToConsole(entry: LogEntry): void {
    const time = this.formatTime(entry.timestamp);
    const prefix = `[${time}] [${entry.category}]`;
    const durationText = entry.duration ? ` (耗时: ${entry.duration}ms)` : "";

    switch (entry.level) {
      case "error":
        console.error(`❌ ${prefix} ${entry.message}${durationText}`, entry.data || "");
        break;
      case "warn":
        console.warn(`⚠️ ${prefix} ${entry.message}${durationText}`, entry.data || "");
        break;
      case "info":
        console.log(`ℹ️ ${prefix} ${entry.message}${durationText}`, entry.data || "");
        break;
      case "debug":
        console.debug(`🔍 ${prefix} ${entry.message}${durationText}`, entry.data || "");
        break;
    }
  }

  info(category: string, message: string, data?: any): LogEntry {
    return this.log("info", category, message, data);
  }

  warn(category: string, message: string, data?: any): LogEntry {
    return this.log("warn", category, message, data);
  }

  error(category: string, message: string, data?: any): LogEntry {
    return this.log("error", category, message, data);
  }

  debug(category: string, message: string, data?: any): LogEntry {
    return this.log("debug", category, message, data);
  }

  startTimer(category: string, message: string): () => LogEntry {
    const timerId = this.generateId();
    const startTime = Date.now();
    this.timers.set(timerId, startTime);
    this.info(category, `开始: ${message}`);

    return (endMessage?: string, data?: any): LogEntry => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.timers.delete(timerId);

      const fullMessage = endMessage || message;
      return this.log("info", category, `完成: ${fullMessage}`, data);
    };
  }

  stepWithTimer<T>(
    category: string,
    startMessage: string,
    endMessage: string,
    fn: () => T
  ): T {
    const endTimer = this.startTimer(category, startMessage);
    try {
      const result = fn();
      endTimer(endMessage);
      return result;
    } catch (error) {
      this.error(category, `失败: ${startMessage}`, error);
      throw error;
    }
  }

  async stepWithTimerAsync<T>(
    category: string,
    startMessage: string,
    endMessage: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const endTimer = this.startTimer(category, startMessage);
    try {
      const result = await fn();
      endTimer(endMessage);
      return result;
    } catch (error) {
      this.error(category, `失败: ${startMessage}`, error);
      throw error;
    }
  }

  getLogs(filter?: { category?: string; level?: LogLevel }): LogEntry[] {
    let result = [...this.logs];

    if (filter?.category) {
      result = result.filter((log) => log.category === filter.category);
    }

    if (filter?.level) {
      result = result.filter((log) => log.level === filter.level);
    }

    return result;
  }

  getCategories(): string[] {
    return [...new Set(this.logs.map((log) => log.category))];
  }

  clearLogs(): void {
    this.logs = [];
    this.timers.clear();
    this.saveToStorage();
    this.info("系统", "日志已清空");
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.info("系统", `日志已${enabled ? "开启" : "关闭"}`);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export const logger = new Logger();
