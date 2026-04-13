import { useState } from "react";
import { Link, useLoaderData } from "react-router";
import type { ChatListLoaderData, SCharacter, SMessage } from "~/lib/types/routes";
import { useTranslation } from "react-i18next";
import { useLocalizedCharacter } from "~/lib/useLocalizedCharacter";
import { ChatListItem } from "~/components/chat/ChatListItem";
import { OnlineIdolList } from "~/components/chat/OnlineIdolList";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import { ChatListSkeleton } from "~/components/chat/ChatListSkeleton";
import { NetworkError } from "~/components/ui/NetworkError";
import { ApiError } from "~/components/ui/ApiError";
import { cn, stripMessageMarkers } from "~/lib/utils";
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import type { LoaderFunctionArgs } from "react-router";
import * as schema from "~/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

type LoadingState = "idle" | "loading" | "error" | "network-error";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  }

  const [conversations, allCharacters] = await Promise.all([
    db.query.conversation.findMany({
      where: eq(schema.conversation.userId, session.user.id),
      with: {
        messages: {
          orderBy: [desc(schema.message.createdAt)],
          limit: 1,
        },
        character: {
          with: {
            media: {
              orderBy: [asc(schema.characterMedia.sortOrder)]
            }
          }
        }
      },
      orderBy: [desc(schema.conversation.updatedAt)],
    }),
    db.query.character.findMany({
      with: {
        media: {
          orderBy: [asc(schema.characterMedia.sortOrder)]
        }
      }
    })
  ]);

  return Response.json({ conversations, allCharacters });
}

