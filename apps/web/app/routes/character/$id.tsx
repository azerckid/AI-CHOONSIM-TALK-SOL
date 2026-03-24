import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { useLocalizedCharacter } from "~/lib/useLocalizedCharacter";
import { cn } from "~/lib/utils";
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import { eq, and, sql, asc } from "drizzle-orm";
import * as schema from "~/db/schema";
import type { LoaderFunctionArgs } from "react-router";

type Tab = "about" | "voice" | "gallery";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id;
  const characterId = params.id || "chunsim";

  // 1. Character & Media & Stats
  const character = await db.query.character.findFirst({
    where: eq(schema.character.id, characterId),
    with: {
      media: {
        orderBy: [asc(schema.characterMedia.sortOrder)]
      },
      stats: true,
    }
  });

  if (!character) {
    throw new Response("Character not found", { status: 404 });
  }

  const stats = character.stats;

  // 2. My Contribution (Total Hearts Sent)
  let myContribution = 0;
  if (userId) {
    const result = await db
      .select({ totalAmount: sql<number>`sum(${schema.giftLog.amount})` })
      .from(schema.giftLog)
      .where(and(
        eq(schema.giftLog.fromUserId, userId),
        eq(schema.giftLog.toCharacterId, characterId),
        eq(schema.giftLog.itemId, "heart") // Assuming hearts are the main affinity metric
      ));

    myContribution = result[0]?.totalAmount || 0;
  }

  // 3. Affinity Calculation (Simple Logic for V1)
  // Max affinity 100% reached at 1000 hearts
  const affinityValue = Math.min(100, Math.floor(myContribution / 10));
  const fandomLevelValue = Math.floor(Math.sqrt(myContribution)) + 1; // Lv.1 start, Lv.10 at 81 hearts, Lv.30 at 900 hearts

  return {
    character,
    myContribution,
    affinityValue,
    fandomLevelValue,
  };
}

// Custom Voice Player Component
type CharacterMediaRow = typeof schema.characterMedia.$inferSelect;

