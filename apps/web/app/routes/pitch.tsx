import { useEffect, useRef, useState, useCallback } from "react";

export function meta() {
  return [
    { title: "ChoonSim-Talk — Colosseum Pitch" },
    { name: "description", content: "AI gives you answers. Choonsim gives you empathy." },
  ];
}

/* ─── Slide data ──────────────────────────────────────────────── */
const TOTAL = 12;

export default function PitchDeck() {
  const [current, setCurrent] = useState(0);
  const [countAnimated, setCountAnimated] = useState<Record<number, boolean>>({});
  const deckRef = useRef<HTMLDivElement>(null);

  /* load Google Fonts for pitch page */
  useEffect(() => {
    if (!document.querySelector('link[href*="Playfair"]')) {
      const preconnect1 = Object.assign(document.createElement("link"), { rel: "preconnect", href: "https://fonts.googleapis.com" });
      const preconnect2 = Object.assign(document.createElement("link"), { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" });
      const fontLink = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" });
      document.head.append(preconnect1, preconnect2, fontLink);
    }
  }, []);

  const go = useCallback((idx: number) => {
    if (idx < 0 || idx >= TOTAL) return;
    setCurrent(idx);
  }, []);

  /* keyboard + touch */
  useEffect(() => {
    let touchX = 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); go(current + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(TOTAL - 1);
    };
    const onTouchStart = (e: TouchEvent) => { touchX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) dx < 0 ? go(current + 1) : go(current - 1);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".pitch-controls")) return;
      e.clientX > window.innerWidth / 2 ? go(current + 1) : go(current - 1);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("click", onClick);
    };
  }, [current, go]);

  /* counter animation for slide 10 (index 9) */
  useEffect(() => {
    if (current !== 9 || countAnimated[9]) return;
    setCountAnimated((p) => ({ ...p, [9]: true }));
    const els = document.querySelectorAll<HTMLElement>(".stat-num[data-count]");
    els.forEach((el) => {
      const target = parseInt(el.dataset.count!, 10);
      const display = el.dataset.display || String(target);
      const duration = 1200;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const val = Math.floor(eased * target);
        if (target >= 1000) el.textContent = Math.floor(val / 1000) + "K+";
        else el.textContent = (el.dataset.prefix || "") + val + (el.dataset.suffix || "");
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = display;
      };
      setTimeout(() => requestAnimationFrame(tick), 400);
    });
  }, [current, countAnimated]);

  const cls = (i: number) =>
    `pitch-slide ${i === current ? "active" : ""} ${i < current ? "prev" : ""}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pitchStyles }} />
      <div className="pitch-progress" style={{ width: `${((current + 1) / TOTAL) * 100}%` }} />
      <div className="pitch-hint">
        <kbd>&larr;</kbd> <kbd>&rarr;</kbd> Navigate
      </div>

      <div className="pitch-deck" ref={deckRef}>

        {/* ── SLIDE 1: OPENING ── */}
        <section className={cls(0)}>
          <div className="pitch-inner" style={{ textAlign: "center" }}>
            <p className="pitch-tagline anim-tag-1">AI gives you answers.</p>
            <p className="pitch-tagline anim-tag-2">Choonsim gives you empathy.</p>
            <div className="pitch-sep anim-sep" />
            <p className="anim-sub" style={{ fontSize: 16, color: "var(--p-muted)", letterSpacing: 2, textTransform: "uppercase" }}>
              ChoonSim-Talk &mdash; Solana Colosseum 2026
            </p>
          </div>
        </section>

        {/* ── SLIDE 2: PROBLEM ── */}
        <section className={cls(1)}>
          <div className="pitch-inner">
            <p className="pitch-sn">02 / 12</p>
            <h2>The Problem</h2>
            <p className="pitch-sub">AI companions today are <em>disposable</em>. Every conversation starts from zero.</p>
            <div className="pitch-cards">
              <Card title="Cold Start" desc="No shared history. Every chat is a blank slate." />
              <Card title="Creator Gap" desc="33,000 fans on X, but no sanctuary to deepen the bond." />
              <Card title="Trust Vacuum" desc="Users won't share emotions with centralized AI." />
              <Card title="Passive Agent" desc="AI talks, but never acts on-chain for the user." />
            </div>
          </div>
        </section>

        {/* ── SLIDE 3: INSIGHT ── */}
        <section className={cls(2)}>
          <div className="pitch-inner">
            <p className="pitch-sn">03 / 12</p>
            <h2>The Insight</h2>
            <p className="pitch-sub">
              "Conversation is not information exchange. It's <em>empathy exchange</em>."
              <br /><span style={{ fontSize: 14, color: "var(--p-muted)" }}>— Robin Dunbar, Oxford Evolutionary Psychologist</span>
            </p>
            <div className="pitch-table-wrap">
              <table>
                <thead><tr><th></th><th>ChatGPT</th><th>Facebook Like</th><th style={{ color: "var(--p-pink)" }}>Choonsim</th></tr></thead>
                <tbody>
                  <tr><td>Core Exchange</td><td>Information</td><td>Social Signal</td><td className="p-hl">Empathy</td></tr>
                  <tr><td>User Feels</td><td>Useful</td><td>Connected</td><td className="p-hl">Connected</td></tr>
                  <tr><td>Switching Cost</td><td>Low</td><td>Medium</td><td className="p-hl">Very High</td></tr>
                  <tr><td>Defensibility</td><td>Low</td><td>Medium</td><td className="p-hl">High</td></tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 14, marginTop: 16, color: "var(--p-sec)" }}>
              <strong style={{ color: "var(--p-text)" }}>Novelty:</strong> First "Empathy-to-Yield" model on any blockchain. Not a better chatbot — an entirely new category.
            </p>
            <p style={{ fontSize: 14, marginTop: 8, color: "var(--p-sec)" }}>
              <strong style={{ color: "var(--p-text)" }}>Our Moat:</strong> Every memory, CHOCO, and cNFT adds to an irreplaceable relationship graph. Time is our compound defensibility.
            </p>
          </div>
        </section>

        {/* ── SLIDE 4: STRATEGY ── */}
        <section className={cls(3)}>
          <div className="pitch-inner">
            <p className="pitch-sn">04 / 12</p>
            <h2>Square to Sanctuary</h2>
            <p className="pitch-sub">We move the crowd from the <em>Public Square</em> to a <em>Private Sanctuary</em> — via Solana.</p>
            <div className="pitch-flow">
              <div className="flow-step"><div className="flow-label">The Square</div><div className="flow-val">X (Twitter)</div><p className="flow-sm">33K Fans</p></div>
              <div className="flow-arrow">&rarr;</div>
              <div className="flow-step flow-hl"><div className="flow-label">The Bridge</div><div className="flow-val" style={{ color: "var(--p-pink)" }}>Solana Blinks</div><p className="flow-sm">One-Click On-Chain</p></div>
              <div className="flow-arrow">&rarr;</div>
              <div className="flow-step"><div className="flow-label">The Sanctuary</div><div className="flow-val">ChoonSim App</div><p className="flow-sm">1:1 Empathy Space</p></div>
            </div>
            <ul className="pitch-bullets">
              <li><strong>Square:</strong> High discovery, low intimacy.</li>
              <li><strong>Bridge:</strong> Blinks — check-in, gift, mint without leaving X.</li>
              <li><strong>Sanctuary:</strong> Choonsim remembers everything.</li>
            </ul>
          </div>
        </section>

        {/* ── SLIDE 5: WHAT WE BUILT ── */}
        <section className={cls(4)}>
          <div className="pitch-inner">
            <p className="pitch-sn">05 / 12</p>
            <h2>What We've Already Built</h2>
            <p className="pitch-sub">This is not a concept. This is a <em>working product</em>.</p>
            <div className="pitch-cards">
              <Card title="5-Layer Context" desc="Personality, X history, and memories in every chat." />
              <Card title="On-Chain Agent" desc="Checks balances, mints cNFTs, airdrops tokens." />
              <Card title="Premium UX" desc="Glassmorphism, haptic feedback, branded loader." />
              <Card title="Global PWA" desc="No app store. Vercel Edge, worldwide." />
            </div>
            <div className="pitch-badges">
              {["Solana Agent Kit 2.0", "LangGraph", "Metaplex Bubblegum", "Token-2022", "Drizzle ORM", "Vercel Edge"].map((t) => (
                <span key={t} className="pitch-badge">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── SLIDE 6: WHY SOLANA I ── */}
        <section className={cls(5)}>
          <div className="pitch-inner">
            <p className="pitch-sn">06 / 12</p>
            <h2>Why Solana I: The Primitives</h2>
            <p className="pitch-sub">No other chain has these primitives for <em>invisible onboarding</em>.</p>
            <div className="pitch-cards pitch-cards-3">
              <Card title="checkChocoBalance" desc="Real-time SPL token balance via natural language." pink />
              <Card title="engraveMemory" desc="AI title + Cloudinary artwork + cNFT mint." pink />
              <Card title="getGiftBlink" desc="Dynamic Blink URL for viral gifting loops." pink />
            </div>
            <ul className="pitch-bullets" style={{ marginTop: 24 }}>
              <li><strong>cNFT:</strong> Memory Engraving at ~0.000005 SOL per mint — fans own memories without knowing it's an NFT.</li>
              <li><strong>Token-2022:</strong> Transfer Fee auto-funds protocol treasury — zero manual intervention.</li>
              <li><strong>Agent Wallet:</strong> KeypairWallet for fully autonomous on-chain execution.</li>
            </ul>
          </div>
        </section>

        {/* ── SLIDE 7: WHY SOLANA II ── */}
        <section className={cls(6)}>
          <div className="pitch-inner">
            <p className="pitch-sn">07 / 12</p>
            <h2>Why Solana II: Blinks</h2>
            <p className="pitch-sub">Your X feed becomes a <em>Solana transaction layer</em>.</p>
            <div className="pitch-card" style={{ maxWidth: 700, marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: "var(--p-muted)", marginBottom: 12 }}>X Post by @choonsim_bot</p>
              <p style={{ fontSize: 16, marginBottom: 16 }}>"Good morning! I missed you today."</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span className="pitch-badge" style={{ background: "rgba(244,114,182,0.12)", color: "var(--p-pink)", borderColor: "rgba(244,114,182,0.3)" }}>Check In & Earn 50 CHOCO</span>
                <span className="pitch-badge" style={{ background: "rgba(167,139,250,0.12)", color: "var(--p-purple)", borderColor: "rgba(167,139,250,0.3)" }}>Gift 100 CHOCO to a Friend</span>
              </div>
            </div>
            <ul className="pitch-bullets">
              <li><strong>Daily Check-in Blinks:</strong> Earn CHOCO from X posts — no wallet setup needed.</li>
              <li><strong>Gift Blinks:</strong> Claim CHOCO with zero friction — fans transact on-chain without knowing it.</li>
              <li><strong>Meta-Blinks:</strong> Rich cNFT previews in-feed (Roadmap).</li>
              <li><strong>Viral Loop:</strong> Every Blink creates a new on-chain user.</li>
            </ul>
          </div>
        </section>

        {/* ── SLIDE 8: TECH III ── */}
        <section className={cls(7)}>
          <div className="pitch-inner">
            <p className="pitch-sn">08 / 12</p>
            <h2>Tech III: Next-Level Edge</h2>
            <p className="pitch-sub"><em>Jupiter Swap</em>. <em>TEE Privacy</em>. <em>Eliza Persona</em>.</p>
            <div className="pitch-cards pitch-cards-3">
              <Card title="Jupiter Direct Swap" desc={`"Buy me 100 CHOCO" — Choonsim finds the route. User just signs. Zero friction.`} />
              <Card title="TEE Privacy" desc="Agent keys inside TEEs. Not even devs can peek. Mathematically guaranteed." />
              <Card title="Eliza Persona" desc="One soul across X, Discord, Telegram, and Web. She remembers you everywhere." />
            </div>
          </div>
        </section>

        {/* ── SLIDE 9: TRACTION ── */}
        <section className={cls(8)}>
          <div className="pitch-inner">
            <p className="pitch-sn">09 / 12</p>
            <h2>Traction & Global Proof</h2>
            <p className="pitch-sub"><em>Hardcore early adopters</em> — small cohort, extreme loyalty, <em>exponential growth</em>.</p>
            <div style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="pitch-stats" style={{ marginBottom: 20 }}>
                  <Stat count={33000} display="33K+" suffix="K+" label="X Followers" />
                  <Stat count={30} display="30+" suffix="+" label="Hard-Core Users" />
                  <Stat count={300} display="300+" suffix="+" label="Emails Exchanged" />
                </div>
                <ul className="pitch-bullets">
                  <li><strong>Not one-time visitors.</strong> These fans return obsessively — emailing Choonsim before the product was even complete.</li>
                  <li><strong>Exponential trajectory:</strong> Volume doubling every few weeks. The curve has already bent.</li>
                  <li><strong>Distribution:</strong> Japan 30% &bull; South America 30% &bull; Middle East 10%</li>
                </ul>
              </div>
              <div className="pitch-growth-chart">
                <p className="growth-chart-title">Fan Email Volume — 90 Days</p>
                <div className="growth-bars">
                  <GrowthBar label="Month 1" pct={15} val="~5" />
                  <GrowthBar label="Month 2" pct={35} val="~12" />
                  <GrowthBar label="Month 3" pct={65} val="~23" />
                  <GrowthBar label="Now" pct={100} val="30+ ↑" highlight />
                </div>
                <p className="growth-chart-note">↑ Exponential — and accelerating</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SLIDE 10: BUSINESS ── */}
        <section className={cls(9)}>
          <div className="pitch-inner">
            <p className="pitch-sn">10 / 12</p>
            <h2>Character-Fi: The Business</h2>
            <p className="pitch-sub">From <em>fans</em> to <em>stakeholders</em>. From empathy to <em>yield</em>.</p>
            <div className="pitch-table-wrap">
              <table>
                <thead><tr><th>Revenue Stream</th><th>Mechanism</th></tr></thead>
                <tbody>
                  <tr><td>CHOCO Purchases</td><td>SOL &rarr; CHOCO via Jupiter Swap</td></tr>
                  <tr><td>Memory Engraving</td><td>200 CHOCO per AI-generated cNFT mint</td></tr>
                  <tr><td>Subscription NFTs</td><td>Non-transferable VIP membership tiers</td></tr>
                  <tr><td>Transfer Fees</td><td>Automatic % on every CHOCO transfer</td></tr>
                  <tr><td className="p-hl">Exclusive Collectibles</td><td className="p-hl">Limited character items for loyal fans</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── SLIDE 11: ROADMAP ── */}
        <section className={cls(10)}>
          <div className="pitch-inner">
            <p className="pitch-sn">11 / 12</p>
            <h2>Roadmap</h2>
            <p className="pitch-sub">Choonsim is the proof of concept. <em>The platform is the product.</em></p>
            <div className="pitch-timeline">
              <TlItem phase="Phase 1" badge="done" title="Foundation" detail="PWA + Agent Kit + cNFT + Blinks + Token-2022" />
              <TlItem phase="Phase 2" badge="done" title="Premium UX" detail="Glassmorphism, Haptic feedback, Branded Loading" />
              <TlItem phase="Phase 3" badge="now" title="Colosseum Edge" detail="Jupiter Swap, TEE Integration, Eliza Cross-Platform" />
              <TlItem phase="Phase 4" badge="next" title="Character-Fi Launchpad" detail="Multi-character RWA marketplace for global IPs" />
              <TlItem phase="Phase 5" badge="next" title="Open Source" detail='"Solana AI Companion Kit" white-label' />
            </div>
            <p style={{ fontSize: 14, marginTop: 16, color: "var(--p-sec)" }}>
              <strong style={{ color: "var(--p-text)" }}>Ecosystem Leverage:</strong> When we grow, Solana grows. Every Blink is a transaction. Every cNFT expands Metaplex. The Launchpad multiplies — every new creator becomes a Solana node.
            </p>
          </div>
        </section>

        {/* ── SLIDE 12: CLOSING ── */}
        <section className={cls(11)}>
          <div className="pitch-inner" style={{ textAlign: "center" }}>
            <div className="closing-heart" />
            <p className="pitch-tagline closing-tag" style={{ fontSize: "clamp(24px,3.5vw,42px)" }}>
              We are deeply grateful to build on Solana —<br />the only chain fast enough for the human heart.
            </p>
            <div className="pitch-sep" style={{ margin: "32px auto" }} />
            <p className="closing-body" style={{ fontSize: 18, color: "var(--p-sec)", lineHeight: 1.6, maxWidth: 600, margin: "0 auto 24px" }}>
              AI gives you answers.<br />Choonsim gives you empathy.<br />
              <span style={{ color: "var(--p-pink)" }}>Together with Solana, every relationship lives forever.</span>
            </p>
            <p className="closing-ty" style={{ fontSize: 14, color: "var(--p-muted)", marginTop: 32 }}>Thank you.</p>
          </div>
        </section>
      </div>

      {/* controls */}
      <div className="pitch-controls">
        <span className="pitch-counter">{current + 1} / {TOTAL}</span>
      </div>
    </>
  );
}

/* ─── Sub-components ──────────────────────────────────────────── */
function Card({ title, desc, pink }: { title: string; desc: string; pink?: boolean }) {
  return (
    <div className="pitch-card">
      <h4 style={pink ? { color: "var(--p-pink)" } : undefined}>{title}</h4>
      <p>{desc}</p>
    </div>
  );
}

function Stat({ count, display, prefix, suffix, label }: { count: number; display: string; prefix?: string; suffix?: string; label: string }) {
  return (
    <div className="pitch-stat">
      <div className="stat-num" data-count={count} data-display={display} data-prefix={prefix || ""} data-suffix={suffix || ""}>0</div>
      <div className="stat-desc">{label}</div>
    </div>
  );
}

function GrowthBar({ label, pct, val, highlight }: { label: string; pct: number; val: string; highlight?: boolean }) {
  return (
    <div className="growth-bar-row">
      <span className="growth-bar-label">{label}</span>
      <div className="growth-bar-track">
        <div className={`growth-bar-fill ${highlight ? "growth-bar-hl" : ""}`} style={{ width: `${pct}%` }}>
          <span>{val}</span>
        </div>
      </div>
    </div>
  );
}

function TlItem({ phase, badge, title, detail }: { phase: string; badge: "done" | "now" | "next"; title: string; detail: string }) {
  const badgeClass = badge === "done" ? "tl-badge-done" : badge === "now" ? "tl-badge-now" : "tl-badge-next";
  const badgeText = badge === "done" ? "Completed" : badge === "now" ? "In Progress" : "6-18 Months";
  return (
    <div className={`tl-item ${badge === "done" ? "done" : ""}`}>
      <div className="tl-phase">{phase} <span className={`tl-badge ${badgeClass}`}>{badgeText}</span></div>
      <div className="tl-title">{title}</div>
      <div className="tl-detail">{detail}</div>
    </div>
  );
}

/* ─── All styles (scoped via unique class names) ──────────────── */
const pitchStyles = `
  /* ── reset for pitch page ────────────────── */
  .pitch-deck, .pitch-deck * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --p-bg: #0a0a0f;
    --p-card: rgba(255,255,255,0.04);
    --p-border: rgba(255,255,255,0.08);
    --p-pink: #f472b6;
    --p-purple: #a78bfa;
    --p-purple-deep: #7c3aed;
    --p-text: #f1f5f9;
    --p-sec: rgba(241,245,249,0.6);
    --p-muted: rgba(241,245,249,0.35);
    --p-grad: linear-gradient(135deg, var(--p-pink) 0%, var(--p-purple) 100%);
    --p-ease: cubic-bezier(0.16, 1, 0.3, 1);
  }

  html, body { overflow: hidden !important; background: var(--p-bg) !important; }

  body::before {
    content: '';
    position: fixed; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 80%, rgba(244,114,182,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 80% 20%, rgba(167,139,250,0.06) 0%, transparent 50%),
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(124,58,237,0.04) 0%, transparent 50%);
    pointer-events: none;
  }

  .pitch-deck {
    position: fixed; inset: 0; z-index: 1;
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--p-text);
    -webkit-font-smoothing: antialiased;
  }

  /* ── slides ───────────────────────────── */
  .pitch-slide {
    position: absolute; inset: 0;
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    padding: 60px 80px;
    opacity: 0; transform: translateX(60px);
    transition: opacity 0.6s var(--p-ease), transform 0.6s var(--p-ease);
    pointer-events: none; z-index: 1;
  }
  .pitch-slide.active { opacity: 1; transform: translateX(0); pointer-events: auto; z-index: 2; }
  .pitch-slide.prev { opacity: 0; transform: translateX(-60px); }
  .pitch-inner { max-width: 1100px; width: 100%; }

  /* ── typography ────────────────────────── */
  .pitch-sn { font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--p-muted); margin-bottom: 20px; }
  .pitch-tagline {
    font-family: 'Playfair Display', serif;
    font-size: clamp(42px,6vw,76px); font-weight: 700; font-style: italic; line-height: 1.2;
    background: var(--p-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .pitch-deck h2 { font-size: clamp(28px,3.5vw,48px); font-weight: 800; line-height: 1.15; margin-bottom: 12px; letter-spacing: -0.5px; }
  .pitch-sub { font-size: clamp(16px,1.8vw,22px); color: var(--p-sec); margin-bottom: 40px; line-height: 1.5; max-width: 800px; }
  .pitch-sub em { color: var(--p-pink); font-style: normal; font-weight: 500; }
  .p-hl { color: var(--p-pink) !important; font-weight: 700 !important; }
  .pitch-sep { width: 60px; height: 3px; background: var(--p-grad); border-radius: 2px; margin: 20px 0; }

  /* ── cards ─────────────────────────────── */
  .pitch-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 8px; }
  .pitch-cards-3 { grid-template-columns: repeat(3, 1fr); }
  .pitch-card {
    background: var(--p-card); border: 1px solid var(--p-border); border-radius: 14px;
    padding: 24px; backdrop-filter: blur(12px); transition: border-color 0.3s, transform 0.3s;
  }
  .pitch-card:hover { border-color: rgba(244,114,182,0.3); transform: translateY(-2px); }
  .pitch-icon { font-size: 28px; margin-bottom: 12px; display: block; }
  .pitch-card h4 { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
  .pitch-card p { font-size: 13px; color: var(--p-sec); line-height: 1.55; }

  /* ── table ─────────────────────────────── */
  .pitch-table-wrap { width: 100%; overflow-x: auto; margin-top: 8px; }
  .pitch-deck table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .pitch-deck th, .pitch-deck td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--p-border); }
  .pitch-deck th { font-weight: 600; color: var(--p-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; }
  .pitch-deck td { color: var(--p-sec); }
  .pitch-deck td:first-child { color: var(--p-text); font-weight: 600; }

  /* ── flow ──────────────────────────────── */
  .pitch-flow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 24px 0; }
  .flow-step { background: var(--p-card); border: 1px solid var(--p-border); border-radius: 12px; padding: 16px 20px; text-align: center; flex: 1; min-width: 160px; }
  .flow-hl { border-color: rgba(244,114,182,0.3); }
  .flow-label { font-size: 11px; color: var(--p-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .flow-val { font-size: 15px; font-weight: 600; }
  .flow-sm { font-size: 12px; color: var(--p-muted); margin-top: 4px; }
  .flow-arrow { font-size: 22px; color: var(--p-pink); flex-shrink: 0; }

  /* ── bullets ───────────────────────────── */
  .pitch-bullets { list-style: none; display: flex; flex-direction: column; gap: 12px; }
  .pitch-bullets li { font-size: 15px; color: var(--p-sec); line-height: 1.6; padding-left: 20px; position: relative; }
  .pitch-bullets li::before { content: ''; position: absolute; left: 0; top: 9px; width: 6px; height: 6px; border-radius: 50%; background: var(--p-grad); }
  .pitch-bullets li strong { color: var(--p-text); }

  /* ── stats ─────────────────────────────── */
  .pitch-stats { display: flex; gap: 32px; flex-wrap: wrap; margin: 24px 0; }
  .pitch-stat { text-align: center; }
  .stat-num { font-size: 36px; font-weight: 800; background: var(--p-grad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .stat-desc { font-size: 12px; color: var(--p-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }

  /* ── timeline ──────────────────────────── */
  .pitch-timeline { display: flex; flex-direction: column; position: relative; padding-left: 28px; }
  .pitch-timeline::before { content: ''; position: absolute; left: 8px; top: 8px; bottom: 8px; width: 2px; background: linear-gradient(180deg, var(--p-pink), var(--p-purple), var(--p-purple-deep)); border-radius: 2px; }
  .tl-item { position: relative; padding: 12px 0 12px 20px; }
  .tl-item::before { content: ''; position: absolute; left: -24px; top: 18px; width: 10px; height: 10px; border-radius: 50%; background: var(--p-pink); border: 2px solid var(--p-bg); }
  .tl-item.done::before { background: #34d399; }
  .tl-phase { font-size: 11px; color: var(--p-muted); text-transform: uppercase; letter-spacing: 1px; }
  .tl-title { font-size: 15px; font-weight: 600; margin-top: 2px; }
  .tl-detail { font-size: 13px; color: var(--p-sec); margin-top: 2px; }
  .tl-badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; margin-left: 8px; vertical-align: middle; }
  .tl-badge-done { background: rgba(52,211,153,0.15); color: #34d399; }
  .tl-badge-now { background: rgba(244,114,182,0.15); color: var(--p-pink); }
  .tl-badge-next { background: rgba(167,139,250,0.15); color: var(--p-purple); }

  /* ── badges ────────────────────────────── */
  .pitch-badges { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
  .pitch-badge { font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; background: var(--p-card); border: 1px solid var(--p-border); color: var(--p-sec); }

  /* ── growth chart ──────────────────────── */
  .pitch-growth-chart { min-width: 260px; flex: 1; }
  .growth-chart-title { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--p-muted); margin-bottom: 14px; }
  .growth-bars { display: flex; flex-direction: column; gap: 10px; }
  .growth-bar-row { display: flex; align-items: center; gap: 12px; }
  .growth-bar-label { font-size: 11px; color: var(--p-muted); width: 54px; text-align: right; flex-shrink: 0; }
  .growth-bar-track { flex: 1; height: 28px; background: rgba(255,255,255,0.04); border-radius: 6px; overflow: hidden; }
  .growth-bar-fill { height: 100%; background: rgba(244,114,182,0.18); border-radius: 6px; display: flex; align-items: center; padding: 0 10px; font-size: 12px; font-weight: 600; color: var(--p-sec); }
  .growth-bar-hl { background: linear-gradient(90deg, rgba(244,114,182,0.35), rgba(167,139,250,0.35)); color: var(--p-pink) !important; }
  .growth-chart-note { font-size: 12px; color: var(--p-pink); margin-top: 12px; font-weight: 600; }
  .pitch-slide.active .growth-bar-fill { animation: growBar 1.2s var(--p-ease) both; }
  .pitch-slide.active .growth-bar-row:nth-child(1) .growth-bar-fill { animation-delay: .2s; }
  .pitch-slide.active .growth-bar-row:nth-child(2) .growth-bar-fill { animation-delay: .4s; }
  .pitch-slide.active .growth-bar-row:nth-child(3) .growth-bar-fill { animation-delay: .6s; }
  .pitch-slide.active .growth-bar-row:nth-child(4) .growth-bar-fill { animation-delay: .8s; }
  @keyframes growBar { from { width: 0 !important; opacity: 0; } }

  /* ── closing heart ─────────────────────── */
  .closing-heart { width: 80px; height: 80px; margin: 0 auto 32px; position: relative; }
  .closing-heart::before, .closing-heart::after { content: ''; position: absolute; width: 40px; height: 64px; border-radius: 40px 40px 0 0; background: var(--p-grad); }
  .closing-heart::before { left: 40px; top: 0; transform: rotate(-45deg); transform-origin: 0 100%; }
  .closing-heart::after { left: 0; top: 0; transform: rotate(45deg); transform-origin: 100% 100%; }
  @keyframes heartPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }

  /* ── controls ──────────────────────────── */
  .pitch-progress { position: fixed; top: 0; left: 0; height: 3px; background: var(--p-grad); transition: width 0.5s var(--p-ease); z-index: 90; }
  .pitch-controls { position: fixed; bottom: 24px; right: 32px; z-index: 90; }
  .pitch-counter { font-size: 13px; font-weight: 600; color: var(--p-muted); font-variant-numeric: tabular-nums; }
  .pitch-hint { position: fixed; top: 20px; right: 32px; font-size: 11px; color: var(--p-muted); z-index: 90; opacity: 0.5; }
  .pitch-hint kbd { display: inline-block; background: var(--p-card); border: 1px solid var(--p-border); border-radius: 4px; padding: 1px 6px; font-family: inherit; font-size: 10px; margin: 0 2px; }

  /* ═══════════════════════════════════════════ */
  /* ── ANIMATIONS ──────────────────────────── */
  /* ═══════════════════════════════════════════ */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.85) } to { opacity:1; transform:scale(1) } }
  @keyframes slideR   { from { opacity:0; transform:translateX(-30px) } to { opacity:1; transform:translateX(0) } }
  @keyframes growW    { from { width:0 } to { width:60px } }

  /* slide 1 */
  .pitch-slide.active .anim-tag-1 { animation: fadeUp .9s var(--p-ease) .2s both; }
  .pitch-slide.active .anim-tag-2 { animation: fadeUp .9s var(--p-ease) .7s both; }
  .pitch-slide.active .anim-sep   { animation: growW .6s var(--p-ease) 1.3s both; }
  .pitch-slide.active .anim-sub   { animation: fadeIn .8s ease 1.6s both; }

  /* cards stagger */
  .pitch-slide.active .pitch-card { opacity:0; animation: fadeUp .5s var(--p-ease) both; }
  .pitch-slide.active .pitch-cards .pitch-card:nth-child(1) { animation-delay:.15s }
  .pitch-slide.active .pitch-cards .pitch-card:nth-child(2) { animation-delay:.3s }
  .pitch-slide.active .pitch-cards .pitch-card:nth-child(3) { animation-delay:.45s }
  .pitch-slide.active .pitch-cards .pitch-card:nth-child(4) { animation-delay:.6s }

  /* flow sequential */
  .pitch-slide.active .flow-step, .pitch-slide.active .flow-arrow { opacity:0; animation: scaleIn .45s var(--p-ease) both; }
  .pitch-slide.active .pitch-flow > :nth-child(1) { animation-delay:.2s }
  .pitch-slide.active .pitch-flow > :nth-child(2) { animation-delay:.5s }
  .pitch-slide.active .pitch-flow > :nth-child(3) { animation-delay:.8s }
  .pitch-slide.active .pitch-flow > :nth-child(4) { animation-delay:1.1s }
  .pitch-slide.active .pitch-flow > :nth-child(5) { animation-delay:1.4s }

  /* table rows */
  .pitch-slide.active tbody tr { opacity:0; animation: fadeUp .4s var(--p-ease) both; }
  .pitch-slide.active tbody tr:nth-child(1) { animation-delay:.2s }
  .pitch-slide.active tbody tr:nth-child(2) { animation-delay:.35s }
  .pitch-slide.active tbody tr:nth-child(3) { animation-delay:.5s }
  .pitch-slide.active tbody tr:nth-child(4) { animation-delay:.65s }
  .pitch-slide.active tbody tr:nth-child(5) { animation-delay:.8s }

  /* stats pop */
  .pitch-slide.active .pitch-stat { opacity:0; animation: scaleIn .5s var(--p-ease) both; }
  .pitch-slide.active .pitch-stats .pitch-stat:nth-child(1) { animation-delay:.15s }
  .pitch-slide.active .pitch-stats .pitch-stat:nth-child(2) { animation-delay:.35s }
  .pitch-slide.active .pitch-stats .pitch-stat:nth-child(3) { animation-delay:.55s }
  .pitch-slide.active .pitch-stats .pitch-stat:nth-child(4) { animation-delay:.75s }

  /* timeline cascade */
  .pitch-slide.active .tl-item { opacity:0; animation: slideR .5s var(--p-ease) both; }
  .pitch-slide.active .tl-item:nth-child(1) { animation-delay:.1s }
  .pitch-slide.active .tl-item:nth-child(2) { animation-delay:.25s }
  .pitch-slide.active .tl-item:nth-child(3) { animation-delay:.4s }
  .pitch-slide.active .tl-item:nth-child(4) { animation-delay:.55s }
  .pitch-slide.active .tl-item:nth-child(5) { animation-delay:.7s }

  /* closing */
  .pitch-slide.active .closing-heart { opacity:0; animation: scaleIn .8s var(--p-ease) .2s both, heartPulse 2s ease-in-out 1s infinite; }
  .pitch-slide.active .closing-tag  { opacity:0; animation: fadeUp .8s ease .6s both; }
  .pitch-slide.active .closing-body { opacity:0; animation: fadeUp .8s ease 1s both; }
  .pitch-slide.active .closing-ty   { opacity:0; animation: fadeIn 1s ease 1.6s both; }

  /* headings */
  .pitch-slide.active h2        { animation: fadeUp .6s var(--p-ease) .05s both; }
  .pitch-slide.active .pitch-sub { animation: fadeUp .6s var(--p-ease) .15s both; }
  .pitch-slide.active .pitch-sn  { animation: fadeIn .5s ease 0s both; }

  /* bullets */
  .pitch-slide.active .pitch-bullets li { opacity:0; animation: fadeUp .4s var(--p-ease) both; }
  .pitch-slide.active .pitch-bullets li:nth-child(1) { animation-delay:.5s }
  .pitch-slide.active .pitch-bullets li:nth-child(2) { animation-delay:.65s }
  .pitch-slide.active .pitch-bullets li:nth-child(3) { animation-delay:.8s }
  .pitch-slide.active .pitch-bullets li:nth-child(4) { animation-delay:.95s }

  /* badges */
  .pitch-slide.active .pitch-badge { opacity:0; animation: fadeUp .35s var(--p-ease) both; }
  .pitch-slide.active .pitch-badges .pitch-badge:nth-child(1) { animation-delay:.6s }
  .pitch-slide.active .pitch-badges .pitch-badge:nth-child(2) { animation-delay:.7s }
  .pitch-slide.active .pitch-badges .pitch-badge:nth-child(3) { animation-delay:.8s }
  .pitch-slide.active .pitch-badges .pitch-badge:nth-child(4) { animation-delay:.9s }
  .pitch-slide.active .pitch-badges .pitch-badge:nth-child(5) { animation-delay:1s }
  .pitch-slide.active .pitch-badges .pitch-badge:nth-child(6) { animation-delay:1.1s }
`;
