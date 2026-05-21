import { Connection } from "@solana/web3.js";
import { getSolanaRpcUrl } from "~/lib/solana/config.server";

export const solanaConnection = new Connection(getSolanaRpcUrl(), "confirmed");

/** CORS 헤더 — Solana Actions 스펙 필수 */
export const ACTIONS_CORS_HEADERS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type,Accept,Authorization,x-action-version,x-blockchain-ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
};
