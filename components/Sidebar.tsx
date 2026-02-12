"use client";

import Link from "next/link";
import { LayoutDashboard, Users, FileText, Settings, LogOut, Hexagon, Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useState, useEffect } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: "/dashboard" },
    { icon: Users, label: t('employees'), href: "/dashboard/employees" },
    { icon: FileText, label: t('reports'), href: "/dashboard/reports" },
    { icon: Settings, label: t('settings'), href: "/dashboard/settings" },
  ];

  const sidebarContent = (
    <>
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 bg-[#13ec6d] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(19,236,109,0.3)] shrink-0">
          <Hexagon className="h-6 w-6 text-black fill-black" />
        </div>
        <div>
          <h1 className="font-bold text-white text-lg leading-tight">Absensi Fajar</h1>
          <p className="text-[10px] text-zinc-500 font-medium tracking-wider">ADMIN PORTAL</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-[#13ec6d]/10 text-[#13ec6d]"
                  : "text-zinc-400 hover:bg-[#13ec6d]/10 hover:text-[#13ec6d]"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-900">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="h-5 w-5" />
              {t('logout')}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be redirected to the landing page and your session will be ended.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-red-500 text-white hover:bg-red-600 border-none">
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop Sidebar — hidden on mobile */}
      <aside className="hidden lg:flex w-64 min-h-screen border-r border-zinc-900 bg-zinc-950 flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-in Sidebar */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
