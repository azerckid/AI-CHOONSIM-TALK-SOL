/**
 * Phantom 지갑 결제 공용 흐름 — ChocoPayCard / BuyChocoPayCard / SwapTxCard가 공유.
 * create-tx → V0 트랜잭션 빌드(reference 포함) → Phantom 서명·전송·컨펌 → verify-sig.
 */

export interface CreatePaymentResult {
    recipient: string;
    lamports: number;
    paymentId: string;
    rpcUrl: string;
    reference: string;
}

export async function createSolanaPayment(choco: number, payer?: string): Promise<CreatePaymentResult> {
    const res = await fetch("/api/payment/solana/create-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payer ? { choco, payer } : { choco }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `서버 오류 (${res.status})`);
    }
    return res.json();
}

export interface VerifyPaymentResult {
    status: "COMPLETED" | "PENDING" | string;
    chocoGranted?: number;
    error?: string;
}

export async function verifySolanaPayment(signature: string, paymentId: string): Promise<VerifyPaymentResult> {
    const res = await fetch("/api/payment/solana/verify-sig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, paymentId }),
    });
    return res.json();
}

interface PhantomProvider {
    signTransaction(tx: import("@solana/web3.js").VersionedTransaction): Promise<import("@solana/web3.js").VersionedTransaction>;
}

/**
 * reference 공개키를 포함한 V0 이체 트랜잭션을 빌드하고 Phantom으로 서명·전송·컨펌까지 처리한다.
 * reference는 verify-sig가 온체인 트랜잭션을 결제 레코드와 연결하는 데 필수이므로 항상 포함해야 한다.
 */
export async function payWithPhantomTransfer(params: {
    phantom: PhantomProvider;
    payer: string;
    recipient: string;
    lamports: number;
    reference: string;
    rpcUrl: string;
}): Promise<string> {
    const {
        SystemProgram,
        PublicKey,
        Connection,
        VersionedTransaction,
        TransactionMessage,
    } = await import("@solana/web3.js");

    const connection = new Connection(params.rpcUrl, "confirmed");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const fromPubkey = new PublicKey(params.payer);
    const toPubkey = new PublicKey(params.recipient);
    const referencePubkey = new PublicKey(params.reference);
    const transferInstruction = SystemProgram.transfer({ fromPubkey, toPubkey, lamports: params.lamports });
    transferInstruction.keys.push({ pubkey: referencePubkey, isSigner: false, isWritable: false });

    const message = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);

    const signedTx = await params.phantom.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed",
    );

    return signature;
}
