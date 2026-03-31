"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/core/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();

  // 获取错误类型
  const errorType = searchParams.get("error");

  // 获取错误信息
  const getErrorMessage = () => {
    switch (errorType) {
      case "invalid_workcode":
        return {
          title: "身份验证失败",
          description: "workCode 无效",
          icon: ShieldX,
        };
      case "unauthorized":
        return {
          title: "非法访问",
          description: "请通过 云上鲁南 进入",
          icon: AlertCircle,
        };
      default:
        return {
          title: "访问受限",
          description: "请通过 云上鲁南 进入",
          icon: ShieldX,
        };
    }
  };

  const errorInfo = getErrorMessage();
  const ErrorIcon = errorInfo.icon;

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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ErrorIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            {errorInfo.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-center text-sm">
            {errorInfo.description}
          </p>
          <div className="mt-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <p className="text-muted-foreground text-center text-xs">
              请使用 云上鲁南 进入系统
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
