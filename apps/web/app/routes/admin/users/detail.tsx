import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useNavigation, Form, useActionData, useRevalidator } from "react-router";
import { useState, useEffect } from "react";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { z } from "zod";
import { toast } from "sonner";

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { deleteAllUserContexts } from "~/lib/context/db";
import { SUBSCRIPTION_PLANS } from "~/lib/subscription-plans";
import { BigNumber } from "bignumber.js";
import { DateTime } from "luxon";
import crypto from "crypto";

export async function loader({ params, request }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const { id } = params;
    if (!id) throw new Response("User ID missing", { status: 400 });

    const user = await db.query.user.findFirst({
        where: eq(schema.user.id, id),
        with: {
            inventory: {
                with: {
                    item: true
                }
            },
            payments: {
                orderBy: (payments, { desc }) => [desc(payments.createdAt)]
            }
        }
    });

    if (!user) throw new Response("User not found", { status: 404 });

    const allItems = await db.query.item.findMany({
        where: eq(schema.item.isActive, true)
    });

    // Map userInventories to UserInventory to match frontend expectation or update frontend
    const userWithMappedInventory = {
        ...user,
        UserInventory: user.inventory
    };

    return { user: userWithMappedInventory, allItems };
}

export async function action({ params, request }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");
    const id = params.id;

    if (!id) return Response.json({ error: "ID missing" }, { status: 400 });

    if (actionType === "update_user") {
        const role = formData.get("role") as string;
        const tier = formData.get("tier") as string;
        const status = formData.get("subscriptionStatus") as string;
        const chocoBalance = formData.get("chocoBalance") as string;

        // 1. 현재 사용자 정보 조회
        const currentUser = await db.query.user.findFirst({
            where: eq(schema.user.id, id),
            columns: {
                subscriptionTier: true,
                chocoBalance: true,
            },
        });

        if (!currentUser) {
            return Response.json({ error: "User not found" }, { status: 404 });
        }

        // 2. 티어 변경 여부 확인
        const tierChanged = currentUser.subscriptionTier !== tier;
        const shouldGrantChoco = tierChanged && status === "active" && tier !== "FREE";

        let chocoAmount = "0";

        // 3. CHOCO 지급 로직 (티어 변경 및 active 상태일 때만)
        if (shouldGrantChoco) {
            const plan = SUBSCRIPTION_PLANS[tier as keyof typeof SUBSCRIPTION_PLANS];
            if (plan && plan.creditsPerMonth > 0) {
                chocoAmount = plan.creditsPerMonth.toString();
            }
        }

        // 4. DB 업데이트
        await db.transaction(async (tx) => {
            const currentChocoBalance = currentUser.chocoBalance || "0";
            const chocoToAdd = shouldGrantChoco ? chocoAmount : "0";
            const newChocoBalance = new BigNumber(currentChocoBalance)
                .plus(chocoToAdd)
                .toString();

            // currentPeriodEnd 계산 (active 상태일 때만)
            const nextMonth = status === "active"
                ? DateTime.now().plus({ months: 1 }).toJSDate()
                : undefined;

            // CHOCO 지급이 발생한 경우 자동 계산값 사용, 그렇지 않으면 수동 입력값 우선
            // 관리자가 입력 필드를 직접 수정하지 않았다면 (즉, 현재 DB 값인 currentChocoBalance와 동일하다면)
            // 자동 계산된 newChocoBalance를 사용하여 티어 변경에 따른 CHOCO 보너스를 반영합니다.
            const isManualOverride = chocoBalance !== null && chocoBalance !== currentChocoBalance;
            const finalChocoBalance = isManualOverride ? chocoBalance : newChocoBalance;

            await tx.update(schema.user).set({
                role,
                subscriptionTier: tier,
                subscriptionStatus: status,
                chocoBalance: finalChocoBalance,
                currentPeriodEnd: nextMonth,
                updatedAt: new Date(),
            }).where(eq(schema.user.id, id));

            // Payment 기록 생성 (CHOCO 지급 시)
            if (shouldGrantChoco && chocoAmount !== "0") {
                await tx.insert(schema.payment).values({
                    id: crypto.randomUUID(),
                    userId: id,
                    amount: 0, // 관리자 지정이므로 금액 없음
                    currency: "CHOCO",
                    status: "COMPLETED",
                    provider: "ADMIN",
                    type: "ADMIN_MEMBERSHIP_GRANT",
                    description: `Membership granted: ${tier}`,
                    creditsGranted: parseInt(chocoAmount), // 호환성을 위해 유지 (deprecated)
                    metadata: JSON.stringify({
                        tier,
                        chocoAmount,
                        grantedBy: "admin",
                    }),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

            }
        });

        return { success: true, message: "User updated successfully" };
    }

    if (actionType === "grant_item") {
        const itemId = formData.get("itemId") as string;
        const quantity = Number(formData.get("quantity"));

        if (!itemId || isNaN(quantity) || quantity <= 0) return Response.json({ error: "Invalid data" }, { status: 400 });

        const existing = await db.query.userInventory.findFirst({
            where: and(
                eq(schema.userInventory.userId, id),
                eq(schema.userInventory.itemId, itemId)
            )
        });

        if (existing) {
            await db.update(schema.userInventory)
                .set({ quantity: existing.quantity + quantity })
                .where(eq(schema.userInventory.id, existing.id));
        } else {
            await db.insert(schema.userInventory).values({
                id: crypto.randomUUID(),
                userId: id,
                itemId,
                quantity,
                updatedAt: new Date(),
            });
        }
        return { success: true, message: "Item granted successfully" };
    }

    if (actionType === "remove_item") {
        const inventoryId = formData.get("inventoryId") as string;
        await db.delete(schema.userInventory).where(eq(schema.userInventory.id, inventoryId));
        return { success: true, message: "Item removed from inventory" };
    }

    if (actionType === "delete_user") {
        await deleteAllUserContexts(id);
        await db.delete(schema.user).where(eq(schema.user.id, id));
        return { success: true, deleted: true, message: "User deleted" };
    }

    return null;
}

export default function UserDetail() {
    const { user, allItems } = useLoaderData<typeof loader>();
    const actionData = useActionData() as { success?: boolean; error?: string; deleted?: boolean; message?: string };
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const isSubmitting = navigation.state !== "idle";

    const [activeTab, setActiveTab] = useState<"profile" | "inventory" | "payments">("profile");

    useEffect(() => {
        if (actionData?.success) {
            toast.success(actionData.message || "Success");
            if (actionData.deleted) navigate("/admin/users");
            else revalidator.revalidate();
        } else if (actionData?.error) {
            toast.error(actionData.error);
        }
    }, [actionData, navigate]);

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase truncate max-w-md">
                            User: <span className="text-primary">{user.name || user.email}</span>
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Manage permissions, CHOCO balances, and inventory.</p>
                    </div>

                    <button
                        onClick={() => navigate("/admin/users")}
                        className="px-6 py-3 bg-white/5 text-white/60 rounded-xl font-bold text-sm hover:text-white transition-all underline decoration-primary/30 underline-offset-4"
                    >
                        BACK TO LIST
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-[#1A1821] rounded-2xl w-fit border border-white/5 overflow-x-auto scrollbar-hide">
                    {(["profile", "inventory", "payments"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                activeTab === tab
                                    ? "bg-primary text-black shadow-lg shadow-primary/20"
                                    : "text-white/40 hover:text-white"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar: Profile Summary */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 text-center space-y-4">
                            <div className="w-24 h-24 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center font-black text-primary italic text-3xl mx-auto border-dashed">
                                {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic text-white uppercase tracking-tighter truncate">{user.name || "N/A"}</h2>
                                <p className="text-white/40 text-xs font-medium truncate">{user.email}</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <span className={cn(
                                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                    user.role === "admin" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-white/10 text-white/40"
                                )}>
                                    {user.role}
                                </span>
                                <span className={cn(
                                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-primary text-black"
                                )}>
                                    {user.subscriptionTier || "FREE"}
                                </span>
                            </div>
                        </div>

                        <div className="bg-[#1A1821]/60 border border-white/5 rounded-[32px] p-6 space-y-4">
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Quick Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-white/40">CHOCO</span>
                                    <span className="text-primary font-black italic">{user.chocoBalance ? parseFloat(user.chocoBalance).toLocaleString() : "0"} CHOCO</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-white/40">Inventory</span>
                                    <span className="text-white font-medium">{user.UserInventory.length} items</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-white/40">Status</span>
                                    <span className={cn("font-black capitalize", user.subscriptionStatus === "active" ? "text-primary" : "text-white/20")}>
                                        {user.subscriptionStatus || "inactive"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {activeTab === "profile" && (
                            <Form method="post" onSubmit={(e) => {
                                if (!confirm("Are you sure? This action cannot be undone.")) e.preventDefault();
                            }}>
                                <input type="hidden" name="_action" value="delete_user" />
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black italic text-xs uppercase hover:bg-red-500 hover:text-white transition-all tracking-widest shadow-xl shadow-red-500/5"
                                >
                                    DELETE ACCOUNT
                                </button>
                            </Form>
                        )}
                    </div>

                    {/* Main: Content Area */}
                    <div className="md:col-span-2">
                        {activeTab === "profile" ? (
                            <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8">
                                <Form method="post" className="space-y-8">
                                    <input type="hidden" name="_action" value="update_user" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block italic">User Role</label>
                                            <select
                                                name="role"
                                                defaultValue={user.role || "user"}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold appearance-none cursor-pointer"
                                            >
                                                <option value="user">Standard User</option>
                                                <option value="moderator">Moderator</option>
                                                <option value="admin">Administrator</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block italic">CHOCO Balance</label>
                                            <div className="relative">
                                                <input
                                                    name="chocoBalance"
                                                    type="text"
                                                    defaultValue={user.chocoBalance || "0"}
                                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold pr-16"
                                                />
                                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-primary font-black text-[10px] uppercase">CHOCO</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block italic">Subscription Tier</label>
                                            <select
                                                name="tier"
                                                defaultValue={user.subscriptionTier || "FREE"}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold appearance-none cursor-pointer"
                                            >
                                                <option value="FREE">FREE</option>
                                                <option value="BASIC">BASIC</option>
                                                <option value="PREMIUM">PREMIUM</option>
                                                <option value="ULTIMATE">ULTIMATE</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block italic">Subscription Status</label>
                                            <select
                                                name="subscriptionStatus"
                                                defaultValue={user.subscriptionStatus || "inactive"}
                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold appearance-none cursor-pointer"
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                                <option value="expired">Expired</option>
                                                <option value="canceled">Canceled</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className={cn(
                                                "w-full py-6 bg-primary text-[#0B0A10] rounded-[32px] font-black italic text-xl tracking-tighter transition-all hover:scale-[1.02] shadow-[0_10px_40px_rgba(255,0,255,0.4)] flex items-center justify-center gap-3",
                                                isSubmitting && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            {isSubmitting ? (
                                                <span className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined font-bold">save</span>
                                                    APPLY CHANGES
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            </div>
                        ) : activeTab === "inventory" ? (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Grant Item Form */}
                                <div className="bg-[#1A1821] border border-white/5 rounded-[40px] p-8 space-y-6">
                                    <h3 className="text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm font-bold">card_giftcard</span>
                                        Manual Item Grant
                                    </h3>
                                    <Form method="post" className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                        <input type="hidden" name="_action" value="grant_item" />
                                        <div className="md:col-span-1 space-y-2">
                                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Select Item</label>
                                            <select name="itemId" className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold">
                                                {allItems.map(item => (
                                                    <option key={item.id} value={item.id}>{item.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Quantity</label>
                                            <input name="quantity" type="number" defaultValue={1} min={1} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold" />
                                        </div>
                                        <button type="submit" className="py-4 bg-primary text-black rounded-2xl font-black italic uppercase tracking-tighter hover:scale-105 transition-all">GRANT</button>
                                    </Form>
                                </div>

                                {/* Inventory List */}
                                <div className="bg-[#1A1821] border border-white/5 rounded-[40px] overflow-hidden">
                                    <h3 className="p-8 pb-4 text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-sm font-bold">inventory</span>
                                        Current Inventory
                                    </h3>
                                    <div className="divide-y divide-white/5">
                                        {user.UserInventory.length === 0 ? (
                                            <div className="p-12 text-center text-white/20 italic text-xs font-bold uppercase tracking-widest">Inventory is empty.</div>
                                        ) : (
                                            user.UserInventory.map(inv => (
                                                <div key={inv.id} className="p-6 flex items-center justify-between group hover:bg-white/2 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center">
                                                            {inv.item.iconUrl ? <img src={inv.item.iconUrl} alt={inv.item.name} className="w-8 h-8 object-contain" /> : <span className="material-symbols-outlined text-primary/40">token</span>}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white uppercase tracking-tight">{inv.item.name}</p>
                                                            <p className="text-[10px] text-white/40 font-black italic">{inv.quantity} UNITS</p>
                                                        </div>
                                                    </div>
                                                    <Form method="post" onSubmit={e => !confirm("Remove this item?") && e.preventDefault()}>
                                                        <input type="hidden" name="_action" value="remove_item" />
                                                        <input type="hidden" name="inventoryId" value={inv.id} />
                                                        <button className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white">
                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                        </button>
                                                    </Form>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#1A1821] border border-white/5 rounded-[40px] overflow-hidden animate-in fade-in duration-500">
                                <h3 className="p-8 pb-4 text-xs font-black text-white/60 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-sm font-bold">receipt_long</span>
                                    Payment History
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/2">
                                                <th className="px-8 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest">Date</th>
                                                <th className="px-8 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest">Provider</th>
                                                <th className="px-8 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest">Amount</th>
                                                <th className="px-8 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest">CHOCO Granted</th>
                                                <th className="px-8 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {user.payments.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-20 text-center text-white/10 italic text-xs font-bold uppercase tracking-widest">No payment records.</td>
                                                </tr>
                                            ) : (
                                                user.payments.map((p) => (
                                                    <tr key={p.id} className="hover:bg-white/1 transition-colors">
                                                        <td className="px-8 py-4 text-[11px] text-white/40 font-medium whitespace-nowrap">
                                                            {new Date(p.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <span className="text-[10px] font-black text-white uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded">{p.provider}</span>
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <span className="text-xs font-bold text-white">${p.amount}</span>
                                                        </td>
                                                        <td className="px-8 py-4">
                                                            <span className="text-xs font-black text-primary italic">+{p.creditsGranted || "0"} CHOCO</span>
                                                        </td>
                                                        <td className="px-8 py-4 text-right">
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm",
                                                                p.status === "COMPLETED" ? "bg-green-500/20 text-green-400 border border-green-500/20" :
                                                                    p.status === "PENDING" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/20" :
                                                                        "bg-red-500/20 text-red-400 border border-red-500/20"
                                                            )}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
