import { useNavigate, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import { DateTime } from "luxon";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return redirect("/login");

  // Get messageLikes with joins to message, conversation, and character
  const rawLikes = await db
    .select({
      likeId: schema.messageLike.id,
      likedAt: schema.messageLike.createdAt,
      messageId: schema.message.id,
      content: schema.message.content,
      mediaUrl: schema.message.mediaUrl,
      mediaType: schema.message.mediaType,
      messageCreatedAt: schema.message.createdAt,
      role: schema.message.role,
      characterId: schema.conversation.characterId,
      characterName: schema.character.name,
    })
    .from(schema.messageLike)
    .innerJoin(schema.message, eq(schema.messageLike.messageId, schema.message.id))
    .innerJoin(schema.conversation, eq(schema.message.conversationId, schema.conversation.id))
    .leftJoin(schema.character, eq(schema.conversation.characterId, schema.character.id))
    .where(eq(schema.messageLike.userId, session.user.id))
    .orderBy(desc(schema.messageLike.createdAt))
    .limit(50);

  const characterIds = [...new Set(rawLikes.map((r) => r.characterId))];
  const avatarMap: Record<string, string> = {};

  if (characterIds.length > 0) {
    const media = await db.query.characterMedia.findMany({
      where: and(
        inArray(schema.characterMedia.characterId, characterIds),
        eq(schema.characterMedia.type, "COVER")
      ),
    });

    media.forEach((m) => {
      if (!avatarMap[m.characterId]) {
        avatarMap[m.characterId] = m.url;
      }
    });
  }

  const savedMoments = rawLikes.map((row) => ({
    likeId: row.likeId,
    likedAt: row.likedAt.toISOString(),
    messageId: row.messageId,
    content: row.content,
    mediaUrl: row.mediaUrl,
    mediaType: row.mediaType,
    messageCreatedAt: row.messageCreatedAt.toISOString(),
    role: row.role,
    characterId: row.characterId,
    characterName: row.characterName || "춘심",
    characterAvatarUrl:
      avatarMap[row.characterId] ||
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCutVt4neD3mw-fGim_WdODfouQz3b0aaqpPfx1sNTt8N75jfKec3kNioEoZugl2D0eqVP5833PF21_hTqlDz38aVNUICprwHAM45vTdJeUPcA0mj_wzSgkMVSzYiv-RCJhNyAAZ0RlWSJQxzSa8Mi-yYPu-czB9WEbQsDFEjcAQwezmcZqtAbSB5bwyRhTTfr1y2rrxDHIFNN2G2fVmkHcCWo7uvVNjtAehxS8fgGKMbJgQ59q1ClGgD--3EuZR6f_esg0NbdGCao",
  }));

  return Response.json({ savedMoments });
}

type SavedMoment = {
  likeId: string;
  likedAt: string;
  messageId: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  messageCreatedAt: string;
  role: string;
  characterId: string;
  characterName: string;
  characterAvatarUrl: string;
};

function formatTimeAgo(dateString: string): string {
  const now = DateTime.now();
  const t = DateTime.fromISO(dateString);
  const diff = now.diff(t, ["minutes", "hours", "days"]);

  if (diff.minutes < 1) return "방금 전";
  if (diff.minutes < 60) return `${Math.floor(diff.minutes)}분 전`;
  if (diff.hours < 24) return `${Math.floor(diff.hours)}시간 전`;
  if (diff.days < 7) return `${Math.floor(diff.days)}일 전`;
  return t.toFormat("MM/dd");
}

export default function ProfileSavedScreen() {
  const { savedMoments } = useLoaderData<typeof loader>() as { savedMoments: SavedMoment[] };
  const navigate = useNavigate();

  return (
    <div className="bg-background-dark text-white font-display antialiased min-h-screen max-w-md mx-auto shadow-2xl pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-background-dark/80 backdrop-blur-md px-4 py-3 border-b border-white/5 gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="text-white hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <h1 className="text-white text-lg font-bold flex-1">저장된 순간들</h1>
        <div className="w-6" /> {/* Spacer */}
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {savedMoments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="material-symbols-outlined text-[64px] text-pink-500/20">
              favorite
            </span>
            <p className="text-white/40 font-bold text-base">저장된 순간이 없어요</p>
            <p className="text-white/20 text-sm text-center">
              대화 중 마음에 드는 메시지에 하트를 눌러보세요!
            </p>
          </div>
        ) : (
          savedMoments.map((moment) => (
            <div
              key={moment.likeId}
              className="bg-surface-dark border border-white/10 rounded-2xl p-4 flex gap-4 transition-all hover:bg-white/5"
            >
              <div
                className="w-10 h-10 rounded-full bg-cover bg-center shrink-0 border border-white/10"
                style={{ backgroundImage: `url(${moment.characterAvatarUrl})` }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-white">{moment.characterName}</h3>
                  <span className="text-xs text-white/40">{formatTimeAgo(moment.likedAt)}</span>
                </div>

                {moment.mediaUrl && moment.mediaType?.includes("image") ? (
                  <div className="mt-2 mb-2 rounded-xl overflow-hidden border border-white/10 relative">
                    <img src={moment.mediaUrl} alt="저장된 사진" className="w-full h-auto object-cover max-h-48" />
                  </div>
                ) : null}

                {moment.content && (
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {moment.content}
                  </p>
                )}
              </div>

              <div className="shrink-0 flex flex-col items-center pt-1">
                <span className="material-symbols-outlined text-[20px] text-pink-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
