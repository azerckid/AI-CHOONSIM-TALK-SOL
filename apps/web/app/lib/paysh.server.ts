/**
 * Pay.sh 연동 유틸리티
 *
 * 현재: CoinGecko 무료 공개 API 사용
 * 전환 예정: Pay.sh x402 프로토콜 npm 패키지 안정화 후 fetch interceptor 교체
 * (서버 지갑이 USDC per-call 결제 → Pay.sh 게이트웨이 → 프로바이더 응답)
 */

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_TTL_MS = 60_000;

export interface TokenPrice {
  usd: number;
  krw: number;
  usd_24h_change?: number;
}

let _solPriceCache: { data: TokenPrice; ts: number } | null = null;

export async function getSolPrice(): Promise<TokenPrice> {
  if (_solPriceCache && Date.now() - _solPriceCache.ts < CACHE_TTL_MS) {
    return _solPriceCache.data;
  }

  const res = await fetch(
    `${COINGECKO_API}/simple/price?ids=solana&vs_currencies=usd,krw&include_24hr_change=true`
  );

  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

  const raw = await res.json() as {
    solana: { usd: number; krw: number; usd_24h_change: number };
  };

  const price: TokenPrice = {
    usd: raw.solana.usd,
    krw: raw.solana.krw,
    usd_24h_change: raw.solana.usd_24h_change,
  };

  _solPriceCache = { data: price, ts: Date.now() };
  return price;
}
