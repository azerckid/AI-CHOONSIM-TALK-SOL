import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSubmit, Form, Link } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { cn } from "~/lib/utils";
import { requireAdmin } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { desc, or, like } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const url = new URL(request.url);
    const search = url.searchParams.get("q") || "";

    const users = await db.query.user.findMany({
        where: search ? or(
            like(schema.user.email, `%${search}%`),
            like(schema.user.name, `%${search}%`)
        ) : undefined,
        orderBy: [desc(schema.user.createdAt)],
        limit: 50,
    });

    return { users, search };
}

export default function AdminUsers() {
    const { users, search } = useLoaderData<typeof loader>();
    const submit = useSubmit();

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                            User <span className="text-primary">Management</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Monitor and manage user accounts, tiers, and CHOCO balances.</p>
                    </div>

                    <Form
                        method="get"
                        className="w-full md:w-96 relative group"
                        onChange={(e) => submit(e.currentTarget)}
                    >
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">search</span>
                        <input
                            type="text"
                            name="q"
                            defaultValue={search}
                            placeholder="Search by email or name..."
                            className="w-full bg-[#1A1821] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold"
                        />
                    </Form>
                </div>

                <div className="bg-[#1A1821] border border-white/5 rounded-[40px] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/2">
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">User</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Wallet Address</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Role / Tier</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">CHOCO</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Joined</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <p className="text-white/20 font-bold italic uppercase tracking-widest">No users found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-white/2 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-primary border border-white/10 italic">
                                                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-bold tracking-tight">{user.name || "Unnamed User"}</span>
                                                        <span className="text-white/40 text-xs font-medium">{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-0.5 rounded w-fit",
                                                        user.role === "admin" ? "bg-red-500/10 text-red-500" : "bg-white/5 text-white/40"
                                                    )}>
                                                        {user.role?.toUpperCase()}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] font-black px-2 py-0.5 rounded w-fit uppercase",
                                                        user.subscriptionStatus === "active" ? "bg-primary text-black" : "bg-white/10 text-white/60"
                                                    )}>
                                                        {user.subscriptionTier || "FREE"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-white font-black italic tracking-tighter text-lg">{user.chocoBalance ? parseFloat(user.chocoBalance).toLocaleString() : "0"}</span>
                                                        <span className="text-primary font-bold text-[8px] uppercase">CHOCO</span>
                                                    </div>
                                                    <span className="text-[10px] text-white/20 font-medium">Token Balance</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-white/40 text-xs font-medium">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <Link
                                                    to={`/admin/users/${user.id}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold transition-all"
                                                >
                                                    MANAGE
                                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
