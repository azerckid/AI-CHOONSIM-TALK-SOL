/**
 * Privy 임베디드 지갑 주소를 서버(/api/user/privy-wallet)에 저장한다.
 * usePrivyWalletSync, EmbeddedWalletSection, PrivyEmbeddedWalletButton이 공유하는 호출부.
 */

export interface PrivyLinkedAccount {
    chainType: string;
    walletClientType: string;
    address: string;
    type?: string;
}

/** user.linkedAccounts에서 Privy가 생성한 Solana 임베디드 지갑을 찾는다. */
export function findPrivySolanaEmbeddedWallet(
    user: { linkedAccounts?: unknown } | null | undefined
): PrivyLinkedAccount | null {
    const accounts = user?.linkedAccounts as PrivyLinkedAccount[] | undefined;
    return accounts?.find((a) => a.chainType === "solana" && a.walletClientType === "privy") ?? null;
}

export interface PrivyWalletSyncResult {
    ok: boolean;
    isNew?: boolean;
    error?: string;
}

export async function syncPrivyWallet(address: string): Promise<PrivyWalletSyncResult> {
    try {
        const res = await fetch("/api/user/privy-wallet", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ privyWallet: address }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { ok: false, error: data.error ?? "Failed to save wallet address" };
        }
        return { ok: true, isNew: data.isNew };
    } catch {
        return { ok: false, error: "Network error" };
    }
}
