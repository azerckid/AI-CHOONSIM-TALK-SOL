import { useState, useRef } from "react";
import { cn } from "~/lib/utils";
import { GiftSelector } from "./GiftSelector";
import type { SItem, SUserInventory } from "~/lib/types/routes";

interface MessageInputProps {
  onSend?: (message: string, mediaUrl?: string) => void;
  onGift?: (itemId: string, amount: number) => Promise<void>;
  onOpenStore?: () => void;
  userChocoBalance?: number;
  ownedHearts?: number;
  userInventory?: (SUserInventory & { item: SItem })[];
  heartItem?: SItem;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MessageInput({
  onSend,
  onGift,
  onOpenStore,
  userChocoBalance = 0,
  ownedHearts = 0,
  userInventory = [],
  heartItem,
  placeholder = "Type a message...",
  disabled = false,
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((message.trim() || uploadedUrl) && !disabled && !isUploading && onSend) {
      onSend(message.trim(), uploadedUrl || undefined);
      setMessage("");
      setPreviewUrl(null);
      setUploadedUrl(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 2. Upload to server
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setUploadedUrl(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Image upload failed.");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removePreview = () => {
    setPreviewUrl(null);
    setUploadedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <footer
      className={cn(
        "flex-none bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-white/5 pb-8 pt-2 px-3 relative",
        className
      )}
    >
      {onGift && (
        <GiftSelector
          isOpen={isGiftOpen}
          onClose={() => setIsGiftOpen(false)}
          onGift={onGift}
          onOpenStore={onOpenStore || (() => { })}
          ownedHearts={ownedHearts}
          userInventory={userInventory}
          heartItem={heartItem}
        />
      )}

      {previewUrl && (
        <div className="px-4 py-2 flex items-center gap-3">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-primary shadow-lg group">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <button
              onClick={removePreview}
              className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
          <span className="text-xs text-gray-400">Image uploaded</span>
        </div>
      )}

      <div className="flex items-center gap-2 p-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-primary transition-colors shrink-0 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[28px]">add_circle</span>
          </button>
          <button
            type="button"
            onClick={() => setIsGiftOpen(!isGiftOpen)}
            disabled={disabled}
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full transition-all shrink-0 disabled:opacity-50",
              isGiftOpen ? "text-primary scale-110" : "text-gray-400 hover:text-primary"
            )}
          >
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: isGiftOpen ? "'FILL' 1" : "'FILL' 0" }}>
              favorite
            </span>
          </button>
        </div>
        <div className="flex-1 bg-white dark:bg-surface-dark rounded-[24px] min-h-[40px] flex items-center px-4 py-1 border border-transparent focus-within:border-primary/50 transition-colors shadow-sm focus-within:shadow-md">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full bg-transparent border-none text-slate-800 dark:text-white placeholder-gray-400 focus:ring-0 focus:outline-none text-[15px] leading-normal p-0 font-display"
          />
          <button
            type="button"
            className="text-gray-400 hover:text-yellow-500 transition-colors ml-2 flex items-center justify-center"
          >
            <span className="material-symbols-outlined">sentiment_satisfied</span>
          </button>
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={(!message.trim() && !uploadedUrl) || disabled || isUploading}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled || isUploading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[20px] ml-0.5">send</span>
          )}
        </button>
      </div>
    </footer>
  );
}
