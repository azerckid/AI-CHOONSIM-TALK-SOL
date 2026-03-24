import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useNavigation, Form, useActionData, useRevalidator } from "react-router";
import { useState, useEffect } from "react";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { z } from "zod";
import { toast } from "sonner";

const characterSchema = z.object({
    id: z.string().min(2).max(20).regex(/^[a-z0-9_]+$/, "Only lowercase, numbers, and underscore allowed"),
    name: z.string().min(1),
    role: z.string().min(1),
    bio: z.string().min(1),
    greetingMessage: z.string().optional(),
    personaPrompt: z.string().min(10),
    isOnline: z.boolean().default(false),
});

import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, asc, count, and } from "drizzle-orm";

export async function loader({ params, request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    const { id } = params;
    if (!id || id === "new") {
        return { character: null };
    }

    const character = await db.query.character.findFirst({
        where: eq(schema.character.id, id),
        with: {
            media: {
                orderBy: [asc(schema.characterMedia.sortOrder)]
            },
        }
    });

    if (!character) {
        throw new Response("Character not found", { status: 404 });
    }

    return { character };
}

export async function action({ params, request }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const actionType = formData.get("_action");

    if (actionType === "delete") {
        const id = params.id;
        if (!id) return Response.json({ error: "ID missing" }, { status: 400 });
        await db.delete(schema.character).where(eq(schema.character.id, id));
        return { success: true, deleted: true, message: "Character deleted successfully" };
    }

    if (actionType === "add_media") {
        const characterId = params.id;
        const url = formData.get("url") as string;
        const type = formData.get("type") as any;

        if (!characterId || !url || !type) return Response.json({ error: "Missing data" }, { status: 400 });

        const countRes = await db.select({ value: count() })
            .from(schema.characterMedia)
            .where(eq(schema.characterMedia.characterId, characterId));
        const currentCount = countRes[0]?.value || 0;

        await db.insert(schema.characterMedia).values({
            id: crypto.randomUUID(),
            characterId,
            url,
            type,
            sortOrder: currentCount,
            createdAt: new Date(),
        });
        return { success: true, message: "Media added successfully" };
    }

    if (actionType === "delete_media") {
        const mediaId = formData.get("mediaId") as string;
        if (!mediaId) return Response.json({ error: "Media ID missing" }, { status: 400 });

        await db.delete(schema.characterMedia).where(eq(schema.characterMedia.id, mediaId));
        return { success: true, message: "Media deleted" };
    }

    if (actionType === "reorder_media") {
        const mediaId = formData.get("mediaId") as string;
        const direction = formData.get("direction") as "up" | "down";
        if (!mediaId || !direction) return Response.json({ error: "Missing data" }, { status: 400 });

        const currentMedia = await db.query.characterMedia.findFirst({
            where: eq(schema.characterMedia.id, mediaId)
        });
        if (!currentMedia) return Response.json({ error: "Media not found" }, { status: 404 });

        const allMedia = await db.query.characterMedia.findMany({
            where: eq(schema.characterMedia.characterId, currentMedia.characterId),
            orderBy: [asc(schema.characterMedia.sortOrder)]
        });

        const currentIndex = allMedia.findIndex(m => m.id === mediaId);
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex >= 0 && targetIndex < allMedia.length) {
            const targetMedia = allMedia[targetIndex];

            await db.transaction(async (tx) => {
                await tx.update(schema.characterMedia)
                    .set({ sortOrder: targetMedia.sortOrder })
                    .where(eq(schema.characterMedia.id, currentMedia.id));

                await tx.update(schema.characterMedia)
                    .set({ sortOrder: currentMedia.sortOrder })
                    .where(eq(schema.characterMedia.id, targetMedia.id));
            });
        }
        return { success: true };
    }

    const data = {
        id: formData.get("id") as string,
        name: formData.get("name") as string,
        role: formData.get("role") as string,
        bio: formData.get("bio") as string,
        greetingMessage: formData.get("greetingMessage") as string,
        personaPrompt: formData.get("personaPrompt") as string,
        isOnline: formData.get("isOnline") === "true",
    };

    try {
        const validated = characterSchema.parse(data);
        const isNew = !params.id || params.id === "new";

        if (isNew) {
            const existing = await db.query.character.findFirst({ where: eq(schema.character.id, validated.id) });
            if (existing) {
                return Response.json({ error: "Character ID already exists" }, { status: 400 });
            }

            await db.transaction(async (tx) => {
                await tx.insert(schema.character).values({
                    ...validated,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });

                // Create initial stats
                await tx.insert(schema.characterStat).values({
                    id: crypto.randomUUID(),
                    characterId: validated.id,
                    updatedAt: new Date(),
                });
            });

            return { success: true, message: "Character debuted successfully!" };
        } else {
            await db.update(schema.character).set({
                ...validated,
                updatedAt: new Date(),
            }).where(eq(schema.character.id, params.id as string));

            return { success: true, message: "Character profile updated!" };
        }
    } catch (e) {
        if (e instanceof z.ZodError) {
            return Response.json({ error: e.issues[0].message }, { status: 400 });
        }
        console.error(e);
        return Response.json({ error: "Failed to save character" }, { status: 500 });
    }
}

