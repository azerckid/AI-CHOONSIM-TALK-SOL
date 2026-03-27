import { ErrorMessage } from "~/components/ui/ErrorMessage";

interface ApiErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ApiError({
  message = "A server error occurred. Please try again later.",
  onRetry,
  className,
}: ApiErrorProps) {
  return (
    <ErrorMessage
      title="Server Error"
      message={message}
      onRetry={onRetry}
      className={className}
    />
  );
}

