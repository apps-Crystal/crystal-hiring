"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase, Users, ClipboardList, FileText,
  CheckSquare, Settings, LogOut, BarChart3, Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const nav: NavItem[] = [
  {
    href: "/dashboard/requisitions",
    label: "Requisitions",
    icon: <Briefcase className="w-4 h-4" />,
  },
  {
    href: "/dashboard/screening",
    label: "Screening",
    icon: <ClipboardList className="w-4 h-4" />,
    roles: ["CHRO", "TA_HEAD", "HR_SENIOR", "HR_EXEC"],
  },
  {
    href: "/dashboard/candidates",
    label: "Candidates",
    icon: <Users className="w-4 h-4" />,
    roles: ["CHRO", "TA_HEAD", "HR_SENIOR"],
  },
  {
    href: "/dashboard/interviews",
    label: "Interviews",
    icon: <Star className="w-4 h-4" />,
    roles: ["CHRO", "TA_HEAD", "HR_SENIOR"],
  },
  {
    href: "/dashboard/offers",
    label: "Offers",
    icon: <FileText className="w-4 h-4" />,
    roles: ["CHRO", "TA_HEAD", "MANAGEMENT"],
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["CHRO", "TA_HEAD", "MANAGEMENT"],
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: <Settings className="w-4 h-4" />,
    roles: ["CHRO", "TA_HEAD"],
  },
];

interface SidebarProps {
  user: { name: string; role: string; email: string };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const roleLabel: Record<string, string> = {
    CHRO: "CHRO",
    TA_HEAD: "TA Head",
    HR_SENIOR: "HR Senior",
    HR_EXEC: "HR Executive",
    MANAGEMENT: "Management",
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const visibleNav = nav.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  return (
    <aside className="w-60 shrink-0 bg-slate-900 flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <CheckSquare className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">Crystal Group</p>
            <p className="text-xs text-slate-400 truncate">Hiring System</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white font-medium truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{roleLabel[user.role] ?? user.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-2 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
