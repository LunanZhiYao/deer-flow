import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { loginSessionManager } from "@/core/auth/session-manager";
import type { QRCodeResponse } from "@/core/auth/types";

// 二维码有效期（5分钟）
const EXPIRES_IN = 5 * 60;

// 扫码 URL 基础地址（需要根据实际部署环境配置）
const SCAN_URL_BASE = process.env.NEXT_PUBLIC_SCAN_URL_BASE || "http://localhost:2026/api/auth/scan";

/**
 * 生成登录二维码
 * GET /api/auth/qrcode
 */
export async function GET(request: NextRequest): Promise<NextResponse<QRCodeResponse>> {
  try {
    // 创建登录会话
    const session = loginSessionManager.createSession(EXPIRES_IN * 1000);

    // 生成扫码 URL
    const qrcodeUrl = `${SCAN_URL_BASE}?session=${session.sessionId}`;

    // 生成二维码图片（Base64）
    const qrcodeDataUrl = await QRCode.toDataURL(qrcodeUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        qrcodeDataUrl,
        qrcodeUrl,
        expiresIn: EXPIRES_IN,
        createdAt: Math.floor(session.createdAt / 1000),
      },
    });
  } catch (error) {
    console.error("生成二维码失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "SERVICE_UNAVAILABLE",
        message: "服务暂时不可用，请稍后重试",
      },
      { status: 500 }
    );
  }
}
