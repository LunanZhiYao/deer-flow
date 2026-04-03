"use client";

import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { env } from "@/env";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="container-md fixed top-0 right-0 left-0 z-20 mx-auto flex h-16 items-center justify-between px-6"
    >
      <div className="flex items-center gap-3">
        <img 
          src="/favicon.ico" 
          alt="云千易" 
          className="h-10 w-10 rounded-xl shadow-lg"
        />
        <a href="https://github.com/bytedance/deer-flow" target="_blank">
          <h1 className="text-2xl font-bold text-[#E62B34]">
            云千易
          </h1>
        </a>
      </div>
      
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="group relative overflow-hidden rounded-full border-2 border-[#E62B34]/20 bg-background/80 backdrop-blur-sm transition-all hover:scale-105 hover:border-[#E62B34]/40"
        >
          <a href="https://github.com/bytedance/deer-flow" target="_blank">
            <GitHubLogoIcon className="size-4" />
            <span className="font-medium">Star on GitHub</span>
            {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" &&
              env.GITHUB_OAUTH_TOKEN && <StarCounter />}
          </a>
        </Button>
      </div>
    </motion.header>
  );
}

async function StarCounter() {
  let stars = 10000;

  try {
    const response = await fetch(
      "https://api.github.com/repos/bytedance/deer-flow",
      {
        headers: env.GITHUB_OAUTH_TOKEN
          ? {
              Authorization: `Bearer ${env.GITHUB_OAUTH_TOKEN}`,
              "Content-Type": "application/json",
            }
          : {},
        next: {
          revalidate: 3600,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      stars = data.stargazers_count ?? stars;
    }
  } catch (error) {
    console.error("Error fetching GitHub stars:", error);
  }
  return (
    <div className="ml-1 flex items-center gap-1 text-yellow-500">
      <span>⭐</span>
      {stars && (
        <NumberTicker className="font-mono text-sm tabular-nums" value={stars} />
      )}
    </div>
  );
}
