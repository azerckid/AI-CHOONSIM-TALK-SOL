/**
 * CHOCO 잔액 부족 모달 (CTC 오프체인 포인트 버전)
 * Phase 0-3: 레거시 지갑 연결·서명·전송 로직 전체 제거
 * 402 수신 시 /profile/subscription 충전 페이지로 유도합니다.
 */
import { X, ShieldCheck, Coins, ArrowRight } from "lucide-react";
import { Link } from "react-router";

interface PaymentSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PaymentSheet({ isOpen, onClose }: PaymentSheetProps) {
    if (!isOpen) return null;

    return (
        <div className="payment-sheet-overlay">
            <div className="payment-sheet open">
                <div className="sheet-header">
                    <h3>CHOCO 잔액 부족</h3>
                    <button className="close-btn" onClick={onClose} aria-label="닫기">
                        <X size={20} />
                    </button>
                </div>

                <div className="sheet-content">
                    <div className="icon-wrapper">
                        <Coins size={48} className="text-pink-500" />
                    </div>
                    <p className="desc-text">
                        채팅을 계속하려면 CHOCO가 더 필요해요.<br />
                        충전 후 돌아오시면 바로 이어서 대화할 수 있어요.
                    </p>

                    <Link
                        to="/profile/subscription"
                        onClick={onClose}
                        className="pay-button"
                    >
                        CHOCO 충전하기
                        <ArrowRight size={18} />
                    </Link>

                    <Link
                        to="/guide"
                        onClick={onClose}
                        className="guide-link"
                    >
                        CHOCO가 뭔가요?
                    </Link>

                    <div className="security-badge">
                        <ShieldCheck size={14} className="text-success" />
                        <span>PayPal · Toss 안전 결제</span>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .payment-sheet-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                    z-index: 1000;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }
                .payment-sheet {
                    width: 100%;
                    max-width: 500px;
                    background: #1a1a1a;
                    border-radius: 24px 24px 0 0;
                    padding: 24px;
                    transform: translateY(100%);
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-bottom: none;
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.3);
                }
                .payment-sheet.open { transform: translateY(0); }
                .sheet-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .sheet-header h3 {
                    font-size: 18px;
                    font-weight: 700;
                    color: white;
                }
                .close-btn {
                    background: rgba(255,255,255,0.05);
                    border: none;
                    color: white;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .sheet-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    padding-bottom: 8px;
                }
                .icon-wrapper { margin-bottom: 4px; }
                .desc-text {
                    text-align: center;
                    color: rgba(255,255,255,0.6);
                    font-size: 14px;
                    line-height: 1.6;
                }
                .pay-button {
                    width: 100%;
                    height: 56px;
                    background: linear-gradient(135deg, #ec4899, #be185d);
                    border-radius: 16px;
                    color: white;
                    font-size: 16px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    text-decoration: none;
                    transition: transform 0.1s;
                }
                .pay-button:active { transform: scale(0.98); }
                .guide-link {
                    font-size: 12px;
                    color: rgba(255,255,255,0.35);
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .guide-link:hover { color: rgba(255,255,255,0.6); }
                .security-badge {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: rgba(255,255,255,0.3);
                    margin-top: 4px;
                }
                .text-success { color: #10b981; }
            `}} />
        </div>
    );
}
