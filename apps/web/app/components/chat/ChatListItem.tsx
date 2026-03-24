import { Link, useNavigate } from "react-router";
import { cn } from "~/lib/utils";

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  avatarUrl: string;
  unreadCount?: number;
  isRead?: boolean;
  isOnline?: boolean;
  messageType?: "text" | "voice" | "music" | "photo";
  characterId?: string;
  className?: string;
}

export function ChatListItem({
  id,
  name,
  lastMessage,
  timestamp,
  avatarUrl,
  unreadCount,
  isRead = false,
  isOnline = false,
  messageType = "text",
  characterId,
  className,
}: ChatListItemProps) {
  const navigate = useNavigate();
  
  const getMessageTypeIcon = () => {
    switch (messageType) {
      case "voice":
        return "mic";
      case "music":
        return "music_note";
      case "photo":
        return "image";
      default:
        return null;
    }
  };

  const icon = getMessageTypeIcon();

  const iconSettings = messageType === "voice"
    ? { icon: "mic", colors: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300" }
    : messageType === "music"
      ? { icon: "music_note", colors: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300" }
      : null;

  const profileLink = characterId ? `/character/${characterId}` : null;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-sm dark:hover:bg-surface-dark dark:hover:shadow-none transition-all mb-1",
        className
      )}
    >
      {/* 아바타 클릭 시 프로필로 이동 */}
      {profileLink ? (
        <Link
          to={profileLink}
          className="relative shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              "w-14 h-14 rounded-xl bg-cover bg-center",
              isRead && "grayscale-[20%]"
            )}
            style={{ backgroundImage: `url("${avatarUrl}")` }}
          />
          {iconSettings && (
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-surface-dark p-[2px] rounded-full">
              <span
                className={cn(
                  "material-symbols-outlined text-sm rounded-full p-0.5",
                  iconSettings.colors
                )}
                style={{ fontSize: "14px" }}
              >
                {iconSettings.icon}
              </span>
            </div>
          )}
        </Link>
      ) : (
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-14 h-14 rounded-xl bg-cover bg-center",
              isRead && "grayscale-[20%]"
            )}
            style={{ backgroundImage: `url("${avatarUrl}")` }}
          />
          {iconSettings && (
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-surface-dark p-[2px] rounded-full">
              <span
                className={cn(
                  "material-symbols-outlined text-sm rounded-full p-0.5",
                  iconSettings.colors
                )}
                style={{ fontSize: "14px" }}
              >
                {iconSettings.icon}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 메시지 영역 클릭 시 채팅으로 이동 */}
      <Link
        to={`/chat/${id}`}
        className="flex-1 min-w-0 cursor-pointer"
      >
        <div className="flex justify-between items-baseline mb-0.5">
          {/* 이름 클릭 시 프로필로 이동 - button으로 변경하여 중첩 링크 문제 해결 */}
          {profileLink ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(profileLink);
              }}
              className={cn(
                "text-base font-bold truncate block hover:underline text-left bg-transparent border-none p-0 cursor-pointer",
                isRead
                  ? "text-slate-700 dark:text-gray-200"
                  : "text-slate-900 dark:text-white"
              )}
            >
              {name}
            </button>
          ) : (
            <h3
              className={cn(
                "text-base font-bold truncate",
                isRead
                  ? "text-slate-700 dark:text-gray-200"
                  : "text-slate-900 dark:text-white"
              )}
            >
              {name}
            </h3>
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isRead
                ? "text-gray-400 dark:text-gray-500"
                : (unreadCount ? "text-primary" : "text-gray-500 dark:text-text-muted")
            )}
          >
            {timestamp}
          </span>
        </div>
        <p
          className={cn(
            "text-sm truncate",
            isRead
              ? "text-slate-400 dark:text-gray-500"
              : "text-slate-600 dark:text-gray-300 font-medium"
          )}
        >
          {lastMessage}
        </p>
      </Link>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {unreadCount && unreadCount > 0 ? (
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{unreadCount}</span>
          </div>
        ) : isRead ? (
          <span className="material-symbols-outlined text-base text-gray-400 dark:text-gray-600">
            done_all
          </span>
        ) : null}
      </div>
    </div>
  );
}
