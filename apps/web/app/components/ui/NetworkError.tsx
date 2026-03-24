import { ErrorMessage } from "~/components/ui/ErrorMessage";

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorMessage
      title="네트워크 오류"
      message="인터넷 연결을 확인하고 다시 시도해주세요."
      onRetry={onRetry}
      className={className}
    />
  );
}

