import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { requireAdmin } from "~/lib/auth.server";
import { cn } from "~/lib/utils";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { desc, eq, asc } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    await requireAdmin(request);

    const characters = await db.query.character.findMany({
        with: {
            media: {
                orderBy: [asc(schema.characterMedia.sortOrder)]
            },
            stats: true
        },
        orderBy: [desc(schema.character.createdAt)]
    });

    const charactersWithSortedMedia = characters.map(char => {
        const coverImage = char.media.find(m => m.type === "AVATAR")?.url ||
            char.media.find(m => m.type === "COVER")?.url ||
            char.media[0]?.url;
        return {
            ...char,
            representativeImage: coverImage
        };
    });

    return { characters: charactersWithSortedMedia };
}

export default function AdminCharacters() {
    const { characters } = useLoaderData<typeof loader>();

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Characters</h1>
                        <p className="text-white/40 text-sm font-medium">Manage your AI personas and their media.</p>
                    </div>
                    <Link
                        to="/admin/characters/new"
                        className="px-6 py-3 bg-primary text-[#0B0A10] rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(255,0,255,0.3)] hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        NEW CHARACTER
                    </Link>
                </div>

                {/* Character List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {characters.length === 0 ? (
                        <div className="col-span-full py-20 bg-[#1A1821]/40 border border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4">
                            <span className="material-symbols-outlined text-white/10 text-[64px]">person_off</span>
                            <div className="space-y-1">
                                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No Characters Found</p>
                                <p className="text-white/20 text-sm">Start by creating your first AI character.</p>
                            </div>
                        </div>
                    ) : (
                        characters.map((char) => (
                            <div key={char.id} className="bg-[#1A1821]/60 border border-white/5 rounded-[32px] overflow-hidden group hover:border-primary/20 transition-all duration-300">
                                <div className="h-48 bg-gradient-to-br from-[#2A2635] to-[#1A1821] relative overflow-hidden">
                                    {char.representativeImage ? (
                                        <img
                                            src={char.representativeImage}
                                            alt={char.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white/5 text-[64px]">image</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <div className={cn(
                                            "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
                                            char.isOnline ? "bg-green-500 text-black" : "bg-white/10 text-white/40"
                                        )}>
                                            {char.isOnline ? "Online" : "Offline"}
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1821] to-transparent opacity-60" />
                                </div>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-xl font-black italic tracking-tighter text-white">{char.name}</h3>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{char.role}</span>
                                        </div>
                                        <p className="text-white/40 text-xs mt-1 line-clamp-1">{char.bio}</p>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Hearts</p>
                                                <p className="text-sm font-black text-primary italic">{(char.stats?.totalHearts || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="w-px h-6 bg-white/5" />
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">ID</p>
                                                <p className="text-[10px] font-bold text-white/60">{char.id}</p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/admin/characters/${char.id}`}
                                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-primary hover:text-black transition-all duration-300"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
