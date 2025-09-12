"use client";

import React from "react";
import Link from "next/link";

import * as Icons from "@saasfly/ui/icons";
import { MobileNav } from "~/components/mobile-nav";

import type { MainNavItem } from "~/types";

interface MainNavProps {
  items?: MainNavItem[];
  children?: React.ReactNode;
  params: {
    lang: string;
  };
  marketing?: Record<string, string | object>;
}

export function MainNav({ items, children, params: { lang }, marketing }: MainNavProps) {
  const [showMobileMenu, setShowMobileMenu] = React.useState<boolean>(false);
  const toggleMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };
  const handleMenuItemClick = () => {
    toggleMenu();
  };
  return (
    <div className="flex gap-6 md:gap-10">
      <div className="flex items-center">
        <Link href={`/${lang}`} className="flex items-center space-x-2">
          <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ImagePrompt.org
          </div>
        </Link>

        {/* 移除 Saasfly 介绍链接 */}
      </div>

      {/* 移动端菜单按钮 - 由于没有导航项，暂时隐藏 */}
      {items && items.length > 0 && (
        <>
          <button
            className="flex items-center space-x-2 md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <Icons.Close/> : <Icons.Logo/>}
            <span className="font-bold">Menu</span>
          </button>
          {showMobileMenu && (
            <MobileNav items={items} menuItemClick={handleMenuItemClick}>
              {children}
            </MobileNav>
          )}
        </>
      )}
    </div>
  );
}
