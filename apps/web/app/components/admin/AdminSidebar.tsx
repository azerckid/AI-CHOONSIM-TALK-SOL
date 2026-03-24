import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";

interface AdminSidebarProps {
    className?: string;
}

const MENU_ITEMS = [
    { name: "Dashboard", icon: "dashboard", href: "/admin/dashboard" },
    { name: "Characters", icon: "person", href: "/admin/characters" },
    { name: "Items", icon: "redeem", href: "/admin/items" },
    { name: "Analytics", icon: "bar_chart", href: "/admin/items/statistics" },
    { name: "Users", icon: "group", href: "/admin/users" },
    { name: "Payments", icon: "payments", href: "/admin/payments" },
    { name: "Content", icon: "article", href: "/admin/content" },
    { name: "System", icon: "monitoring", href: "/admin/system" },
];

export function AdminSidebar({ className }: AdminSidebarProps) {
    const location = useLocation();

    return (
        <aside className={cn("w-64 bg-[#1A1821] border-r border-white/5 flex flex-col h-full", className)}>
            <div className="p-6 border-b border-white/5">
                <Link to="/admin/dashboard" className="flex items-center gap-2">
                    <span className="text-2xl font-black italic tracking-tighter text-primary uppercase">ADMIN</span>
                </Link>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {MENU_ITEMS.map((item) => {
                    const isActive = location.pathname === item.href ||
                        (item.href !== "/admin/dashboard" && location.pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                                isActive
                                    ? "bg-primary text-[#0B0A10] shadow-[0_4px_20px_rgba(255,0,255,0.3)]"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <span className={cn(
                                "material-symbols-outlined text-[20px]",
                                isActive ? "text-[#0B0A10]" : "text-primary group-hover:scale-110 transition-transform"
                            )}>
                                {item.icon}
                            </span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5">
                <Link
                    to="/"
                    className="flex items-center gap-3 px-4 py-3 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Back to App
                </Link>
            </div>
        </aside>
    );
}
