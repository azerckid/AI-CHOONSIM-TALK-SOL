import { useState } from "react";
import { useLoaderData, useNavigate, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { cn } from "~/lib/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json({ user: null });
  }

  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: { chocoBalance: true, subscriptionTier: true },
  });

  return Response.json({ user });
}

const EARN_METHODS = [
  { icon: "credit_card", label: "Top Up Directly", desc: "Purchase CHOCO via PayPal / Toss Payments", badge: "Instant", href: "/profile/subscription" },
  { icon: "workspace_premium", label: "Subscription Membership", desc: "CHOCO automatically credited every month", badge: "Monthly", href: "/pricing" },
  { icon: "flag", label: "Complete Missions", desc: "Earn small amounts by completing daily missions", badge: "Daily", href: "/missions" },
  { icon: "verified", label: "X Follower Verification", desc: "Link your X account to receive a bonus", badge: "Once", href: "/settings" },
  { icon: "card_giftcard", label: "Sign-up Bonus", desc: "Get 100 CHOCO instantly upon registration", badge: "Once", href: null },
];

const ITEM_GROUPS = [
  {
    group: "Chat & Energy",
    icon: "chat_bubble",
    items: [
      { name: "Message Ticket x10", price: "1,000", effect: "Adds 10 chat turns. You can chat even with zero CHOCO balance." },
      { name: "Message Ticket x50", price: "4,500", effect: "10% discount bundle. Recommended for frequent chatters." },
      { name: "Unlimited Energy Pass (1 day)", price: "500", effect: "No daily chat limit for the rest of the day." },
    ],
  },
  {
    group: "Special Experiences",
    icon: "auto_awesome",
    items: [
      { name: "First Message Ticket", price: "300", effect: "Choonsim sends the first message and starts the conversation." },
      { name: "Voice Ticket", price: "500", effect: "Hear Choonsim's reply in her AI voice." },
      { name: "Secret Episode Unlock", price: "3,000", effect: "Unlock a special locked scenario once certain conditions are met." },
    ],
  },
  {
    group: "Memory & Bond",
    icon: "favorite",
    items: [
      { name: "Memory Imprint Ticket", price: "500", effect: "Pin an important conversation so Choonsim remembers it forever." },
      { name: "Affinity Booster", price: "800", effect: "Double affinity gains during chats for 24 hours." },
      { name: "Mood Reset", price: "300", effect: "Instantly restore Choonsim from a sulky or busy state." },
    ],
  },
  {
    group: "Gifts",
    icon: "redeem",
    items: [
      { name: "Heart x10", price: "1,000", effect: "Send hearts to Choonsim. Activates character emotions (JOY/LOVING)." },
    ],
  },
  {
    group: "Collectibles",
    icon: "photo_album",
    items: [
      { name: "Chat Album", price: "2,000", effect: "AI-curated PDF of your best conversations from the past month." },
      { name: "Secret Letter", price: "1,000", effect: "AI-generated handwritten-style letter from Choonsim (1 free/month, extra per request)." },
    ],
  },
];

const TIERS = [
  { name: "Visitor", plan: "FREE", price: "Free", color: "text-slate-400", icon: "egg", daily: "5 / day", perks: ["Basic text chat"] },
  { name: "Fan", plan: "BASIC", price: "$4.99/mo", color: "text-blue-400", icon: "bolt", daily: "15 / day", perks: ["1 first-message/week", "Ad-free"] },
  { name: "Super Fan", plan: "PREMIUM", price: "$14.99/mo", color: "text-primary", icon: "diamond", daily: "30 / day", perks: ["3 voice messages/mo", "Advanced AI model", "Image generation"] },
  { name: "Whale", plan: "ULTIMATE", price: "$29.99/mo", color: "text-yellow-400", icon: "crown", daily: "Unlimited", perks: ["All perks", "Exclusive content", "Priority support"] },
];

const FAQS = [
  { q: "Does CHOCO expire?", a: "No. CHOCO you top up stays in your account as long as it remains active." },
  { q: "What happens to my CHOCO if I cancel my subscription?", a: "Any CHOCO already granted remains yours. Only the next month's refill stops." },
  { q: "Can I use CHOCO across multiple characters?", a: "Yes. CHOCO is a universal in-app currency usable with all characters." },
  { q: "Can I get a refund?", a: "Refunds for unused CHOCO can be requested within 7 days of purchase." },
  { q: "What is on-chain imprinting?", a: "It permanently records an important conversation as an NFT on the blockchain — separate from the Memory Imprint Ticket (AI memory pin)." },
  { q: "How do I verify my X followers?", a: "Go to Settings > Account Linking, connect your X account, and the bonus is granted automatically." },
];

