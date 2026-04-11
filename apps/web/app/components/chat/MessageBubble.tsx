import { cn } from "~/lib/utils";
import { ChocoPayCard } from "~/components/payment/ChocoPayCard";
import { SwapTxCard } from "~/components/payment/SwapTxCard";

// [PHANTOM:100] 마커 파싱
const PHANTOM_MARKER = /\[PHANTOM:(\d+)\]/;

// [SWAP_TX:paymentId:base64tx] 마커 파싱
// paymentId = UUID (하이픈 포함, 콜론 없음), txBase64 = base64 (]를 포함하지 않음)
const SWAP_TX_MARKER = /\[SWAP_TX:([^:[\]]+):([^\]]+)\]/;

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function isUrl(s: string) {
  return /^https?:\/\/[^\s]+$/.test(s);
}

function RichContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const parts = line.split(URL_PATTERN);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              isUrl(part) ? (
                <a
                  key={j}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline break-all hover:opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {part}
                </a>
              ) : (
                part
              )
            )}
            {i < lines.length - 1 && "\n"}
          </span>
        );
      })}
    </>
  );
}

interface MessageBubbleProps {
  sender: "user" | "ai";
  senderName: string;
  content: string;
  avatarUrl?: string;
  timestamp: string;
  isStreaming?: boolean;
  mediaUrl?: string;
  showAvatar?: boolean;
  className?: string;
  messageId?: string;
  isLiked?: boolean;
  onLike?: (messageId: string, currentLiked: boolean) => void;
  /** Phase 3-2: AI 메시지에 보이스 재생 버튼 표시 여부 */
  showVoiceButton?: boolean;
  /** Phase 3-2: 보이스 재생 요청 (messageId로 API 호출 후 재생) */
  onPlayVoice?: (messageId: string) => void;
  auraClass?: string;
  auraOpacity?: number;
  auraStyle?: React.CSSProperties;
}

export function MessageBubble({
  content,
  sender,
  senderName,
  timestamp,
  avatarUrl,
  showAvatar = true,
  className,
  isStreaming = false,
  mediaUrl,
  messageId,
  isLiked = false,
  onLike,
  showVoiceButton = false,
  onPlayVoice,
  auraClass,
  auraOpacity = 1,
  auraStyle,
}: MessageBubbleProps) {
  const isUser = sender === "user";

  const handleLike = () => {
    if (messageId && onLike) {
      onLike(messageId, isLiked);
    }
  };

  if (isUser) {
    return (
      <div className={cn("flex items-end gap-3 justify-end group", className)}>
        {messageId && onLike && (
          <button
            onClick={handleLike}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity p-1 order-1",
              isLiked
                ? "opacity-100 text-primary"
                : "text-gray-400 dark:text-gray-600 hover:text-primary dark:hover:text-primary"
            )}
          >
            <span className={cn(
              "material-symbols-outlined text-[18px]",
              isLiked && "fill"
            )}>favorite</span>
          </button>
        )}
        <div className="flex flex-col gap-1 items-end max-w-[75%] order-2">
          {mediaUrl && (
            <div className="mb-2 rounded-xl overflow-hidden shadow-lg border-2 border-primary/20 max-w-sm">
              <img src={mediaUrl} alt="User shared" className="w-full h-auto max-h-60 object-cover" />
            </div>
          )}
          <div className="px-5 py-1 bg-primary text-white rounded-2xl rounded-tr-sm shadow-md shadow-primary/20 text-[15px] leading-relaxed">
            {content}
          </div>
          {timestamp && (
            <span className="text-[11px] text-gray-400 dark:text-white/30 mr-1">
              {timestamp}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-3 group", className)}>
      {showAvatar && (
        <div
          className={cn(
            "w-10 h-10 shrink-0 rounded-full bg-gray-300 dark:bg-surface-dark overflow-hidden border border-white/10 relative transition-all duration-500",
            auraClass
          )}
          style={{ opacity: auraOpacity, ...auraStyle }}
        >
          {avatarUrl ? (
            <img
              alt={senderName || "AI profile"}
              className="w-full h-full object-cover"
              src={avatarUrl}
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-primary/20 to-primary/40" />
          )}
        </div>
      )}
      <div className="flex flex-col gap-1 items-start max-w-[75%]">
        {senderName && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            {senderName}
          </span>
        )}
        {mediaUrl && (
          <div className="mb-2 rounded-xl overflow-hidden shadow-lg border border-white/10 max-w-sm">
            <img src={mediaUrl} alt="AI shared" className="w-full h-auto max-h-60 object-cover" />
          </div>
        )}
        <div className="px-5 py-3 bg-white dark:bg-surface-dark rounded-2xl rounded-tl-sm text-slate-800 dark:text-gray-100 shadow-sm text-[15px] leading-relaxed relative whitespace-pre-wrap break-words">
          <RichContent
            text={content
              .replace(PHANTOM_MARKER, "")
              .replace(SWAP_TX_MARKER, "")
              .trimEnd()}
          />
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-1 bg-primary animate-pulse align-middle" />
          )}
          {(() => {
            const swapMatch = SWAP_TX_MARKER.exec(content);
            if (swapMatch) {
              // CHOCO 금액을 메시지 텍스트에서 파싱 (예: "100 CHOCO")
              const chocoMatch = content.match(/(\d[\d,]*)\s+CHOCO/);
              const choco = chocoMatch
                ? parseInt(chocoMatch[1].replace(/,/g, ""), 10)
                : 100;
              return (
                <SwapTxCard
                  paymentId={swapMatch[1]}
                  txBase64={swapMatch[2]}
                  choco={choco}
                />
              );
            }
            const phantomMatch = PHANTOM_MARKER.exec(content);
            return phantomMatch ? (
              <ChocoPayCard choco={parseInt(phantomMatch[1], 10)} />
            ) : null;
          })()}
        </div>
        {timestamp && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-[11px] text-gray-400 dark:text-white/30">
              {timestamp}
            </span>
            {showVoiceButton && messageId && onPlayVoice && (
              <button
                type="button"
                onClick={() => onPlayVoice(messageId)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 dark:text-gray-600 hover:text-primary dark:hover:text-primary"
                title="목소리로 들기"
              >
                <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
              </button>
            )}
            {messageId && onLike && (
              <button
                onClick={handleLike}
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity p-1",
                  isLiked
                    ? "opacity-100 text-primary"
                    : "text-gray-400 dark:text-gray-600 hover:text-primary dark:hover:text-primary"
                )}
              >
                <span className={cn(
                  "material-symbols-outlined text-[18px]",
                  isLiked && "fill"
                )}>favorite</span>
              </button>
            )}
          </div>
        )}
        {!timestamp && (showVoiceButton && messageId && onPlayVoice || messageId && onLike) && (
          <div className="flex items-center gap-0 ml-1">
            {showVoiceButton && messageId && onPlayVoice && (
              <button
                type="button"
                onClick={() => onPlayVoice(messageId)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 dark:text-gray-600 hover:text-primary dark:hover:text-primary"
                title="목소리로 들기"
              >
                <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
              </button>
            )}
            {messageId && onLike && (
              <button
                onClick={handleLike}
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity p-1",
                  isLiked
                    ? "opacity-100 text-primary"
                    : "text-gray-400 dark:text-gray-600 hover:text-primary dark:hover:text-primary"
                )}
              >
                <span className={cn(
                  "material-symbols-outlined text-[18px]",
                  isLiked && "fill"
                )}>favorite</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
