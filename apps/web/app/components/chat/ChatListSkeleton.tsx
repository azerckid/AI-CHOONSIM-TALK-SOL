import { Skeleton } from "~/components/ui/Skeleton";

export function ChatListSkeleton() {
  return (
    <div className="flex flex-col px-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 p-3 rounded-2xl mb-1"
        >
          <Skeleton variant="circular" className="w-14 h-14 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-2">
              <Skeleton className="w-20 h-4 rounded" />
              <Skeleton className="w-12 h-3 rounded" />
            </div>
            <Skeleton className="w-full h-4 rounded" />
          </div>
          <Skeleton variant="circular" className="w-5 h-5 shrink-0" />
        </div>
      ))}
    </div>
  );
}

