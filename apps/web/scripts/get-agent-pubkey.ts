import { Keypair } from "@solana/web3.js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.development" });

const raw = process.env.SOLANA_AGENT_PRIVATE_KEY;
if (!raw) {
  console.error("❌ SOLANA_AGENT_PRIVATE_KEY is not set");
  process.exit(1);
}

const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]));
console.log("✅ Agent public key (SOLANA_RECEIVER_WALLET):");
console.log(keypair.publicKey.toBase58());
