import { NextRequest, NextResponse } from "next/server";
import { parseWorkCode } from "@/lib/crypto";
import { loginSessionManager } from "@/core/auth/session-manager";
import type { ScanResponse } from "@/core/auth/types";

/**
 * APP 扫码验证
 * POST /api/auth/scan
 * Headers: { workCode: "xxx" }
 * Body: { "sessionId": "xxx-xxx-xxx" }
 */
export async function POST(request: NextRequest): Promise<NextResponse<ScanResponse>> {
  try {
    // 从请求头获取 workCode
    const workCode = request.headers.get("workCode");
    if (!workCode) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_WORKCODE",
          message: "缺少 workCode 参数",
        },
        { status: 400 }
      );
    }

    // 解析请求体
    let body: { sessionId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_BODY",
          message: "请求体格式错误",
        },
        { status: 400 }
      );
    }

    const { sessionId } = body;
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

    // 验证会话有效性
    if (!loginSessionManager.isValidSession(sessionId)) {
      const session = loginSessionManager.getSession(sessionId);
      if (session?.status === "used") {
        return NextResponse.json(
          {
            success: false,
            error: "QR_CODE_USED",
            message: "二维码已被使用",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: "QR_CODE_EXPIRED",
          message: "二维码已过期，请刷新后重试",
        },
        { status: 400 }
      );
    }

    // 解析 workCode 获取用户 ID
    const userId = parseWorkCode(workCode);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "AUTH_FAILED",
          message: "身份验证失败，请重试",
        },
        { status: 401 }
      );
    }

    // 标记会话为成功
    loginSessionManager.markAsSuccess(sessionId, userId);

    return NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        userId,
      },
    });
  } catch (error) {
    console.error("扫码验证失败:", error);
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
