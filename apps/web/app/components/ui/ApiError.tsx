import { ErrorMessage } from "~/components/ui/ErrorMessage";

interface ApiErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ApiError({
  message = "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  onRetry,
  className,
}: ApiErrorProps) {
  return (
    <ErrorMessage
      title="서버 오류"
      message={message}
      onRetry={onRetry}
      className={className}
    />
  );
}

