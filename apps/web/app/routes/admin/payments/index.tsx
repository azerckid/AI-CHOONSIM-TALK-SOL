import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useLoaderData, Form, redirect, useSubmit } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, and, desc, count, sum, type SQL } from "drizzle-orm";

type PaymentMetadata = {
    splTransfer?: {
        status?: string;
        signature?: string;
        walletAddress?: string;
        error?: string;
        reason?: string;
        completedAt?: string;
        retriedAt?: string;
    };
    [key: string]: unknown;
};

function parseMetadata(metadata: string | null): PaymentMetadata {
    if (!metadata) return {};
    try {
        const parsed = JSON.parse(metadata);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function getSplTransferStatus(metadata: string | null): string {
    return parseMetadata(metadata).splTransfer?.status ?? "NONE";
}

function needsSplRetry(status: string): boolean {
    return status === "FAILED" || status === "SKIPPED";
}

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") || "all";
    const status = url.searchParams.get("status") || "all";
    const spl = url.searchParams.get("spl") || "all";

    const filters: SQL[] = [];
    if (provider !== "all") filters.push(eq(schema.payment.provider, provider));
    if (status !== "all") filters.push(eq(schema.payment.status, status));

    const allPayments = await db.query.payment.findMany({
        where: filters.length > 0 ? and(...filters) : undefined,
        with: {
            user: { columns: { name: true, email: true } }
        },
        orderBy: [desc(schema.payment.createdAt)],
        limit: 100
    });

    const payments = allPayments.filter((payment) => {
        if (spl === "all") return true;
        const splStatus = getSplTransferStatus(payment.metadata);
        if (spl === "needs") return needsSplRetry(splStatus);
        return splStatus === spl;
    });

    // Statistics
    const stats = await db.select({
        status: schema.payment.status,
        _count: count(),
        _sum: { amount: sum(schema.payment.amount) }
    })
        .from(schema.payment)
        .groupBy(schema.payment.status);

    return { payments, stats, provider, status, spl };
}

export async function action({ request }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const actionType = String(formData.get("_action") ?? "");
    const paymentId = String(formData.get("paymentId") ?? "");
    const provider = String(formData.get("provider") ?? "all");
    const status = String(formData.get("status") ?? "all");
    const spl = String(formData.get("spl") ?? "needs");
    const redirectUrl = `/admin/payments?provider=${provider}&status=${status}&spl=${spl}`;

    if (actionType !== "retry_spl" || !paymentId) {
        return redirect(`${redirectUrl}&retry=invalid`);
    }

    const payment = await db.query.payment.findFirst({
        where: eq(schema.payment.id, paymentId),
        columns: {
            id: true,
            userId: true,
            status: true,
            creditsGranted: true,
            metadata: true,
        },
    });

    if (!payment || payment.status !== "COMPLETED" || !payment.creditsGranted) {
        return redirect(`${redirectUrl}&retry=invalid`);
    }

    const metadata = parseMetadata(payment.metadata);
    const previousStatus = metadata.splTransfer?.status ?? "NONE";
    if (!needsSplRetry(previousStatus)) {
        return redirect(`${redirectUrl}&retry=not-needed`);
    }

    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, payment.userId),
        columns: { solanaWallet: true, privyWallet: true },
    });
    const payoutWallet = user?.solanaWallet ?? user?.privyWallet ?? null;
    if (!payoutWallet) {
        await db.update(schema.payment)
            .set({
                metadata: JSON.stringify({
                    ...metadata,
                    splTransfer: {
                        status: "SKIPPED",
                        reason: "USER_PAYOUT_WALLET_NOT_REGISTERED",
                        previousStatus,
                        retriedAt: new Date().toISOString(),
                    },
                }),
                updatedAt: new Date(),
            })
            .where(eq(schema.payment.id, payment.id));
        return redirect(`${redirectUrl}&retry=no-wallet`);
    }

    try {
        const { transferChocoSPL } = await import("~/lib/solana/agent-kit.server");
        const result = await transferChocoSPL(payoutWallet, payment.creditsGranted);
        await db.update(schema.payment)
            .set({
                metadata: JSON.stringify({
                    ...metadata,
                    splTransfer: {
                        status: "COMPLETED",
                        signature: result.signature,
                        walletAddress: payoutWallet,
                        previousStatus,
                        retriedAt: new Date().toISOString(),
                    },
                }),
                updatedAt: new Date(),
            })
            .where(eq(schema.payment.id, payment.id));
        return redirect(`${redirectUrl}&retry=success`);
    } catch (error) {
        await db.update(schema.payment)
            .set({
                metadata: JSON.stringify({
                    ...metadata,
                    splTransfer: {
                        status: "FAILED",
                        error: error instanceof Error ? error.message : String(error),
                        walletAddress: payoutWallet,
                        previousStatus,
                        retriedAt: new Date().toISOString(),
                    },
                }),
                updatedAt: new Date(),
            })
            .where(eq(schema.payment.id, payment.id));
        return redirect(`${redirectUrl}&retry=failed`);
    }
}

export default function PaymentHistory() {
    const { payments, stats, provider, status, spl } = useLoaderData<typeof loader>();
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
                            <option value="SOLANA">SOLANA</option>
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
                        <select
                            name="spl"
                            defaultValue={spl}
                            className="bg-black/40 border border-white/10 rounded-2xl px-6 py-3 text-xs font-black text-white focus:border-primary/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="all">ALL SPL</option>
                            <option value="needs">NEEDS RETRY</option>
                            <option value="COMPLETED">SPL COMPLETED</option>
                            <option value="FAILED">SPL FAILED</option>
                            <option value="SKIPPED">SPL SKIPPED</option>
                            <option value="NONE">NO SPL META</option>
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
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">SPL</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <p className="text-white/20 font-bold italic uppercase tracking-widest">No payment records found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((p) => {
                                        const splStatus = getSplTransferStatus(p.metadata);
                                        const canRetry = p.status === "COMPLETED" && needsSplRetry(splStatus);

                                        return (
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
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase",
                                                        splStatus === "COMPLETED" ? "bg-primary/10 text-primary" :
                                                            needsSplRetry(splStatus) ? "bg-red-500/10 text-red-400" : "bg-white/5 text-white/40"
                                                    )}>
                                                        {splStatus}
                                                    </span>
                                                    {canRetry && (
                                                        <Form method="post">
                                                            <input type="hidden" name="_action" value="retry_spl" />
                                                            <input type="hidden" name="paymentId" value={p.id} />
                                                            <input type="hidden" name="provider" value={provider} />
                                                            <input type="hidden" name="status" value={status} />
                                                            <input type="hidden" name="spl" value={spl} />
                                                            <button
                                                                type="submit"
                                                                className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest"
                                                            >
                                                                Retry
                                                            </button>
                                                        </Form>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-white/20 text-[10px] font-bold uppercase tracking-tighter">
                                                {new Date(p.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
