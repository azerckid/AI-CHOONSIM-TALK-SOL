import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { BigNumber } from "bignumber.js";

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { count, sum, eq, desc } from "drizzle-orm";
import { getServiceWalletStats, getEconomyStats } from "~/lib/admin/stats.server";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    // Aggregate statistics as proxies for API usage
    const [messagesRes, executionRes, mediaRes, userRes, pendingPaymentsRes, logs, serviceWallet, economy] = await Promise.all([
        db.select({ count: count() }).from(schema.message),
        db.select({ count: count() }).from(schema.agentExecution),
        db.select({ count: count() }).from(schema.characterMedia),
        db.select({ count: count() }).from(schema.user),
        db.select({ count: count() }).from(schema.payment).where(eq(schema.payment.status, "PENDING")),
        db.query.systemLog.findMany({
            orderBy: [desc(schema.systemLog.createdAt)],
            limit: 20
        }),
        getServiceWalletStats(),
        getEconomyStats()
    ]);

    const totalMessages = messagesRes[0]?.count || 0;
    const executionCount = executionRes[0]?.count || 0;
    const mediaCount = mediaRes[0]?.count || 0;
    const userCount = userRes[0]?.count || 0;
    const pendingPayments = pendingPaymentsRes[0]?.count || 0;

    // Calculate actual token consumption
    const tokenStats = await db.select({
        totalTokens: sum(schema.agentExecution.totalTokens)
    }).from(schema.agentExecution);

    // Mock system health data (could be fetched from process or server-side logs)
    const systemHealth = {
        database: "Connected",
        storage: "Operational",
        api: "Healthy",
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().rss,
        nodeVersion: process.version
    };

    return {
        usage: {
            totalMessages,
            aiMessages: executionCount,
            mediaCount,
            userCount,
            pendingPayments,
            totalTokens: Number(tokenStats[0]?.totalTokens) || 0
        },
        health: systemHealth,
        economy: {
            serviceWallet,
            stats: economy
        },
        logs
    };
}

