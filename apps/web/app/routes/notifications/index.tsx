import { useNavigate, useLoaderData, useFetcher, useRevalidator, redirect } from "react-router";
import { useEffect } from "react";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import * as schema from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { DateTime } from "luxon";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return redirect("/login");

  const notifications = await db.query.notification.findMany({
    where: eq(schema.notification.userId, session.user.id),
    orderBy: [desc(schema.notification.createdAt)],
    limit: 30,
  });

  return Response.json({ notifications });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const _action = formData.get("_action");

  if (_action === "read-all") {
    await db
      .update(schema.notification)
      .set({ isRead: true })
      .where(eq(schema.notification.userId, session.user.id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
};

const TYPE_CONFIG: Record<
  string,
  { icon: string; color: string; bg: string }
> = {
  PAYMENT: {
    icon: "credit_card",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  SYSTEM: {
    icon: "campaign",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  CHAT: {
    icon: "chat_bubble",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  PROMO: {
    icon: "local_offer",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
};

function formatTimeAgo(date: Date): string {
  const now = DateTime.now();
  const t = DateTime.fromJSDate(new Date(date));
  const diff = now.diff(t, ["minutes", "hours", "days"]);

  if (diff.minutes < 1) return "방금 전";
  if (diff.minutes < 60) return `${Math.floor(diff.minutes)}분 전`;
  if (diff.hours < 24) return `${Math.floor(diff.hours)}시간 전`;
  if (diff.days < 7) return `${Math.floor(diff.days)}일 전`;
  return t.toFormat("MM/dd");
}

export default function NotificationsPage() {
  const { notifications } = useLoaderData<typeof loader>() as {
    notifications: Notification[];
  };
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const result = fetcher.data as any;
      if (result.ok) {
        revalidator.revalidate();
      }
    }
  }, [fetcher.state, fetcher.data]);

  const handleReadAll = () => {
    if (unreadCount === 0) return;
    fetcher.submit({ _action: "read-all" }, { method: "POST" });
  };

  return (
    <div className="bg-background-dark text-white font-display antialiased min-h-screen max-w-md mx-auto shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md px-4 py-3 border-b border-white/5 gap-3">
        <button
          onClick={() => navigate("/home")}
          className="text-white hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="text-white text-lg font-bold flex-1">알림</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleReadAll}
            disabled={fetcher.state === "submitting"}
            className="text-primary text-sm font-semibold hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="divide-y divide-white/5">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-[56px] text-white/20">
              notifications_off
            </span>
            <p className="text-white/40 font-bold text-base">아직 알림이 없어요</p>
            <p className="text-white/20 text-sm text-center">
              새로운 소식이 오면 여기에 알려드릴게요!
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const config =
              TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.SYSTEM;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 px-4 py-4 transition-opacity ${
                  notif.isRead ? "opacity-50" : ""
                }`}
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg}`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${config.color}`}
                  >
                    {config.icon}
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white font-semibold text-sm leading-snug">
                      {notif.title}
                    </p>
                    {!notif.isRead && (
                      <span className="mt-1 shrink-0 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-white/50 text-xs mt-0.5 leading-relaxed">
                    {notif.body}
                  </p>
                  <p className="text-white/25 text-[11px] mt-1.5">
                    {formatTimeAgo(notif.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
