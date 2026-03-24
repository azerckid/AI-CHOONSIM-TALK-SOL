import { Link } from "react-router";
import { RollingCounter } from "~/components/ui/RollingCounter";
import { BalanceChangeIndicator } from "~/components/ui/BalanceChangeIndicator";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

interface ChatHeaderProps {
  characterName: string;
  characterId?: string;
  isOnline?: boolean;
  statusText?: string;
  onBack?: () => void;
  onDeleteChat?: () => void;
  onResetChat?: () => void;
  statusClassName?: string;
  statusOpacity?: number;
  chocoBalance?: string; // 추가: CHOCO 토큰 잔액
  chocoChange?: number;  // 추가: CHOCO 변동량
  isOptimisticDeducting?: boolean; // 추가: 낙관적 차감 중 여부
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import { cn } from "~/lib/utils";

export function ChatHeader({
  characterName,
  characterId,
  isOnline = true,
  statusText = "Online now",
  onBack,
  onDeleteChat,
  onResetChat,
  statusClassName,
  statusOpacity = 1,
  chocoBalance,
  chocoChange,
  isOptimisticDeducting,
}: ChatHeaderProps) {
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);

  return (
    <header className="flex-none z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-200 dark:border-white/5 sticky top-0">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center text-slate-600 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full w-10 h-10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex flex-col items-center flex-1 mx-2">
          <div className="flex items-center gap-2">
            {characterId ? (
              <Link
                to={`/character/${characterId}`}
                className="text-lg font-bold leading-tight hover:underline"
              >
                {characterName}
              </Link>
            ) : (
              <h1 className="text-lg font-bold leading-tight">{characterName}</h1>
            )}
            {isOnline && (
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            )}
          </div>
          <span
            className={cn("text-[11px] text-primary font-bold uppercase tracking-widest mt-0.5 transition-colors duration-500", statusClassName)}
            style={{ opacity: statusOpacity }}
          >
            {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 잔액 표시 배지 (CHOCO) */}
          {chocoBalance !== undefined && (
            <>
              {/* 데스크톱: 인라인 표시 */}
              <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 mr-1">
                {/* CHOCO 잔액 표시 */}
                <div className="flex items-center relative">
                  <RollingCounter
                    value={Number(chocoBalance)}
                    className="text-xs font-bold text-slate-700 dark:text-slate-200 mr-1"
                    duration={isOptimisticDeducting ? 0 : 500}
                  />
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">CHOCO</span>
                  {chocoChange !== undefined && chocoChange !== 0 && (
                    <BalanceChangeIndicator
                      amount={chocoChange}
                      className="absolute -right-6 top-0 whitespace-nowrap"
                    />
                  )}
                </div>
              </div>

              {/* 모바일: Dialog로 표시 */}
              <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
                <DialogTrigger
                  render={
                    <button className="sm:hidden flex items-center px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 mr-1">
                      <span className="material-symbols-outlined text-[18px] text-slate-600 dark:text-slate-300">account_balance_wallet</span>
                    </button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>내 잔액</DialogTitle>
                    <DialogDescription>현재 보유 중인 자산입니다.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">CHOCO</span>
                        <div className="flex items-center gap-2 mt-1">
                          <RollingCounter
                            value={Number(chocoBalance)}
                            className="text-2xl font-bold text-slate-900 dark:text-white"
                            duration={isOptimisticDeducting ? 0 : 500}
                          />
                          {chocoChange !== undefined && chocoChange !== 0 && (
                            <BalanceChangeIndicator amount={chocoChange} />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="flex items-center justify-center text-slate-600 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-full w-10 h-10 transition-colors"
                >
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDeleteChat} variant="destructive">
                <span className="material-symbols-outlined mr-2 text-[18px]">delete</span>
                대화방 삭제
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetChat}>
                <span className="material-symbols-outlined mr-2 text-[18px]">restart_alt</span>
                대화 초기화 (기억 포함)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

