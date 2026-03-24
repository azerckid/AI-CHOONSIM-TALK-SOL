import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, Form, useSubmit } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, and, desc, count, sum, SQL } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") || "all";
    const status = url.searchParams.get("status") || "all";

    const filters: SQL[] = [];
    if (provider !== "all") filters.push(eq(schema.payment.provider, provider));
    if (status !== "all") filters.push(eq(schema.payment.status, status));

    const payments = await db.query.payment.findMany({
        where: filters.length > 0 ? and(...filters) : undefined,
        with: {
            user: { columns: { name: true, email: true } }
        },
        orderBy: [desc(schema.payment.createdAt)],
        limit: 100
    });

    // Statistics
    const stats = await db.select({
        status: schema.payment.status,
        _count: count(),
        _sum: { amount: sum(schema.payment.amount) }
    })
        .from(schema.payment)
        .groupBy(schema.payment.status);

    return { payments, stats, provider, status };
}

export default function PaymentHistory() {
    const { payments, stats, provider, status } = useLoaderData<typeof loader>();
    const submit = useSubmit();

    const totalRevenue = stats.find(s => s.status === "COMPLETED")?._sum.amount || 0;

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:row justify-between items-start md:items-end gap-4">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                            Revenue <span className="text-primary">Ledger</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Global payment reconciliation and audit logs.</p>
                    </div>

                    <div className="px-8 py-4 bg-primary/10 border border-primary/20 rounded-[32px] flex items-center gap-4">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Confirmed Revenue</p>
                        <span className="text-2xl font-black italic text-white tracking-tighter">${totalRevenue.toLocaleString()}</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-2 flex flex-wrap gap-2 w-fit">
                    <Form method="get" className="flex gap-2" onChange={(e) => submit(e.currentTarget)}>
                        <select
                            name="provider"
                            defaultValue={provider}
                            className="bg-black/40 border border-white/10 rounded-2xl px-6 py-3 text-xs font-black text-white focus:border-primary/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">ALL PROVIDERS</option>
                            <option value="TOSS">TOSS PAY</option>
                            <option value="PAYPAL">PAYPAL</option>
                        </select>
                        <select
                            name="status"
                            defaultValue={status}
                            className="bg-black/40 border border-white/10 rounded-2xl px-6 py-3 text-xs font-black text-white focus:border-primary/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">ALL STATUS</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="PENDING">PENDING</option>
                            <option value="FAILED">FAILED</option>
                        </select>
                    </Form>
                </div>

                <div className="bg-[#1A1821] border border-white/5 rounded-[40px] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left font-medium">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/2">
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Transaction / User</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Gateway</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Amount</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Status</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <p className="text-white/20 font-bold italic uppercase tracking-widest">No payment records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((p) => (
                                        <tr key={p.id} className="hover:bg-white/1 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-white text-xs font-mono opacity-40 group-hover:opacity-100 transition-opacity">{p.transactionId || p.paymentKey || p.id}</span>
                                                    <span className="text-white/60 text-[10px]">{p.user?.name || p.user?.email || "Unknown"}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase",
                                                    p.provider === "TOSS" ? "bg-blue-500/10 text-blue-400" : "bg-primary/10 text-primary"
                                                )}>
                                                    {p.provider}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-white font-black italic tracking-tighter">
                                                {p.currency === "KRW" ? "₩" : "$"}{p.amount.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                                                        p.status === "COMPLETED" ? "bg-primary shadow-primary/60" :
                                                            p.status === "FAILED" ? "bg-red-500 shadow-red-500/60" : "bg-white/20"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-widest",
                                                        p.status === "COMPLETED" ? "text-primary" : "text-white/40"
                                                    )}>{p.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-white/20 text-[10px] font-bold uppercase tracking-tighter">
                                                {new Date(p.createdAt).toLocaleString()}
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
