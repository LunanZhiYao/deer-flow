import { nanoid } from "nanoid";
import type { LoginSession, LoginSessionStatus } from "./types";

// 二维码默认有效期（5分钟）
const DEFAULT_EXPIRES_IN = 5 * 60 * 1000;

// 登录会话管理器
class LoginSessionManager {
  private sessions: Map<string, LoginSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 每分钟清理过期会话
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 1000);
  }

  /**
   * 创建新的登录会话
   */
  createSession(expiresIn: number = DEFAULT_EXPIRES_IN): LoginSession {
    const sessionId = nanoid(32);
    const now = Date.now();
    const session: LoginSession = {
      sessionId,
      status: "pending",
      createdAt: now,
      expiresAt: now + expiresIn,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): LoginSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 检查会话是否有效
   */
  isValidSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.status === "used") return false;
    if (Date.now() > session.expiresAt) {
      session.status = "expired";
      return false;
    }
    return true;
  }

  /**
   * 更新会话状态
   */
  updateSessionStatus(
    sessionId: string,
    status: LoginSessionStatus,
    userId?: string
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = status;
    if (userId) {
      session.userId = userId;
    }
    return true;
  }

  /**
   * 标记会话为已使用
   */
  markAsUsed(sessionId: string): boolean {
    return this.updateSessionStatus(sessionId, "used");
  }

  /**
   * 标记会话为成功并设置用户ID
   */
  markAsSuccess(sessionId: string, userId: string): boolean {
    return this.updateSessionStatus(sessionId, "success", userId);
  }

  /**
   * 获取会话剩余时间（秒）
   */
  getRemainingTime(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    const remaining = Math.max(0, session.expiresAt - Date.now());
    return Math.floor(remaining / 1000);
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}

// 导出单例实例
export const loginSessionManager = new LoginSessionManager();