function ChatListItemWithLocale({ chat, lastMsg, character, avatarUrl }: { chat: ChatListLoaderData['conversations'][number]; lastMsg: SMessage | undefined; character: SCharacter; avatarUrl: string }) {
  const { t } = useTranslation();
  const { name } = useLocalizedCharacter(character?.id ?? "", character?.name ?? "AI", character?.role ?? "");

  return (
    <ChatListItem
      id={chat.id}
      name={name}
      lastMessage={lastMsg?.content ? stripMessageMarkers(lastMsg.content) : t("chat.startConversationHint")}
      timestamp={lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
      avatarUrl={avatarUrl}
      isRead={lastMsg ? lastMsg.read : true}
      isOnline={character?.isOnline || false}
      characterId={character?.id}
    />
  );
}

function NewChatCharacterItem({ char, onStartChat, onPrepareError }: { char: SCharacter; onStartChat: (id: string) => void; onPrepareError: () => void }) {
  const { name, role } = useLocalizedCharacter(char.id, char.name, char.role);
  const { t } = useTranslation();

  return (
    <button
      onClick={() => {
        if (!char.isOnline) {
          onPrepareError();
          return;
        }
        onStartChat(char.id);
      }}
      className={cn(
        "flex items-center gap-4 p-2 rounded-xl transition-colors text-left",
        char.isOnline ? "hover:bg-slate-100 dark:hover:bg-white/5" : "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="relative flex-none">
        <img
          src={(char.media?.find((m) => m.type === "AVATAR")?.url) || char.media?.[0]?.url}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />
        {char.isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background-light dark:border-background-dark" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-900 dark:text-white truncate">{name}</h4>
        <p className="text-xs text-slate-500 line-clamp-1">
          {char.isOnline ? role : t("chat.prepareInProgress")}
        </p>
      </div>
    </button>
  );
}

export default function ChatListScreen() {
  const { conversations, allCharacters } = useLoaderData<typeof loader>() as ChatListLoaderData;
  const { t } = useTranslation();
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const navigate = useNavigate();

  const handleIdolClick = (characterId: string) => {
    // 아이돌 아바타 클릭 시 프로필 화면으로 이동
    navigate(`/character/${characterId}`);
  };

  const handleStartChat = async (characterId: string) => {
    try {
      setLoadingState("loading");
      const response = await fetch("/api/chat/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || t("chat.cannotStartChat"));
        setLoadingState("idle");
        return;
      }
      setIsNewChatOpen(false);
      navigate(`/chat/${data.conversationId}`);
    } catch (error) {
      console.error("Chat creation error:", error);
      toast.error(t("chat.chatStartError"));
      setLoadingState("idle");
    }
  };

  const orderedChars = allCharacters.filter((c): c is SCharacter => c != null);
  const onlineIdols = orderedChars.map((char) => ({
    id: char.id,
    name: char.name,
    avatarUrl: (char.media?.find((m) => m.type === "AVATAR")?.url) || char.media?.[0]?.url,
    isOnline: char.isOnline,
  }));

  const handleRetry = () => {
    setLoadingState("loading");
    setTimeout(() => {
      setLoadingState("idle");
    }, 1000);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen relative overflow-x-hidden selection:bg-primary selection:text-white pb-24 max-w-md mx-auto md:max-w-lg lg:max-w-xl">
      <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 px-4 pt-12 pb-3 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full bg-cover bg-center ring-2 ring-gray-200 dark:ring-white/10"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCVl0hrpoB1yOAKpQmi-_0n7ICqjGaew6qKzz_Gn8CbqiQL1TBgAMDihfIzH7NO8Kir1bL6J_gs-qj0PzAlVN-0TM1Py8H0_3TOtix5p0aql-mvaSLfSbA290FDgIwdBcPIYdPe53zzyV5MDn_BXBDETX3SZX_aoWMl3hh_NIS59fdAciuwSHR-AoKLwEeh2jIaNjLb0MTt70Uv5AzH3-4cfSZ7zkxkEY0Pj82wFASAxuhtYWy-IwB4kj9mN8N7xCmOj_sTq6L2f30")',
              }}
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background-light dark:border-background-dark" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to="/settings"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-2xl text-gray-600 dark:text-text-muted">
              settings
            </span>
          </Link>
        </div>
      </header>

      <OnlineIdolList
        idols={onlineIdols}
        onIdolClick={handleIdolClick}
        onAddClick={() => setIsNewChatOpen(true)}
      />

      <main className="mt-2 flex flex-col px-2">
        <div className="px-4 py-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-text-muted">
            Recent Chats
          </h2>
        </div>
        {loadingState === "loading" ? (
          <ChatListSkeleton />
        ) : loadingState === "network-error" ? (
          <NetworkError onRetry={handleRetry} />
        ) : loadingState === "error" ? (
          <ApiError onRetry={handleRetry} />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">chat_bubble</span>
            </div>
            <h3 className="text-lg font-bold mb-1">{t("chat.startNewConversation")}</h3>
            <p className="text-sm text-slate-500">{t("chat.waitingForYou")}</p>
          </div>
        ) : (
          conversations.map((chat) => {
            const lastMsg = chat.messages?.[0];
            const character = chat.character;
            const avatarUrl = (character?.media?.find((m) => m.type === "AVATAR")?.url) || character?.media?.[0]?.url;

            return (
              <ChatListItemWithLocale
                key={chat.id}
                chat={chat}
                lastMsg={lastMsg}
                character={character}
                avatarUrl={avatarUrl}
              />
            );
          })
        )}
      </main>

      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogTrigger
          render={
            <button className="fixed bottom-24 right-4 z-30 w-14 h-14 bg-slate-900 dark:bg-primary text-white rounded-full shadow-lg dark:shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-2xl">add_comment</span>
            </button>
          }
        />
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("chat.startChatTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {allCharacters.map((char) => (
              <NewChatCharacterItem
                key={char.id}
                char={char}
                onStartChat={handleStartChat}
                onPrepareError={() => toast.error(t("chat.prepareInProgressCharacter"))}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />

      <div className="pointer-events-none fixed bottom-0 left-0 w-full h-32 bg-linear-to-t from-background-light dark:from-background-dark to-transparent z-10" />
    </div>
  );
}