export default function EditCharacter() {
    const { character } = useLoaderData<typeof loader>();
    const actionData = useActionData() as { success?: boolean; error?: string; deleted?: boolean; message?: string };
    const navigate = useNavigate();
    const navigation = useNavigation();
    const revalidator = useRevalidator();
    const isSubmitting = navigation.state !== "idle";
    const isNew = !character;

    const [activeTab, setActiveTab] = useState<"identity" | "ai" | "media">("identity");

    useEffect(() => {
        if (actionData?.success) {
            if (actionData.deleted) {
                toast.success(actionData.message || "Deleted");
                navigate("/admin/characters");
            } else {
                toast.success(actionData.message || "Success");
                if (isNew) navigate("/admin/characters");
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
                            {isNew ? "Create Character" : `Edit: ${character.name}`}
                        </h1>
                        <p className="text-white/40 text-sm font-medium">Configure identity, persona, and media.</p>
                    </div>

                    <div className="flex gap-3">
                        {!isNew && (
                            <Form method="post" onSubmit={(e) => {
                                if (!confirm("Are you sure? This will delete all conversation history for this character.")) {
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
                            onClick={() => navigate("/admin/characters")}
                            className="px-6 py-3 bg-white/5 text-white/60 rounded-xl font-bold text-sm hover:text-white transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-[#1A1821] rounded-2xl w-fit border border-white/5">
                    {(["identity", "ai", "media"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                activeTab === tab
                                    ? "bg-primary text-black shadow-lg shadow-primary/20"
                                    : "text-white/40 hover:text-white"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <Form method="post" className="space-y-8">
                    {/* Identity Tab */}
                    <div className={cn(activeTab !== "identity" && "hidden")}>
                        <div className="bg-[#1A1821]/60 border border-white/5 rounded-[40px] p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Character ID (Handle)</label>
                                    <input
                                        name="id"
                                        defaultValue={character?.id}
                                        readOnly={!isNew}
                                        placeholder="e.g. chunsim"
                                        className={cn(
                                            "w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold",
                                            !isNew && "opacity-50 cursor-not-allowed"
                                        )}
                                    />
                                    {isNew && <p className="text-[10px] text-white/20 ml-2 italic">* Use only lowercase, numbers, and underscores.</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Display Name</label>
                                    <input
                                        name="name"
                                        defaultValue={character?.name}
                                        placeholder="e.g. 춘심"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Role/Tag</label>
                                    <input
                                        name="role"
                                        defaultValue={character?.role}
                                        placeholder="e.g. K-Pop Idol"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold"
                                    />
                                </div>
                                <div className="flex items-end pb-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                name="isOnline"
                                                value="true"
                                                defaultChecked={character?.isOnline}
                                                className="sr-only peer"
                                            />
                                            <div className="w-12 h-6 bg-white/10 rounded-full peer peer-checked:bg-primary transition-all duration-300" />
                                            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all duration-300" />
                                        </div>
                                        <span className="text-sm font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-widest">Online Status</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Short Bio</label>
                                <input
                                    name="bio"
                                    defaultValue={character?.bio}
                                    placeholder="Briefly describe the character"
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Greeting Message</label>
                                <textarea
                                    name="greetingMessage"
                                    defaultValue={character?.greetingMessage || ""}
                                    placeholder="The first message the AI sends"
                                    rows={2}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Persona Tab */}
                    <div className={cn(activeTab !== "ai" && "hidden")}>
                        <div className="bg-[#1A1821]/60 border border-white/5 rounded-[40px] p-8 space-y-6">
                            <div className="space-y-2 text-right">
                                <div className="flex justify-between items-center mb-2 px-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">System Persona Prompt</label>
                                    <span className="text-[10px] text-primary font-bold italic tracking-tighter px-2 py-1 bg-primary/10 rounded-lg">High Precision Emotion Engine</span>
                                </div>
                                <textarea
                                    name="personaPrompt"
                                    defaultValue={character?.personaPrompt}
                                    placeholder="Define the core personality, speech patterns, and secrets..."
                                    className="w-full h-[500px] bg-black/40 border border-white/10 rounded-[32px] p-8 text-white focus:outline-none focus:border-primary/50 transition-all font-mono text-sm leading-relaxed"
                                />
                                <p className="text-[10px] text-white/20 italic">* This prompt defines how the AI will behave. Be specific about tone and emojis.</p>
                            </div>
                        </div>
                    </div>

                    {/* Media Tab */}
                    <div className={cn(activeTab !== "media" && "hidden")}>
                        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
                            {isNew ? (
                                <div className="bg-[#1A1821]/60 border border-white/5 rounded-[40px] p-8 flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
                                    <span className="material-symbols-outlined text-white/10 text-[64px]">priority_high</span>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-black italic text-white/40 uppercase">Action Required</h3>
                                        <p className="text-sm text-white/20 font-medium">Please save the character identity first before uploading media.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {[
                                        { type: "AVATAR", label: "Profile Avatar", desc: "Small icon for chats and profile identification.", icon: "account_circle" },
                                        { type: "COVER", label: "Background Cover", desc: "Large background image for home screen and highlights.", icon: "wallpaper" },
                                        { type: "NORMAL", label: "Standard Gallery", desc: "Public photos available in the character's gallery.", icon: "photo_library" },
                                        { type: "SECRET", label: "Secret Reward", desc: "Hidden images unlocked through user interaction.", icon: "lock" },
                                    ].map((section) => {
                                        const items = character.media.filter(m => m.type === section.type);

                                        return (
                                            <div key={section.type} className="space-y-6">
                                                {/* Section Header */}
                                                <div className="flex justify-between items-end px-2">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-primary text-[20px]">{section.icon}</span>
                                                            <h3 className="text-xl font-black italic text-white uppercase tracking-tighter">{section.label}</h3>
                                                        </div>
                                                        <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">{section.desc}</p>
                                                    </div>

                                                    {/* Upload Button for this specific type */}
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            id={`upload-${section.type}`}
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;

                                                                const toastId = toast.loading(`Uploading ${section.label}...`);
                                                                try {
                                                                    const formData = new FormData();
                                                                    formData.append("file", file);

                                                                    const res = await fetch("/api/upload", {
                                                                        method: "POST",
                                                                        body: formData
                                                                    });

                                                                    const result = await res.json();
                                                                    if (result.url) {
                                                                        const submitData = new FormData();
                                                                        submitData.append("_action", "add_media");
                                                                        submitData.append("url", result.url);
                                                                        submitData.append("type", section.type);

                                                                        const response = await fetch(window.location.pathname, {
                                                                            method: "POST",
                                                                            body: submitData
                                                                        });

                                                                        if (response.ok) {
                                                                            toast.success(`${section.label} added!`, { id: toastId });
                                                                            revalidator.revalidate();
                                                                        } else {
                                                                            throw new Error("Failed to save media");
                                                                        }
                                                                    }
                                                                } catch (error) {
                                                                    toast.error("Upload failed", { id: toastId });
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() => document.getElementById(`upload-${section.type}`)?.click()}
                                                            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-primary/50 hover:text-primary transition-all flex items-center gap-2"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                                                            Upload New
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Media List for this type */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                    {items.length === 0 ? (
                                                        <div className="col-span-full py-12 bg-black/20 border border-dashed border-white/5 rounded-[32px] flex flex-col items-center justify-center text-center space-y-2 opacity-40">
                                                            <span className="material-symbols-outlined text-[32px]">no_photography</span>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest">No {section.label} uploaded</p>
                                                        </div>
                                                    ) : (
                                                        items.map((item, idx) => (
                                                            <div key={item.id} className="group relative bg-black/40 border border-white/5 rounded-3xl overflow-hidden aspect-square">
                                                                <img
                                                                    src={item.url}
                                                                    alt={section.label}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                />

                                                                {/* Overlay Controls */}
                                                                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-3 p-4">
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const fd = new FormData();
                                                                                fd.append("_action", "reorder_media");
                                                                                fd.append("mediaId", item.id);
                                                                                fd.append("direction", "up");
                                                                                await fetch(window.location.pathname, { method: "POST", body: fd });
                                                                                revalidator.revalidate();
                                                                            }}
                                                                            className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-primary hover:text-black transition-all"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={async () => {
                                                                                const fd = new FormData();
                                                                                fd.append("_action", "reorder_media");
                                                                                fd.append("mediaId", item.id);
                                                                                fd.append("direction", "down");
                                                                                await fetch(window.location.pathname, { method: "POST", body: fd });
                                                                                revalidator.revalidate();
                                                                            }}
                                                                            className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-primary hover:text-black transition-all"
                                                                        >
                                                                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                                                        </button>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            if (!confirm("Are you sure?")) return;
                                                                            const formData = new FormData();
                                                                            formData.append("_action", "delete_media");
                                                                            formData.append("mediaId", item.id);

                                                                            const response = await fetch(window.location.pathname, {
                                                                                method: "POST",
                                                                                body: formData
                                                                            });
                                                                            if (response.ok) {
                                                                                toast.success("Media deleted");
                                                                                revalidator.revalidate();
                                                                            }
                                                                        }}
                                                                        className="w-8 h-8 rounded-lg bg-red-500/20 text-red-500 border border-red-500/40 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                                    </button>
                                                                </div>

                                                                {/* Indicator */}
                                                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-[8px] font-black text-white/60 uppercase tracking-tighter">
                                                                    {idx === 0 ? "★ Main" : `#${idx + 1}`}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={cn(
                                "w-full py-6 bg-primary text-[#0B0A10] rounded-[32px] font-black italic text-xl tracking-tighter transition-all hover:scale-[1.02] active:scale-95 shadow-[0_10px_40px_rgba(255,0,255,0.4)] flex items-center justify-center gap-3",
                                isSubmitting && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isSubmitting ? (
                                <span className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="material-symbols-outlined font-bold">bolt</span>
                                    {isNew ? "DEBUT CHARACTER" : "SAVE CORE SETTINGS"}
                                </>
                            )}
                        </button>
                    </div>
                </Form>
            </div>
        </AdminLayout>
    );
}