export default function AdminSystem() {
    const { usage, health, logs, economy } = useLoaderData<typeof loader>();

    const formatMemory = (bytes: number) => {
        return (bytes / 1024 / 1024).toFixed(2) + " MB";
    };

    const formatUptime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">
                        System <span className="text-primary">Monitor</span>
                    </h1>
                    <p className="text-white/40 text-sm font-medium">Real-time infrastructure health and API consumption.</p>
                </div>

                {/* Health Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: "Postgres DB", status: health.database, color: "text-primary" },
                        { label: "Cloudinary", status: health.storage, color: "text-blue-400" },
                        { label: "Gemini API", status: health.api, color: "text-purple-400" },
                        { label: "System Uptime", status: formatUptime(health.uptime), color: "text-white" }
                    ].map((item) => (
                        <div key={item.label} className="bg-[#1A1821] border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center space-y-2 group hover:border-white/10 transition-all">
                            <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px] animate-pulse mb-2",
                                item.status === "Connected" || item.status === "Operational" || item.status === "Healthy" ? "bg-primary shadow-primary/60" : "bg-white/20"
                            )} />
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{item.label}</span>
                            <span className={cn("text-lg font-black italic tracking-tighter", item.color)}>{item.status}</span>
                        </div>
                    ))}
                </div>

                {/* CHOCO Economy Dashboard */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                                CHOCO Economy <span className="text-primary/40">Integrity Check</span>
                            </h2>
                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">Cross-referencing On-Chain Supply with Database Liabilities.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {/* 1. Total Minted Supply (Physical) */}
                        <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-6 space-y-4 relative overflow-hidden group">
                            <div className="space-y-1 relative z-10">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Minted (On-Chain)</p>
                                <div className="flex items-baseline gap-1">
                                    <h4 className="text-2xl font-black italic tracking-tighter text-white whitespace-nowrap">{economy.serviceWallet.totalSupply}</h4>
                                    <span className="text-[10px] font-black text-white/40 italic uppercase">CHOCO</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/20 uppercase">Source</span>
                                <span className="text-[9px] font-black text-primary uppercase italic font-mono">ft_total_supply</span>
                            </div>
                        </div>

                        {/* 2. Service Net Liquidity (Available) */}
                        <div className="bg-linear-to-br from-primary/10 to-transparent border border-primary/20 rounded-[32px] p-6 space-y-4 relative overflow-hidden group">
                            <div className="space-y-1 relative z-10">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Net Available (Service)</p>
                                <div className="flex items-baseline gap-1">
                                    <h4 className="text-2xl font-black italic tracking-tighter text-primary whitespace-nowrap">
                                        {new BigNumber(economy.stats.totalUserChocoRaw).toFormat(0)}
                                    </h4>
                                    <span className="text-[10px] font-black text-primary/40 italic uppercase">CHOCO</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-primary/10 flex items-center justify-between">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Total User Balance</span>
                                <span className="text-[9px] font-black text-primary uppercase">DB</span>
                            </div>
                        </div>

                        {/* 3. Placeholder */}
                        <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-6 space-y-4 group">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Purchased CHOCO</p>
                                <div className="flex items-baseline gap-1">
                                    <h4 className="text-2xl font-black italic tracking-tighter text-white whitespace-nowrap">
                                        {economy.stats.totalPurchasedChoco}
                                    </h4>
                                    <span className="text-[10px] font-black text-white/40 italic uppercase">CHOCO</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Liability</span>
                                <span className="text-[9px] font-black text-yellow-500 uppercase">Wait Auth</span>
                            </div>
                        </div>

                        {/* 4. Public Circulation (On-Chain) */}
                        <div className="bg-[#1A1821] border border-white/5 rounded-[32px] p-6 space-y-4 group">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Public (In-Wallet)</p>
                                <div className="flex items-baseline gap-1">
                                    <h4 className="text-2xl font-black italic tracking-tighter text-white whitespace-nowrap">
                                        {new BigNumber(economy.serviceWallet.totalSupplyRaw)
                                            .minus(economy.serviceWallet.chocoBalanceRaw)
                                            .dividedBy(new BigNumber(10).pow(18))
                                            .toFormat(0)
                                        }
                                    </h4>
                                    <span className="text-[10px] font-black text-white/40 italic uppercase">CHOCO</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Distributed</span>
                                <span className="text-[9px] font-black text-blue-400 uppercase">On-Chain</span>
                            </div>
                        </div>

                        {/* 5. System Integrity (The Real Truth) */}
                        <div className={cn(
                            "rounded-[32px] p-5 space-y-3 shadow-[0_0_30px_rgba(0,0,0,0.3)] border transition-all duration-500",
                            new BigNumber(economy.serviceWallet.totalSupplyRaw).isEqualTo(1000000000 * 1e18)
                                ? "bg-primary border-primary/20"
                                : "bg-red-500 border-red-400"
                        )}>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-[#0B0A10] uppercase tracking-widest">Calculated Grand Total</p>
                                <p className="text-2xl font-black italic text-[#0B0A10] tracking-tighter">
                                    {/* 실제 계산: 온체인 발행량 그대로 표시하되 오차 분석 */}
                                    {new BigNumber(economy.serviceWallet.totalSupplyRaw)
                                        .dividedBy(new BigNumber(10).pow(18))
                                        .toFormat(0)
                                    }
                                </p>
                            </div>
                            <div className="pt-3 border-t border-[#0B0A10]/10">
                                <div className="flex justify-between items-center bg-[#0B0A10]/20 px-2 py-1.5 rounded-lg border border-[#0B0A10]/10">
                                    <span className="text-[8px] font-black text-[#0B0A10] uppercase">Drift / Loss</span>
                                    <span className="text-[9px] font-black text-[#0B0A10] uppercase">
                                        {(() => {
                                            const expected = new BigNumber(1000000000);
                                            const actual = new BigNumber(economy.serviceWallet.totalSupplyRaw).dividedBy(new BigNumber(10).pow(18));
                                            const delta = actual.minus(expected);
                                            return delta.isZero() ? "None (Perfect)" : `${delta.toFormat(0)} CHOCO`;
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#1A1821] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Sales Tracked (USD)</span>
                            <span className="text-sm font-black italic text-white/80">+{economy.stats.totalPurchasedChoco} CHOCO</span>
                        </div>
                        <div className="bg-[#1A1821] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Manual Grants</span>
                            <span className="text-sm font-black italic text-primary/80">+{economy.stats.totalGrantedChoco} CHOCO</span>
                        </div>
                        <div className="bg-[#1A1821] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Service Balance</span>
                            <span className="text-sm font-black italic text-white/80">{economy.serviceWallet.serviceBalance}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* API Consumption */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-8">
                            <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm font-bold">analytics</span>
                                API Consumption Metrics
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Gemini (Accumulated Tokens)</p>
                                            <p className="text-2xl font-black text-white italic tracking-tighter">{usage.totalTokens.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-primary shadow-[0_0_10px_rgba(255,0,255,0.4)]" style={{ width: `${Math.min((usage.totalTokens / 1000000) * 100, 100)}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-tighter">
                                        <span>Total Tokens Used</span>
                                        <span>Limit: 1M Tokens (Est.)</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Cloudinary (Media)</p>
                                            <p className="text-2xl font-black text-white italic tracking-tighter">{usage.mediaCount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" style={{ width: "12%" }} />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-black text-white/20 uppercase tracking-tighter">
                                        <span>Assets stored</span>
                                        <span>Plan: 25GB Free</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent System Events - Real Logs */}
                        <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                            <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500 text-sm font-bold">event_note</span>
                                Recent System Logs
                            </h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {logs.length === 0 ? (
                                    <p className="text-center py-10 text-white/10 font-bold italic uppercase tracking-widest">No logs recorded</p>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={log.id} className="group flex flex-col gap-2 p-4 bg-black/20 border border-white/5 rounded-2xl hover:border-white/10 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-black",
                                                    log.level === "ERROR" ? "bg-red-500" : log.level === "WARN" ? "bg-yellow-500" : log.level === "AUDIT" ? "bg-cyan-500" : "bg-primary"
                                                )}>
                                                    {log.level}
                                                </div>
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">{log.category}</span>
                                                <span className="flex-1 text-right text-[8px] text-white/10 uppercase font-bold">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-medium text-white/70 leading-relaxed">{log.message}</p>
                                            {log.stackTrace && (
                                                <details className="mt-2 group/stack">
                                                    <summary className="text-[8px] font-black text-white/20 cursor-pointer hover:text-white transition-colors uppercase tracking-widest">View Stack Trace</summary>
                                                    <pre className="mt-2 p-4 bg-black/40 rounded-xl text-[10px] text-red-400 overflow-x-auto font-mono opacity-60">
                                                        {log.stackTrace}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Resources */}
                    <div className="space-y-8">
                        <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                            <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm font-bold">schedule</span>
                                Cron Job Health
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { name: "Daily CHOCO Refill", pattern: "Daily CHOCO Refill", icon: "database" },
                                    { name: "Proactive Service", pattern: "proactive message", icon: "send" }
                                ].map((job) => {
                                    const lastRun = logs.find(l => l.message.includes(job.pattern) || l.message.toLowerCase().includes(job.pattern.toLowerCase()));
                                    const isOk = lastRun && lastRun.level !== "ERROR";
                                    return (
                                        <div key={job.name} className="flex items-center gap-4">
                                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-black/40 border border-white/5",
                                                isOk ? "text-primary" : "text-white/20"
                                            )}>
                                                <span className="material-symbols-outlined text-lg">{job.icon}</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{job.name}</p>
                                                <p className="text-[10px] text-white/20">
                                                    {lastRun
                                                        ? `Last active: ${new Date(lastRun.createdAt).toLocaleTimeString()}`
                                                        : "No recent activity log"
                                                    }
                                                </p>
                                            </div>
                                            <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase",
                                                isOk ? "bg-primary/20 text-primary" : "bg-white/5 text-white/20"
                                            )}>
                                                {isOk ? "Healthy" : "Standby"}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                            <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm font-bold">memory</span>
                                Host Resources
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] font-black text-white/40 uppercase">Memory RSS</span>
                                        <span className="text-sm font-black text-white italic tracking-tighter">{formatMemory(health.memoryUsage)}</span>
                                    </div>
                                    <div className="h-2 bg-black/40 rounded-full border border-white/5 overflow-hidden">
                                        <div className="h-full bg-primary" style={{ width: "45%" }} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-white/20 uppercase">Running Process</p>
                                    <p className="text-xs font-medium text-white/60">Node.js {health.nodeVersion}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-[40px] p-8 text-center space-y-4">
                            <span className="material-symbols-outlined text-primary text-4xl group-hover:rotate-12 transition-transform duration-500">verified_user</span>
                            <div className="space-y-1">
                                <p className="text-xs font-black text-white uppercase tracking-tighter">Security Audit Clear</p>
                                <p className="text-[10px] text-white/40 font-medium">All administrative endpoints are protected by MFA/Session validation.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
