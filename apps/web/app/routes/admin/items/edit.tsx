import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useNavigation, Form, useActionData, useRevalidator } from "react-router";
import { useState, useEffect } from "react";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { z } from "zod";
import { toast } from "sonner";

const itemSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    type: z.enum(["GIFT", "CONSUMABLE", "CURRENCY"]),
    priceCredits: z.coerce.number().min(0).optional(), // Deprecated: 호환성을 위해 유지
    priceChoco: z.coerce.number().min(0).optional(), // 신규: CHOCO 가격
    priceUSD: z.coerce.number().min(0).optional(),
    priceKRW: z.coerce.number().min(0).optional(),
    description: z.string().optional(),
    iconUrl: z.string().optional(),
    isActive: z.boolean().default(true),
});

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";

export async function loader({ params, request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    const { id } = params;
    if (!id || id === "new") {
        return { item: null };
    }

    const item = await db.query.item.findFirst({
        where: eq(schema.item.id, id),
    });

    if (!item) {
        throw new Response("Item not found", { status: 404 });
    }

    return { item };
}

export async function action({ params, request }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    const id = params.id;
    const isNew = !id || id === "new";

    if (actionType === "delete") {
        if (!id) return Response.json({ error: "ID missing" }, { status: 400 });
        await db.delete(schema.item).where(eq(schema.item.id, id));
        return { success: true, deleted: true, message: "Item deleted successfully" };
    }

    const data = {
        id: formData.get("id") as string,
        name: formData.get("name") as string,
        type: formData.get("type") as string,
        priceCredits: Number(formData.get("priceCredits")) || 0, // Deprecated
        priceChoco: Number(formData.get("priceChoco")) || 0, // 신규
        priceUSD: Number(formData.get("priceUSD")) || 0,
        priceKRW: Number(formData.get("priceKRW")) || 0,
        description: formData.get("description") as string,
        iconUrl: formData.get("iconUrl") as string,
        isActive: formData.get("isActive") === "true",
    };

    try {
        const validated = itemSchema.parse(data);
        const { id: validatedId, ...restValidated } = validated;

        if (isNew) {
            await db.insert(schema.item).values({
                id: validatedId || crypto.randomUUID(),
                ...restValidated,
                updatedAt: new Date(),
            });
            return { success: true, message: "Item created successfully!" };
        } else {
            await db.update(schema.item).set({
                ...restValidated,
                updatedAt: new Date(),
            }).where(eq(schema.item.id, id));
            return { success: true, message: "Item updated successfully!" };
        }
    } catch (e) {
        if (e instanceof z.ZodError) {
            return Response.json({ error: e.issues[0].message }, { status: 400 });
        }
        console.error(e);
        return Response.json({ error: "Failed to save item" }, { status: 500 });
    }
}

export default function EditItem() {
    const { item } = useLoaderData<typeof loader>();
    const actionData = useActionData() as { success?: boolean; error?: string; deleted?: boolean; message?: string };
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const isSubmitting = navigation.state !== "idle";
    const isNew = !item;

    const [iconUrl, setIconUrl] = useState(item?.iconUrl || "");

    useEffect(() => {
        if (actionData?.success) {
            if (actionData.deleted) {
                toast.success(actionData.message || "Item deleted");
                navigate("/admin/items");
            } else {
                toast.success(actionData.message || "Saved");
                if (isNew) navigate("/admin/items");
            }
        } else if (actionData?.error) {
            toast.error(actionData.error);
        }
    }, [actionData, navigate, isNew]);

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">
                            {isNew ? "Create New Item" : `Edit: ${item.name}`}
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Configure item pricing, type, and icon.</p>
                    </div>

                    <div className="flex gap-3">
                        {!isNew && (
                            <Form method="post" onSubmit={(e) => {
                                if (!confirm("Are you sure? This item will be removed from the store.")) {
                                    e.preventDefault();
                                }
                            }}>
                                <input type="hidden" name="_action" value="delete" />
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all"
                                >
                                    DELETE
                                </button>
                            </Form>
                        )}
                        <button
                            onClick={() => navigate("/admin/items")}
                            className="px-6 py-3 bg-white/5 text-white/60 rounded-xl font-bold text-sm hover:text-white transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>

                <div className="bg-[#1A1821]/60 border border-white/5 rounded-[40px] p-8">
                    <Form method="post" className="space-y-8">
                        <input type="hidden" name="iconUrl" value={iconUrl} />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Icon Preview & Upload */}
                            <div className="md:col-span-1 space-y-4">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2 block italic">Item Icon</label>
                                <div className="aspect-square bg-black/40 border border-white/10 rounded-3xl flex items-center justify-center relative group overflow-hidden border-dashed hover:border-primary/50 transition-colors">
                                    {iconUrl ? (
                                        <>
                                            <img src={iconUrl} alt="Preview" className="w-2/3 h-2/3 object-contain" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setIconUrl("")}
                                                    className="p-2 bg-red-500 rounded-lg text-white"
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById("icon-upload")?.click()}
                                            className="flex flex-col items-center gap-2 text-white/20 hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-4xl">add_photo_alternate</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Upload Icon</span>
                                        </button>
                                    )}
                                    <input
                                        type="file"
                                        id="icon-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const toastId = toast.loading("Uploading icon...");
                                            try {
                                                const formData = new FormData();
                                                formData.append("file", file);
                                                const res = await fetch("/api/upload", { method: "POST", body: formData });
                                                const result = await res.json();
                                                if (result.url) {
                                                    setIconUrl(result.url);
                                                    toast.success("Icon uploaded!", { id: toastId });
                                                }
                                            } catch (err) {
                                                toast.error("Upload failed", { id: toastId });
                                            }
                                        }}
                                    />
                                </div>
                                <p className="text-[9px] text-white/20 italic text-center uppercase tracking-tighter">Recommended: Transparent PNG, 200x200</p>
                            </div>

                            {/* Core Details */}
                            <div className="md:col-span-2 space-y-6">

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Item ID (Optional, for System Triggers)</label>
                                    <input
                                        name="id"
                                        defaultValue={item?.id}
                                        placeholder="e.g. heart, memory_ticket (Leave blank for auto UUID)"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-mono text-sm"
                                        readOnly={!isNew}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Item Name</label>
                                    <input
                                        name="name"
                                        defaultValue={item?.name}
                                        placeholder="e.g. Red Heart, Golden Rose"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Type</label>
                                        <select
                                            name="type"
                                            defaultValue={item?.type || "GIFT"}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold appearance-none cursor-pointer"
                                        >
                                            <option value="GIFT">Gift (Send to AI)</option>
                                            <option value="CONSUMABLE">Consumable (Self-use)</option>
                                            <option value="CURRENCY">Token (Internal Economy)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end pb-4">
                                        <label className="flex items-center gap-3 cursor-pointer group px-2">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    name="isActive"
                                                    value="true"
                                                    defaultChecked={item?.isActive ?? true}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-12 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary transition-all duration-300" />
                                                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all duration-300" />
                                            </div>
                                            <span className="text-sm font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">Active in Store</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Description</label>
                                    <textarea
                                        name="description"
                                        defaultValue={item?.description || ""}
                                        placeholder="Explain what this item does or represents..."
                                        rows={3}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing Section */}
                        <div className="pt-8 border-t border-white/5 space-y-6">
                            <h2 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">payments</span>
                                Price Configuration
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">CHOCO Price</label>
                                    <div className="relative">
                                        <input
                                            name="priceChoco"
                                            type="number"
                                            defaultValue={item?.priceChoco || item?.priceCredits || 0}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold pr-12"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-primary font-black text-[10px] uppercase">CHOCO</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-2">Credits (Deprecated)</label>
                                    <div className="relative">
                                        <input
                                            name="priceCredits"
                                            type="number"
                                            defaultValue={item?.priceCredits || 0}
                                            className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 text-white/40 focus:outline-none focus:border-primary/30 transition-all font-bold pr-12"
                                            disabled
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 font-black text-[10px] uppercase">CR</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Direct KRW</label>
                                    <div className="relative">
                                        <input
                                            name="priceKRW"
                                            type="number"
                                            defaultValue={item?.priceKRW || 0}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold pr-12"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-black text-[10px] uppercase">₩</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Direct USD</label>
                                    <div className="relative">
                                        <input
                                            name="priceUSD"
                                            type="number"
                                            step="0.01"
                                            defaultValue={item?.priceUSD || 0}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold pr-12"
                                        />
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-black text-[10px] uppercase">$</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[9px] text-white/20 italic uppercase tracking-tighter">* Direct prices are used when purchasing bypassing token refills.</p>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 flex flex-col gap-4">
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
                                        <span className="material-symbols-outlined font-bold">diamond</span>
                                        {isNew ? "CREATE STORE ITEM" : "UPDATE ITEM SETTINGS"}
                                    </>
                                )}
                            </button>
                        </div>
                    </Form>
                </div>
            </div>
        </AdminLayout>
    );
}
