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
            <img 
              src="/favicon.ico" 
              alt="云千易" 
              className="h-8 w-8 rounded-lg shadow-md group-hover/workspace-header:hidden"
            />
            <SidebarTrigger className="hidden pl-2 group-hover/workspace-header:block" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" ? (
              <Link href="/" className="flex items-center gap-2">
                <img 
                  src="/favicon.ico" 
                  alt="云千易" 
                  className="h-8 w-8 rounded-lg shadow-md"
                />
                <span className="text-lg font-bold text-[#E62B34]">
                  云千易
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <img 
                  src="/favicon.ico" 
                  alt="云千易" 
                  className="h-8 w-8 rounded-lg shadow-md"
                />
                <span className="text-lg font-bold text-[#E62B34]">
                  云千易
                </span>
              </div>
            )}
            <SidebarTrigger />
          </div>
        )}
      </div>
      
      {userId && state !== "collapsed" && (
        <div className="mt-auto flex items-center gap-2 px-2 py-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E62B34] text-xs font-bold text-white">
            <User className="h-3 w-3" />
          </div>
          <span className="text-muted-foreground truncate text-xs">
            {name ? decodeURIComponent(name) : `用户 ${userId.slice(0, 8)}`}
          </span>
        </div>
      )}
      
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === "/workspace/chats/new"}
            asChild
            className="group relative overflow-hidden rounded-lg transition-all hover:scale-105"
          >
            <Link className="hover:text-white" href="/workspace/chats/new">
              <MessageSquarePlus size={16} />
              <span>{t.sidebar.newChat}</span>
              <div className="absolute inset-0 -z-10 bg-[#E62B34]/10 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
