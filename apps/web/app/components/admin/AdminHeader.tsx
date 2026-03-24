import { useNavigate } from "react-router";

export function AdminHeader() {
    return (
        <header className="h-16 border-b border-white/5 bg-[#151419]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
            <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase">
                System Overview
            </h2>

            <div className="flex items-center gap-6">
                <button className="relative text-white/60 hover:text-white transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full border border-[#151419]" />
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-white/5">
                    <div className="text-right">
                        <p className="text-xs font-black text-white">ADMIN USER</p>
                        <p className="text-[10px] text-primary uppercase font-bold tracking-tighter">Super Admin</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/20" />
                </div>
            </div>
        </header>
    );
}
