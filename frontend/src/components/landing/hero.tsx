"use client";

import { ChevronRightIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Hero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
      
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#E62B34] rounded-full mix-blend-multiply filter blur-xl animate-float opacity-20" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-[#E62B34] rounded-full mix-blend-multiply filter blur-xl animate-float opacity-20" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-[#E62B34] rounded-full mix-blend-multiply filter blur-xl animate-float opacity-20" style={{ animationDelay: '4s' }} />
      </div>

      <div className="container-md relative z-10 mx-auto flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 rounded-full border border-[#E62B34]/20 bg-[#E62B34]/5 px-6 py-2 backdrop-blur-sm">
            <SparklesIcon className="h-5 w-5 text-[#E62B34]" />
            <span className="text-sm font-medium text-[#E62B34]">
              全新升级的 AI 智能体平台
            </span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 text-center text-5xl font-bold leading-tight tracking-tight md:text-7xl"
        >
          <span className="text-[#E62B34]">云千易</span>
          <br />
          <span className="text-foreground">重新定义 AI 协作</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground md:text-xl"
        >
          一个开源的超级智能体平台，集研究、编码、创作于一体。
          <br />
          借助沙箱环境、记忆系统、工具和技能，轻松处理从分钟到小时的各种复杂任务。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col gap-4 sm:flex-row"
        >
          <Link href="/workspace">
            <Button
              size="lg"
              className="group relative overflow-hidden rounded-full bg-[#E62B34] px-8 py-6 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 hover:bg-[#D4252E]"
            >
              <span className="relative z-10 flex items-center gap-2">
                开始使用
                <ChevronRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </Link>
          
          <Link href="https://github.com/bytedance/deer-flow" target="_blank">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-2 border-[#E62B34]/30 px-8 py-6 text-lg font-semibold transition-all hover:scale-105 hover:border-[#E62B34]"
            >
              查看源码
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 flex items-center gap-8 text-sm text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#E62B34]" />
            <span>开源免费</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#E62B34]" />
            <span>功能强大</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#E62B34]" />
            <span>易于扩展</span>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