function VoicePlayer({ item, isPlaying, onPlay, onPause, label }: { item: CharacterMediaRow; isPlaying: boolean; onPlay: () => void; onPause: () => void; label?: string; }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play().catch(console.error);
    } else {
      audioRef.current?.pause();
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setProgress(0);
    onPause();
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="p-4 rounded-xl bg-linear-to-r from-surface-dark to-background-dark border border-white/5 relative overflow-hidden group mb-4">
      <audio
        ref={audioRef}
        src={item.url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        className="hidden"
      />
      <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition">
        <span className={cn("material-symbols-outlined text-white text-6xl", isPlaying ? "animate-pulse text-primary" : "")}>graphic_eq</span>
      </div>
      <h4 className="text-sm font-semibold text-white mb-1">{label || "Voice Message"}</h4>
      <p className="text-xs text-gray-400 mb-3">{audioRef.current?.currentTime ? formatTime(audioRef.current.currentTime) : "0:00"} {duration ? `/ ${formatTime(duration)}` : ""}</p>
      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-10 h-10 shrink-0 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 hover:scale-105 transition active:scale-95"
        >
          <span className="material-symbols-outlined text-[24px]">
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>
        <div
          className="h-1.5 flex-1 bg-gray-700/50 rounded-full overflow-hidden cursor-pointer active:scale-y-150 transition-transform"
          onClick={(e) => {
            if (audioRef.current && audioRef.current.duration) {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = pos * audioRef.current.duration;
              setProgress(pos * 100);
            }
          }}
        >
          <div className="h-full bg-primary rounded-full transition-all duration-75 relative" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CharacterProfileScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { character, myContribution, affinityValue, fandomLevelValue } = useLoaderData<typeof loader>();
  const { name: displayName, role: displayRole } = useLocalizedCharacter(character.id, character.name, character.role);
  const [activeTab, setActiveTab] = useState<Tab>("about");
  const [isFavorite, setIsFavorite] = useState(true);

  // Phase 3 states
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const voiceMedia = character.media?.filter((m) => m.type === "VOICE") || [];
  const galleryMedia = character.media?.filter((m) => m.type === "NORMAL") || [];
  const firstVoice = voiceMedia.length > 0 ? voiceMedia[0] : null;

  // 프로필 화면에 필요한 추가 정보 가공
  const displayChar = {
    id: character.id,
    name: displayName,
    role: displayRole,
    relationship: fandomLevelValue > 10 ? "Close Friend" : "Fan",
    affinity: `${affinityValue}%`,
    fandomLevel: `Lv. ${fandomLevelValue}`,
    intro: character.bio,
    backstory: character.bio,
    personalityTraits: [
      { icon: "sentiment_satisfied", color: "text-yellow-500", label: "#Cheerful" },
      { icon: "volunteer_activism", color: "text-pink-500", label: "#Empathetic" },
      { icon: "music_note", color: "text-purple-500", label: "#Musical" },
      { icon: "nightlight", color: "text-blue-400", label: "#NightOwl" },
    ],
    interests: [
      { icon: "headphones", label: "Music", sublabel: "Favorite", color: "bg-blue-500/10 text-blue-500" },
      { icon: "favorite", label: "Fans", sublabel: "Loved", color: "bg-pink-500/10 text-pink-500" },
    ],
    // Priority: 1. COVER (Main), 2. AVATAR (Main), 3. First available image
    heroImage:
      character.media?.find((m) => m.type === "COVER")?.url ||
      character.media?.find((m) => m.type === "AVATAR")?.url ||
      character.media?.[0]?.url,
  };

  const handleMessage = async () => {
    try {
      const response = await fetch("/api/chat/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ characterId: displayChar.id }),
      });

      if (response.status === 401) {
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to create or get conversation");
      }

      const data = await response.json();
      if (data.conversationId) {
        navigate(`/chat/${data.conversationId}`);
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  // 탭 변경 시 오디오 정지
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPlayingAudioId(null);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 font-display selection:bg-primary selection:text-white antialiased overflow-x-hidden min-h-screen max-w-md mx-auto relative pb-24">
      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-100 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl transition-transform duration-300 scale-100"
            alt="Fullscreen preview"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors drop-shadow-md backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>
      )}

      {/* Top Navigation (Absolute Overlay) */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-linear-to-b from-black/60 to-transparent max-w-md mx-auto pointer-events-none">
        <button
          onClick={() => navigate(-1)}
          className="pointer-events-auto flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white transition hover:bg-black/40 active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="pointer-events-auto flex gap-3">
          <button className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-white transition hover:bg-black/40 active:scale-95">
            <span className="material-symbols-outlined">share</span>
          </button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 text-primary transition hover:bg-black/40 active:scale-95"
          >
            <span
              className="material-symbols-outlined drop-shadow-md"
              style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </span>
          </button>
        </div>
      </nav>

      {/* Hero Image Section */}
      <div className="relative w-full h-[55vh] min-h-[400px]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${displayChar.heroImage}')` }}
        >
          <div className="absolute inset-0 bg-linear-to-t from-background-dark via-transparent to-transparent" />
        </div>
      </div>

      {/* Main Content Sheet (Overlaps Hero) */}
      <div className="relative -mt-16 z-10 w-full bg-background-light dark:bg-background-dark rounded-t-2xl px-5 pt-8 pb-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {/* Drag Handle Indicator */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />

        {/* Global Stats Badge (New!) */}
        <div className="absolute top-0 right-5 -translate-y-1/2 bg-surface-dark border border-white/10 rounded-full px-3 py-1 flex items-center gap-2 shadow-lg">
          <span className="material-symbols-outlined text-pink-500 text-sm">favorite</span>
          <span className="text-white text-xs font-bold">{(character.stats?.totalHearts || 0).toLocaleString()} Hearts</span>
        </div>

        {/* Header Info */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{displayChar.name}</h1>
            <p className="text-primary font-medium text-sm tracking-wide uppercase">{displayChar.role}</p>
          </div>
          {/* Relationship Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <span className="text-xs font-bold text-primary">{displayChar.relationship}</span>
          </div>
        </div>

        {/* Intro Text */}
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 font-body">
          "{displayChar.intro}"
        </p>

        {/* Stats / Quick Info */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5">
            <span className="text-xl font-bold text-gray-900 dark:text-white">{displayChar.affinity}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Affinity</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5">
            <span className="text-xl font-bold text-gray-900 dark:text-white">{displayChar.fandomLevel}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">Fandom</span>
          </div>
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 cursor-pointer hover:border-primary/50 transition bg-linear-to-br from-primary/5 to-transparent">
            <span className="text-xl font-bold text-primary">{myContribution.toLocaleString()}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">My Hearts</span>
          </div>
        </div>

        {/* Personality Chips */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Personality Traits</h3>
          <div className="flex flex-wrap gap-2">
            {displayChar.personalityTraits.map((trait, index) => (
              <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/5 shadow-sm">
                <span className={cn("material-symbols-outlined text-[18px]", trait.color)}>{trait.icon}</span>
                <span className="text-xs font-medium dark:text-gray-200">{trait.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-white/10 mb-6">
          <div className="flex gap-6">
            <button
              onClick={() => handleTabChange("about")}
              className={cn("pb-3 text-sm transition", activeTab === "about" ? "font-bold text-primary border-b-2 border-primary" : "font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")}
            >About</button>
            <button
              onClick={() => handleTabChange("voice")}
              className={cn("pb-3 text-sm transition", activeTab === "voice" ? "font-bold text-primary border-b-2 border-primary" : "font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")}
            >Voice</button>
            <button
              onClick={() => handleTabChange("gallery")}
              className={cn("pb-3 text-sm transition", activeTab === "gallery" ? "font-bold text-primary border-b-2 border-primary" : "font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200")}
            >Gallery</button>
          </div>
        </div>

        {/* Tab Content: About */}
        {activeTab === "about" && (
          <div className="space-y-6">
            {/* Background Story */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Backstory</h3>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 font-body whitespace-pre-line">
                {displayChar.backstory}
              </p>
            </div>

            {/* Voice Sample Preview */}
            <div className="mb-6">
              {firstVoice ? (
                <VoicePlayer
                  item={firstVoice}
                  label={`${displayChar.name}'s Greeting`}
                  isPlaying={playingAudioId === firstVoice.id}
                  onPlay={() => setPlayingAudioId(firstVoice.id)}
                  onPause={() => setPlayingAudioId(null)}
                />
              ) : (
                <div className="p-4 rounded-xl bg-surface-dark border border-white/5 text-center py-6">
                  <span className="material-symbols-outlined text-gray-600 text-3xl mb-2">mic_off</span>
                  <p className="text-sm text-gray-500">{t("characterProfile.noVoiceSample")}</p>
                </div>
              )}
            </div>

            {/* Interests Grid */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Interests</h3>
              <div className="grid grid-cols-2 gap-3">
                {displayChar.interests.map((interest, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", interest.color.replace(' text-', ' '))}>
                      <span className="material-symbols-outlined">{interest.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold dark:text-white">{interest.label}</p>
                      <p className="text-[10px] text-gray-500">{interest.sublabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-12"></div>
          </div>
        )}

        {/* Tab Content: Voice */}
        {activeTab === "voice" && (
          <div className="space-y-4 pb-12 animate-in fade-in duration-300">
            {voiceMedia.length > 0 ? (
              voiceMedia.map((media, i) => (
                <VoicePlayer
                  key={media.id}
                  item={media}
                  label={`Voice Clip 0${i + 1}`}
                  isPlaying={playingAudioId === media.id}
                  onPlay={() => setPlayingAudioId(media.id)}
                  onPause={() => setPlayingAudioId(null)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-gray-600 text-5xl mb-3">mic_off</span>
                <h3 className="text-white font-semibold mb-1">{t("characterProfile.voicePreparing")}</h3>
                <p className="text-sm text-gray-500">{t("characterProfile.voicePreparingDesc")}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Gallery */}
        {activeTab === "gallery" && (
          <div className="animate-in fade-in duration-300 pb-12">
            {galleryMedia.length > 0 ? (
              <div className="columns-2 gap-3 space-y-3">
                {galleryMedia.map((m, i) => (
                  <div
                    key={m.id}
                    className="break-inside-avoid rounded-xl overflow-hidden cursor-pointer relative group border border-white/10 shadow-sm bg-surface-dark"
                    onClick={() => setSelectedImage(m.url)}
                  >
                    <img
                      src={m.url}
                      alt={`Gallery ${i}`}
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                      <div className="translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="material-symbols-outlined text-white drop-shadow-md text-3xl">zoom_in</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-gray-600 text-5xl mb-3">photo_library</span>
                <h3 className="text-white font-semibold mb-1">{t("characterProfile.galleryPreparing")}</h3>
                <p className="text-sm text-gray-500">{t("characterProfile.galleryPreparingDesc")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 z-40 max-w-md mx-auto">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            onClick={handleMessage}
            className="flex-1 flex items-center justify-center gap-2 h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/30 animate-glow transition transform active:scale-95"
          >
            <span className="material-symbols-outlined">chat_bubble</span>
            Message {displayChar.name}
          </button>
          <button className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 text-gray-400 hover:text-primary transition active:scale-95">
            <span className="material-symbols-outlined">videocam</span>
          </button>
        </div>
      </div>
    </div>
  );
}
