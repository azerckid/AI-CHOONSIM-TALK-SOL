import { cn } from "~/lib/utils";
import { useLocalizedCharacterName } from "~/lib/useLocalizedCharacter";

interface OnlineIdol {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline: boolean;
}

interface OnlineIdolListProps {
  idols: OnlineIdol[];
  onIdolClick?: (id: string) => void;
  onAddClick?: () => void;
  className?: string;
}

function OnlineIdolItem({ idol, onIdolClick }: { idol: OnlineIdol; onIdolClick?: (id: string) => void }) {
  const name = useLocalizedCharacterName(idol.id, idol.name);

  return (
    <div
      onClick={() => onIdolClick?.(idol.id)}
      className="flex flex-col items-center gap-2 shrink-0 snap-start cursor-pointer group"
    >
      <div
        className={cn(
          "relative p-[3px] rounded-full transition-all duration-300",
          idol.isOnline
            ? "bg-linear-to-tr from-primary to-purple-400 group-hover:scale-105"
            : "border-2 border-gray-200 dark:border-white/10 group-hover:border-primary/50"
        )}
      >
        <div className="w-[66px] h-[66px] rounded-full bg-background-light dark:bg-background-dark p-[2px]">
          <div
            className={cn(
              "w-full h-full rounded-full bg-cover bg-center",
              !idol.isOnline && "grayscale opacity-70"
            )}
            style={{ backgroundImage: `url("${idol.avatarUrl}")` }}
          />
        </div>
        {idol.isOnline && (
          <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-background-dark rounded-full" />
        )}
      </div>
      <span
        className={cn(
          "text-xs font-medium text-center w-16 truncate",
          !idol.isOnline && "text-gray-500 dark:text-text-muted"
        )}
      >
        {name}
      </span>
    </div>
  );
}

export function OnlineIdolList({
  idols,
  onIdolClick,
  onAddClick,
  className,
}: OnlineIdolListProps) {
  return (
    <section className={cn("pt-6 pb-2", className)}>
      <div className="px-4 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-text-muted">
          Online Now
        </h2>
      </div>
      <div className="flex overflow-x-auto no-scrollbar px-4 gap-4 pb-4 snap-x">
        <div
          onClick={onAddClick}
          className="flex flex-col items-center gap-2 shrink-0 snap-start cursor-pointer"
        >
          <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-3xl text-primary">add</span>
          </div>
          <span className="text-xs font-medium text-center w-16 truncate opacity-60">
            Add
          </span>
        </div>
        {idols.map((idol) => (
          <OnlineIdolItem key={idol.id} idol={idol} onIdolClick={onIdolClick} />
        ))}
      </div>
    </section>
  );
}

