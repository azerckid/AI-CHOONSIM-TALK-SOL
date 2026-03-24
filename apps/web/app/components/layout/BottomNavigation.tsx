import { Link, useLocation } from "react-router";
import { cn } from "~/lib/utils";

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: "home", label: "Home" },
  { path: "/chats", icon: "chat_bubble", label: "Chat" },
  { path: "/fandom", icon: "favorite", label: "Fandom" },
  { path: "/profile", icon: "person", label: "Profile" },
];

import { usePushNotifications } from "~/hooks/usePushNotifications";

export function BottomNavigation() {
  usePushNotifications();
  const location = useLocation();
  const currentPath = location.pathname;

  // 활성화 상태 확인 함수 (라우트 매칭 개선)
  const isActiveRoute = (itemPath: string, currentPath: string): boolean => {
    if (itemPath === currentPath) return true;
    
    // Chat 메뉴: /chats 또는 /chat/:id로 시작하는 경우
    if (itemPath === "/chats" && (currentPath === "/chats" || currentPath.startsWith("/chat/"))) {
      return true;
    }
    
    // Profile 메뉴: /profile인 경우
    if (itemPath === "/profile" && currentPath === "/profile") {
      return true;
    }
    
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 w-full bg-white/90 dark:bg-background-dark/95 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 pt-3 px-6 z-40"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)",
      }}
    >
      <div className="flex justify-between items-center max-w-md mx-auto md:max-w-lg lg:max-w-xl">
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.path, currentPath);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 w-12 group"
            >
              <span
                className={cn(
                  "material-symbols-outlined text-[28px] transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-gray-400 dark:text-gray-500"
                )}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-gray-400 dark:text-gray-500"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

