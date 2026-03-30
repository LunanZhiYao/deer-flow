"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeDisplay } from "@/components/auth/qrcode-display";
import { useAuth } from "@/core/auth";
import type { QRCodeResponse, StatusResponse } from "@/core/auth/types";

// 轮询间隔（毫秒）
const POLLING_INTERVAL = 2000;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  // 二维码状态
  const [sessionId, setSessionId] = useState<string>("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // 获取二维码
  const fetchQRCode = useCallback(async () => {
    setIsRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/auth/qrcode");
      const data: QRCodeResponse = await response.json();

      if (data.success && data.data) {
        setSessionId(data.data.sessionId);
        setQrCodeDataUrl(data.data.qrcodeDataUrl);
        setCountdown(data.data.expiresIn);
        setIsExpired(false);
      } else {
        setError(data.message || "获取二维码失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // 刷新二维码
  const handleRefresh = useCallback(() => {
    fetchQRCode();
  }, [fetchQRCode]);

  // 检查登录状态
  const checkLoginStatus = useCallback(async () => {
    if (!sessionId || isExpired) return;

    try {
      const response = await fetch(`/api/auth/status?sessionId=${sessionId}`);
      const data: StatusResponse = await response.json();

      if (data.success && data.data) {
        if (data.data.status === "success" && data.data.userId) {
          // 登录成功
          login(data.data.userId);
          router.push("/workspace/chats/new");
        } else if (data.data.status === "expired") {
          setIsExpired(true);
        } else if (data.data.status === "pending" && data.data.countdown) {
          setCountdown(data.data.countdown);
        }
      }
    } catch {
      // 静默失败，继续轮询
    }
  }, [sessionId, isExpired, login, router]);

  // 初始化获取二维码
  useEffect(() => {
    fetchQRCode();
  }, [fetchQRCode]);

  // 倒计时
  useEffect(() => {
    if (countdown <= 0 || isExpired) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, isExpired]);

  // 轮询登录状态
  useEffect(() => {
    if (!sessionId || isExpired) return;

    const timer = setInterval(checkLoginStatus, POLLING_INTERVAL);
    return () => clearInterval(timer);
  }, [sessionId, isExpired, checkLoginStatus]);

  // 已登录则跳转
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/workspace/chats/new");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">扫码登录</CardTitle>
          <p className="text-muted-foreground mt-2 text-sm">
            使用云上鲁南 APP 扫描二维码
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {/* 加载中 */}
          {isRefreshing && !qrCodeDataUrl && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <span className="text-muted-foreground text-sm">正在生成二维码...</span>
            </div>
          )}

          {/* 二维码显示 */}
          {qrCodeDataUrl && (
            <QRCodeDisplay
              qrCodeDataUrl={qrCodeDataUrl}
              countdown={countdown}
              isExpired={isExpired}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-1 h-4 w-4" />
                重试
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
