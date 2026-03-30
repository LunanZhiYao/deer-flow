"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  qrCodeDataUrl: string;
  countdown: number;
  isExpired: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

// 格式化倒计时为 MM:SS
function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function QRCodeDisplay({
  qrCodeDataUrl,
  countdown,
  isExpired,
  isRefreshing,
  onRefresh,
}: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* 二维码容器 */}
      <div
        className={cn(
          "relative rounded-lg border-2 p-4 transition-all duration-300",
          isExpired
            ? "border-gray-300 bg-gray-50 opacity-50"
            : "border-primary/20 bg-white"
        )}
      >
        {/* 二维码图片 */}
        {qrCodeDataUrl && (
          <img
            src={qrCodeDataUrl}
            alt="登录二维码"
            className={cn(
              "h-64 w-64 object-contain transition-all duration-300",
              isExpired && "grayscale"
            )}
          />
        )}

        {/* 过期遮罩 */}
        {isExpired && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80">
            <span className="text-muted-foreground text-sm">二维码已过期</span>
            <Button
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-1"
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
              刷新二维码
            </Button>
          </div>
        )}
      </div>

      {/* 倒计时 */}
      {!isExpired && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">有效期：</span>
          <span
            className={cn(
              "font-mono text-lg font-semibold",
              countdown <= 60 ? "text-red-500" : "text-primary"
            )}
          >
            {formatCountdown(countdown)}
          </span>
        </div>
      )}

      {/* 手动刷新按钮 */}
      {!isExpired && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-muted-foreground gap-1"
        >
          <RefreshCw
            className={cn("h-4 w-4", isRefreshing && "animate-spin")}
          />
          刷新二维码
        </Button>
      )}

      {/* 提示文字 */}
      <p className="text-muted-foreground max-w-xs text-center text-sm">
        请使用云上鲁南 APP 扫描二维码进行登录
      </p>
    </div>
  );
}
