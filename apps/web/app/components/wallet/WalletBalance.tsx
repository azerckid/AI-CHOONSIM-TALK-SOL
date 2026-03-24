import { useState, useEffect } from "react";
import { Coins, Heart, RefreshCw } from "lucide-react";

interface WalletBalanceProps {
    userId?: string;
    initialChoco?: string;
    initialHearts?: number;
}

export function WalletBalance({
    initialChoco = "0",
    initialHearts = 0,
}: WalletBalanceProps) {
    const [chocoBalance, setChocoBalance] = useState(initialChoco);
    const [hearts, setHearts] = useState(initialHearts);
    const [isLoading, setIsLoading] = useState(false);

    // 잔액 실시간 동기화
    const syncBalance = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/wallet/status");
            const data = await res.json();
            if (data.chocoBalance) {
                setChocoBalance(data.chocoBalance);
            }
        } catch (e) {
            console.error("Balance sync failed", e);
        } finally {
            setIsLoading(false);
        }
    };

    const formattedChoco = parseFloat(chocoBalance).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    return (
        <div className="wallet-balance-container">
            <div className="balance-card glass">
                <div className="balance-item">
                    <div className="icon-wrapper choco">
                        <Coins size={18} />
                    </div>
                    <div className="balance-info">
                        <span className="label">CHOCO</span>
                        <span className="value">{formattedChoco}</span>
                    </div>
                </div>

                <div className="divider"></div>

                <div className="balance-item">
                    <div className="icon-wrapper hearts">
                        <Heart size={18} fill="currentColor" />
                    </div>
                    <div className="balance-info">
                        <span className="label">HEARTS</span>
                        <span className="value">{hearts.toLocaleString()}</span>
                    </div>
                </div>

                <button
                    className={`sync-button ${isLoading ? 'rotating' : ''}`}
                    onClick={syncBalance}
                    disabled={isLoading}
                    title="잔액 동기화"
                >
                    <RefreshCw size={14} />
                </button>
            </div>


            <style dangerouslySetInnerHTML={{
                __html: `
                .wallet-balance-container {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    font-family: 'Inter', sans-serif;
                }

                .balance-card {
                    display: flex;
                    align-items: center;
                    padding: 8px 16px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    position: relative;
                }

                .balance-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .icon-wrapper {
                    width: 32px;
                    height: 32px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .icon-wrapper.choco {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .icon-wrapper.hearts {
                    background: linear-gradient(135deg, #ec4899, #be185d);
                    color: white;
                }

                .balance-info {
                    display: flex;
                    flex-direction: column;
                }

                .balance-info .label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    opacity: 0.6;
                    font-weight: 600;
                }

                .balance-info .value {
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                }

                .divider {
                    width: 1px;
                    height: 24px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 0 16px;
                }

                .sync-button {
                    background: none;
                    border: none;
                    color: white;
                    opacity: 0.4;
                    cursor: pointer;
                    margin-left: 8px;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .sync-button:hover {
                    opacity: 1;
                }

                .sync-button.rotating svg {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .wallet-address-chip {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    border-radius: 12px;
                    background: rgba(0, 0, 0, 0.2);
                    align-self: flex-start;
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .wallet-address-chip .addr-text {
                    max-width: 120px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            ` }} />
        </div>
    );
}
