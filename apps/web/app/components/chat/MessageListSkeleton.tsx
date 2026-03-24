import { Skeleton } from "~/components/ui/Skeleton";

export function MessageListSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Date Separator Skeleton */}
      <div className="flex justify-center">
        <Skeleton className="w-32 h-6 rounded-full" />
      </div>

      {/* AI Message Skeleton */}
      <div className="flex items-end gap-3">
        <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
        <div className="flex flex-col gap-1 items-start max-w-[75%]">
          <Skeleton className="w-12 h-3 rounded" />
          <Skeleton className="w-48 h-16 rounded-2xl rounded-tl-sm" />
        </div>
      </div>

      {/* User Message Skeleton */}
      <div className="flex items-end gap-3 justify-end">
        <div className="flex flex-col gap-1 items-end max-w-[75%]">
          <Skeleton className="w-40 h-14 rounded-2xl rounded-tr-sm" />
          <Skeleton className="w-16 h-3 rounded" />
        </div>
      </div>

      {/* AI Message Skeleton */}
      <div className="flex items-end gap-3">
        <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
        <div className="flex flex-col gap-1 items-start max-w-[75%]">
          <Skeleton className="w-12 h-3 rounded" />
          <Skeleton className="w-56 h-20 rounded-2xl rounded-tl-sm" />
        </div>
      </div>
    </div>
  );
}

