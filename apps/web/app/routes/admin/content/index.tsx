import type { LoaderFunctionArgs } from "react-router";
import { Link } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";

interface ContentSection {
    title: string;
    desc: string;
    icon: string;
    href: string;
    color: string;
    bg: string;
    status?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    return null;
}

export default function AdminContentIndex() {
    const sections: ContentSection[] = [
        {
            title: "Home Spotlight",
            desc: "Configure Today's Pick and main screen highlights.",
            icon: "star",
            href: "/admin/content/home",
            color: "text-amber-400",
            bg: "bg-amber-400/10"
        },
        {
            title: "Fan Feed",
            desc: "Manage user-generated tweets and media posts.",
            icon: "rss_feed",
            href: "/admin/content/feed",
            color: "text-blue-400",
            bg: "bg-blue-400/10"
        },
        {
            title: "Notices & Events",
            desc: "Publish system-wide notifications and banners.",
            icon: "campaign",
            href: "/admin/content/notices",
            color: "text-primary",
            bg: "bg-primary/10"
        },
        {
            title: "User Missions",
            desc: "Create and reward engagement with custom tasks.",
            icon: "task_alt",
            href: "/admin/content/missions",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10"
        }
    ];

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        Content <span className="text-primary">Studio</span>
                    </h1>
                    <p className="text-white/40 text-sm font-medium">Control the public-facing content and user interactions.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sections.map((section) => (
                        <Link
                            key={section.title}
                            to={section.href}
                            className={cn(
                                "group bg-[#1A1821] border border-white/5 p-8 rounded-[40px] hover:border-primary/20 transition-all duration-500 relative overflow-hidden",
                                section.status && "opacity-60 cursor-not-allowed group-hover:border-white/5"
                            )}
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <div className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center transition-transform group-hover:scale-110 duration-500", section.bg)}>
                                    <span className={cn("material-symbols-outlined text-4xl", section.color)}>{section.icon}</span>
                                </div>
                                {section.status && (
                                    <span className="px-3 py-1 bg-white/5 text-white/40 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                                        {section.status}
                                    </span>
                                )}
                            </div>

                            <div className="mt-8 space-y-2 relative z-10">
                                <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter group-hover:text-primary transition-colors">{section.title}</h2>
                                <p className="text-white/40 text-sm font-medium leading-relaxed">{section.desc}</p>
                            </div>

                            {!section.status && (
                                <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] relative z-10">
                                    Manage Channel
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </div>
                            )}

                            {/* Decorative background element */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.02] blur-3xl -mr-24 -mt-24 group-hover:bg-primary/5 transition-all duration-1000" />
                        </Link>
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
