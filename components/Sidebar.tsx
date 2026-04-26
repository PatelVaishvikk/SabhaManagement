"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  Clapperboard,
  Gauge,
  Images,
  Library,
  LogOut,
  Megaphone,
  MonitorPlay,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, ORGANIZATION_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/dashboard/library", label: "Library", icon: Library },
  { href: "/dashboard/planner", label: "Planner", icon: CalendarDays },
  { href: "/dashboard/bhajans", label: "Bhajan List", icon: Images },
  { href: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <Clapperboard className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{ORGANIZATION_NAME}</p>
          <p className="text-xs text-muted-foreground">{APP_NAME}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          return (
            <Button
              key={link.href}
              asChild
              variant={active ? "secondary" : "ghost"}
              className={cn("w-full justify-start", active && "bg-secondary")}
            >
              <Link href={link.href}>
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <Button asChild className="mb-2 w-full justify-start" variant="outline">
          <Link href="/dashboard/planner">
            <MonitorPlay className="h-4 w-4" />
            Start live mode
          </Link>
        </Button>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
