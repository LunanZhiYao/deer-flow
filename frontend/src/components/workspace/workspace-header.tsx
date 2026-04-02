"use client";

import { MessageSquarePlus, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";
import { useUserId, useUserName } from "@/core/auth";
import { env } from "@/env";
import { cn } from "@/lib/utils";

export function WorkspaceHeader({ className }: { className?: string }) {
  const { t } = useI18n();
  const { state } = useSidebar();
  const pathname = usePathname();
  const userId = useUserId();
  const name = useUserName();
  return (
    <>
      <div
        className={cn(
          "group/workspace-header flex h-12 flex-col justify-center",
          className,
        )}
      >
        {state === "collapsed" ? (
          <div className="group-has-data-[collapsible=icon]/sidebar-wrapper:-translate-y flex w-full cursor-pointer items-center justify-center">
            <div className="text-primary block pt-1 font-serif group-hover/workspace-header:hidden">
              YQY
            </div>
            <SidebarTrigger className="hidden pl-2 group-hover/workspace-header:block" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
              <Link href="/" className="text-primary ml-2 font-serif">
                云千易
              </Link>
            ) : (
              <div className="text-primary ml-2 cursor-default font-serif">
                云千易
              </div>
            )}
            <SidebarTrigger />
          </div>
        )}
      </div>
      {/* 用户信息显示 */}
      {userId && state !== "collapsed" && (
        <div className="mt-auto flex items-center gap-2 px-2 py-2">
          <User className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground truncate text-xs">
            用户ID: {userId}
          </span>
        </div>
      )}
      {name && state !== "collapsed" && (
        <div className="mt-auto flex items-center gap-2 px-2 py-2">
          <User className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground truncate text-xs">
            用户姓名: {decodeURIComponent(name)}
          </span>
        </div>
      )}
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/workspace/chats/new"}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/chats/new">
              <MessageSquarePlus size={16} />
              <span>{t.sidebar.newChat}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