const SPEND_TABLE = [
  { label: "1 chat message (base)", cost: "10", note: "Gemini Flash" },
  { label: "+ Web search", cost: "+20", note: "When search is used" },
  { label: "+ Memory access", cost: "+5", note: "When long-term memory is queried" },
];

const MONTHLY_TABLE = [
  { tier: "Visitor (FREE)", choco: "1,500", msgs: "~150 messages" },
  { tier: "Fan (BASIC)", choco: "2,000", msgs: "~200 messages" },
  { tier: "Super Fan (PREMIUM)", choco: "10,000", msgs: "~1,000 messages" },
  { tier: "Whale (ULTIMATE)", choco: "30,000", msgs: "~3,000 messages" },
];

function SectionHeader({ id, icon, title, subtitle }: { id?: string; icon: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
      </div>
      <div>
        <h2 className="text-white font-black italic tracking-tight text-lg uppercase">{title}</h2>
        {subtitle && <p className="text-white/40 text-xs mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-[#1A1821] border border-white/5 rounded-2xl p-4", className)}>
      {children}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left bg-[#1A1821] border border-white/5 rounded-2xl overflow-hidden transition-all"
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="text-white/80 text-sm font-semibold">{q}</span>
        <span className={cn("material-symbols-outlined text-white/30 text-[20px] shrink-0 transition-transform", open && "rotate-180")}>
          expand_more
        </span>
      </div>
      {open && (
        <div className="px-4 pb-4 text-white/50 text-sm leading-relaxed border-t border-white/5 pt-3">
          {a}
        </div>
      )}
    </button>
  );
}

