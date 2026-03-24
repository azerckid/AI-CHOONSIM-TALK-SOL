import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { History } from "lucide-react";
import type { SExchangeLog } from "~/lib/types/routes";

interface WalletCardProps {
    chocoBalance: string | null;
    history: SExchangeLog[];
    historyDialogOpen: boolean;
    onHistoryDialogChange: (open: boolean) => void;
}

export function WalletCard({
    chocoBalance,
    history,
    historyDialogOpen,
    onHistoryDialogChange,
}: WalletCardProps) {

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="px-4 pb-4">
            <div className="p-5 rounded-3xl bg-linear-to-br from-violet-600 via-indigo-600 to-purple-700 text-white shadow-xl ring-1 ring-white/10 relative overflow-hidden">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-black/10 blur-xl"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-indigo-200 font-medium mb-1 tracking-wider uppercase">My Wallet</p>
                            <div className="flex items-baseline gap-1.5">
                                <h3 className="text-3xl font-bold tracking-tight">{parseInt(chocoBalance || "0").toLocaleString()}</h3>
                                <span className="text-sm font-semibold text-indigo-200">CHOCO</span>
                            </div>
                        </div>
                        <button
                            onClick={() => onHistoryDialogChange(true)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                        >
                            <History className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* History Dialog */}
            <Dialog open={historyDialogOpen} onOpenChange={onHistoryDialogChange}>
                <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>사용 내역 (History)</DialogTitle>
                        <DialogDescription>최근 환전 및 사용 기록입니다.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-2">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 opacity-60">
                                <History className="w-12 h-12" />
                                <p className="text-sm">아직 기록이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 pb-6">
                                {history.map((log) => (
                                    <div key={log.id} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 gap-3 border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                                        {log.fromChain}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {formatDate(log.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-primary">+{parseInt(log.toAmount).toLocaleString()}</p>
                                                <p className="text-xs text-slate-400">{log.toToken}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-xs bg-slate-100 dark:bg-black/20 p-2 rounded-lg gap-1.5 text-slate-500">
                                            <span>환율: 1:{log.rate}</span>
                                            <span className="w-px h-2.5 bg-slate-300 dark:bg-slate-700"></span>
                                            <span className="text-slate-400">{log.fromAmount} {log.fromChain}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="outline" onClick={() => onHistoryDialogChange(false)} className="w-full">
                            닫기
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
