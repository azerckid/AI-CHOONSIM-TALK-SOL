import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Link, useRevalidator, Form } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { deleteImage } from "~/lib/cloudinary.server";

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { desc, eq } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const notices = await db.query.notice.findMany({
        orderBy: [desc(schema.notice.createdAt)]
    });
    return { notices };
}

export async function action({ request }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "toggle_status") {
        const id = formData.get("id") as string;
        const notice = await db.query.notice.findFirst({ where: eq(schema.notice.id, id) });
        if (notice) {
            await db.update(schema.notice).set({
                isActive: !notice.isActive
            }).where(eq(schema.notice.id, id));
        }
        return { success: true };
    }

    if (intent === "delete") {
        const id = formData.get("id") as string;
        const notice = await db.query.notice.findFirst({ where: eq(schema.notice.id, id) });
        if (notice?.imageUrl) {
            await deleteImage(notice.imageUrl);
        }
        await db.delete(schema.notice).where(eq(schema.notice.id, id));
        return { success: true };
    }

    return null;
}

export default function AdminNoticeIndex() {
    const { notices } = useLoaderData<typeof loader>();
    const revalidator = useRevalidator();

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure?")) return;
        const formData = new FormData();
        formData.append("intent", "delete");
        formData.append("id", id);
        fetch(window.location.pathname, { method: "POST", body: formData })
            .then(() => {
                toast.success("Notice deleted");
                revalidator.revalidate();
            });
    };

    const handleToggle = (id: string) => {
        const formData = new FormData();
        formData.append("intent", "toggle_status");
        formData.append("id", id);
        fetch(window.location.pathname, { method: "POST", body: formData })
            .then(() => {
                toast.success("Status updated");
                revalidator.revalidate();
            });
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <Link to="/admin/content" className="text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all group mb-2">
                            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                            Back to Studio
                        </Link>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                            Notice <span className="text-primary">& Event</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Publish news and system announcements.</p>
                    </div>
                    <Link
                        to="/admin/content/notices/new"
                        className="bg-primary text-black px-6 py-3 rounded-2xl font-black italic text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,0,255,0.3)]"
                    >
                        + NEW NOTICE
                    </Link>
                </div>

                <div className="bg-[#1A1821] border border-white/5 rounded-[40px] overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/2">
                                <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Type / Title</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {notices.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center text-white/20 font-black italic tracking-widest uppercase">No notices published</td>
                                </tr>
                            ) : (
                                notices.map((n) => (
                                    <tr key={n.id} className="hover:bg-white/1 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded w-fit",
                                                    n.type === "EVENT" ? "bg-purple-500/20 text-purple-400" :
                                                        n.type === "NEWS" ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/40"
                                                )}>{n.type}</span>
                                                <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{n.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <button
                                                onClick={() => handleToggle(n.id)}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all",
                                                    n.isActive ? "bg-primary/20 text-primary border border-primary/20" : "bg-white/5 text-white/20 border border-white/5"
                                                )}
                                            >
                                                {n.isActive ? "Active" : "Draft"}
                                            </button>
                                        </td>
                                        <td className="px-8 py-5 text-[10px] text-white/20 font-bold">{new Date(n.createdAt).toLocaleDateString()}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link to={`/admin/content/notices/${n.id}`} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                                </Link>
                                                <button onClick={() => handleDelete(n.id)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
