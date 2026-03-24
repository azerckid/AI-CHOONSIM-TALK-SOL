import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const defaultNS = "common";

const en = {
  common: {
    back: "Back",
    seeAll: "See All",
    viewAll: "View All",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
  },
  character: {
    chunsim: { name: "Choonsim", role: "Main AI" },
    mina: { name: "Mina", role: "K-Pop Idol - Main Vocal" },
    yuna: { name: "Yuna", role: "Singer Songwriter" },
    sora: { name: "Sora", role: "Visual & Rapper" },
    rina: { name: "Rina", role: "Lead Dancer" },
    hana: { name: "Hana", role: "Maknae" },
  },
  home: {
    title: "AI Idol Chat",
    newChat: "New Chat",
    dailyGift: "Daily Gift",
    gallery: "Gallery",
    shop: "Shop",
    todayPick: "Today's Pick",
    trendingIdols: "Trending Idols",
    fandomLounge: "Fandom Lounge",
    comingSoon: "Coming Soon",
    continueChatting: "Continue Chatting",
    viewAll: "View All",
    chatNow: "Chat Now",
    cannotStartChat: "Cannot start chat.",
  },
  chat: {
    newChat: "New Chat",
    startNewConversation: "Start a new conversation!",
    waitingForYou: "Choonsim is waiting for you.",
    startChatTitle: "Start New Chat",
    prepareInProgress: "Preparing...",
    cannotStartChat: "Cannot start chat.",
    chatStartError: "An error occurred while starting the chat.",
    prepareInProgressCharacter: "This character is not available yet.",
    startConversation: "Start the conversation",
    startConversationHint: "Start the conversation",
  },
  characterProfile: {
    about: "About",
    voice: "Voice",
    gallery: "Gallery",
    message: "Message",
    enterLounge: "Enter Lounge",
    selectedStar: "Selected Star",
    officialSpace: "'s Official Space",
    aiGeneration: "AI Generation",
    galleryPreparing: "Gallery is being prepared",
    galleryPreparingDesc: "More photos will be uploaded soon.",
    heartGauge: "Heart Gauge",
    sendHeartsToLevelUp: "Send hearts to level up!",
    backstory: "Backstory",
    voiceSample: "'s Greeting",
    noVoiceSample: "No voice sample registered.",
    voicePreparing: "Voice is being prepared",
    voicePreparingDesc: "Please wait a moment!",
    interests: "Interests",
  },
  fandom: {
    title: "Fandom Lounge",
  },
  error: {
    oops: "Oops!",
    unknown: "An unknown error occurred.",
    notFound: "Page not found.",
    notFoundDesc: "The page you requested could not be found.",
    forbidden: "Access denied",
    forbiddenDesc: "This page requires admin privileges. Please log in with an admin account.",
    unauthorized: "Login required",
    unauthorizedDesc: "Please log in to use this service.",
    serverError: "A server error occurred.",
    goHome: "Back to Home",
  },
} as const;

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  defaultNS,
  interpolation: { escapeValue: false },
});

export default i18n;