export default function GuidePage() {
  const { user } = useLoaderData<typeof loader>() as {
    user: { chocoBalance: string; subscriptionTier: string | null } | null;
  };
  const navigate = useNavigate();

  const tierName = (() => {
    switch (user?.subscriptionTier) {
      case "BASIC": return "Fan";
      case "PREMIUM": return "Super Fan";
      case "ULTIMATE": return "Whale";
      default: return "Visitor";
    }
  })();

  const chocoDisplay = user
    ? Math.floor(parseFloat(user.chocoBalance || "0")).toLocaleString()
    : null;

  return (
    <div className="min-h-screen bg-[#0B0A10] text-white font-display antialiased">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-50 bg-[#0B0A10]/80 backdrop-blur-md border-b border-white/5 px-4 h-14 flex items-center justify-between max-w-md mx-auto w-full">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center text-white/60 hover:text-white transition-colors size-9 rounded-full hover:bg-white/5"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#FFD700]">toll</span>
          <h1 className="text-sm font-black italic uppercase tracking-wider text-white">CHOCO Guide</h1>
        </div>
        <div className="w-9" />
      </header>

      <main className="max-w-md mx-auto px-4 pb-32 pt-6 space-y-10 relative z-10">

        {user && (
          <Card className="bg-linear-to-br from-primary/10 to-purple-900/10 border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs font-bold uppercase tracking-wider">My Status</p>
                <p className="text-white font-black text-lg mt-1">
                  <span className="text-[#FFD700]">{chocoDisplay} CHOCO</span>
                  <span className="text-white/30 text-sm font-medium ml-2">· {tierName}</span>
                </p>
              </div>
              <Link
                to="/profile/subscription"
                className="px-4 py-2 bg-primary text-black text-xs font-black rounded-xl hover:bg-primary/90 transition-colors"
              >
                Top Up
              </Link>
            </div>
          </Card>
        )}

        {/* Section 1 */}
        <section>
          <SectionHeader id="what" icon="toll" title="What is CHOCO?" subtitle="The in-app currency of Choonsim" />
          <div className="space-y-3">
            {[
              { icon: "currency_exchange", text: "1,000 CHOCO = $1 (1 CHOCO ≈ $0.001)" },
              { icon: "public", text: "Borderless payments — use anywhere in the world" },
              { icon: "link", text: "Your CHOCO spending is recorded on-chain as your personal history" },
              { icon: "chat", text: "Used for chats, item purchases, gifts, and all in-app activity" },
            ].map(({ icon, text }) => (
              <Card key={text} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] shrink-0">{icon}</span>
                <p className="text-white/70 text-sm">{text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 2 */}
        <section>
          <SectionHeader id="earn" icon="add_circle" title="How to Earn CHOCO" />
          <div className="space-y-2.5">
            {EARN_METHODS.map(({ icon, label, desc, badge, href }) => {
              const inner = (
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                  </div>
                  <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                    {badge}
                  </span>
                </div>
              );
              return href ? (
                <Link key={label} to={href}>
                  <Card className="hover:border-primary/30 transition-colors cursor-pointer">{inner}</Card>
                </Link>
              ) : (
                <Card key={label}>{inner}</Card>
              );
            })}
          </div>
        </section>

        {/* Section 3 */}
        <section>
          <SectionHeader id="spend" icon="payments" title="How CHOCO is Spent" subtitle="How much does one chat cost?" />

          <Card className="mb-3">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider mb-3">CHOCO cost per message</p>
            <div className="space-y-2">
              {SPEND_TABLE.map(({ label, cost, note }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <span className="text-white/80 text-sm">{label}</span>
                    <span className="text-white/30 text-xs ml-2">{note}</span>
                  </div>
                  <span className="text-[#FFD700] font-black text-sm">{cost}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-wider mb-3">Monthly CHOCO by plan</p>
            <div className="space-y-2">
              {MONTHLY_TABLE.map(({ tier, choco, msgs }) => (
                <div key={tier} className="flex items-center justify-between text-sm">
                  <span className="text-white/60">{tier}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#FFD700] font-bold">{choco}</span>
                    <span className="text-white/30 text-xs">{msgs}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-white/30 font-bold">
            {["Top Up / Subscribe", "→", "Balance Increases", "→", "Chat · Items", "→", "CHOCO Deducted", "→", "Top Up Again"].map((t, i) => (
              <span key={i} className={t === "→" ? "text-white/10" : "px-2 py-1 bg-white/5 rounded-lg text-white/40"}>
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Section 4 */}
        <section>
          <SectionHeader id="items" icon="shopping_bag" title="Item Guide" subtitle="What does each item actually do?" />
          <div className="space-y-4">
            {ITEM_GROUPS.map(({ group, icon, items }) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="material-symbols-outlined text-white/30 text-[16px]">{icon}</span>
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-wider">{group}</p>
                </div>
                <div className="space-y-2">
                  {items.map(({ name, price, effect }) => (
                    <Card key={name}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-white font-bold text-sm">{name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="material-symbols-outlined text-[12px] text-[#FFD700]">toll</span>
                          <span className="text-[#FFD700] font-black text-sm">{price}</span>
                        </div>
                      </div>
                      <p className="text-white/40 text-xs leading-relaxed">{effect}</p>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5 */}
        <section>
          <SectionHeader id="tiers" icon="workspace_premium" title="Membership Tiers" subtitle="Higher tiers unlock more perks" />
          <div className="space-y-3">
            {TIERS.map(({ name, plan, price, color, icon, daily, perks }) => {
              const isCurrent = user?.subscriptionTier === plan || (!user && plan === "FREE");
              return (
                <Card
                  key={plan}
                  className={cn(
                    "transition-all",
                    isCurrent && "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn("material-symbols-outlined text-[22px]", color)}>{icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-black italic uppercase text-sm">{name}</p>
                        {isCurrent && (
                          <span className="text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full uppercase">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-white/30 text-xs">{price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/40 text-[9px] uppercase font-bold">Daily Chats</p>
                      <p className={cn("font-black text-sm", color)}>{daily}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {perks.map((perk) => (
                      <span key={perk} className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full">
                        {perk}
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
          <Link to="/pricing" className="mt-3 flex items-center justify-center gap-1.5 text-primary text-xs font-bold py-3 hover:underline">
            <span>View Membership Upgrades</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </section>

        {/* Section 6 */}
        <section>
          <SectionHeader id="faq" icon="help" title="FAQ" />
          <div className="space-y-2">
            {FAQS.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="space-y-3 pt-2">
          <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
          <p className="text-center text-white/30 text-xs font-bold uppercase tracking-wider">Get Started Now</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/profile/subscription"
              className="flex flex-col items-center gap-1.5 py-4 bg-[#1A1821] border border-white/10 rounded-2xl hover:border-primary/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[#FFD700] text-[24px]">toll</span>
              <span className="text-white font-bold text-sm">Top Up CHOCO</span>
              <span className="text-white/30 text-[10px]">Add balance instantly</span>
            </Link>
            <Link
              to="/pricing"
              className="flex flex-col items-center gap-1.5 py-4 bg-primary/10 border border-primary/30 rounded-2xl hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[24px]">workspace_premium</span>
              <span className="text-white font-bold text-sm">Subscribe</span>
              <span className="text-white/30 text-[10px]">Monthly CHOCO auto-credit</span>
            </Link>
          </div>
          <Link
            to="/shop"
            className="flex items-center justify-center gap-2 py-3.5 bg-[#1A1821] border border-white/5 rounded-2xl hover:border-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-white/40 text-[20px]">storefront</span>
            <span className="text-white/60 font-bold text-sm">Go to Item Store</span>
          </Link>
        </section>

      </main>
    </div>
  );
}
