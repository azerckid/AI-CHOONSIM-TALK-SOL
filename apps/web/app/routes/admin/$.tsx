import { Link } from "react-router";
import { AdminLayout } from "~/components/admin/AdminLayout";

export default function AdminNotFound() {
    return (
        <AdminLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-primary text-[48px]">search_off</span>
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">404 - Not Found</h1>
                    <p className="text-white/40 font-medium">The page you are looking for in the administration area does not exist.</p>
                </div>

                <Link
                    to="/admin/dashboard"
                    className="px-6 py-3 bg-primary text-[#0B0A10] rounded-xl font-bold text-sm shadow-[0_4px_20px_rgba(255,0,255,0.3)] hover:scale-105 transition-transform"
                >
                    Return to Dashboard
                </Link>
            </div>
        </AdminLayout>
    );
}
