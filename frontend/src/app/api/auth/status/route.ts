import { NextRequest, NextResponse } from "next/server";
import { loginSessionManager } from "@/core/auth/session-manager";
import type { StatusResponse } from "@/core/auth/types";

/**
 * 检查登录状态
 * GET /api/auth/status?sessionId=xxx-xxx-xxx
 */
export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_SESSION_ID",
          message: "缺少 sessionId 参数",
        },
        { status: 400 }
      );
    }

    const session = loginSessionManager.getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_NOT_FOUND",
          message: "会话不存在",
        },
        { status: 404 }
      );
    }

    // 检查是否已过期
    const now = Date.now();
    if (now > session.expiresAt && session.status === "pending") {
      return NextResponse.json({
        success: true,
        data: {
          status: "expired",
          message: "二维码已过期",
        },
      });
    }

    // 返回当前状态
    if (session.status === "success") {
      return NextResponse.json({
        success: true,
        data: {
          status: "success",
          userId: session.userId,
        },
      });
    }

    if (session.status === "used") {
      return NextResponse.json({
        success: true,
        data: {
          status: "expired",
          message: "二维码已使用",
        },
      });
    }

    // pending 状态，返回剩余时间
    const countdown = loginSessionManager.getRemainingTime(sessionId);
    return NextResponse.json({
      success: true,
      data: {
        status: "pending",
        countdown,
      },
    });
  } catch (error) {
    console.error("检查登录状态失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
