import { ErrorMessage } from "~/components/ui/ErrorMessage";

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <ErrorMessage
      title="Network Error"
      message="Please check your internet connection and try again."
      onRetry={onRetry}
      className={className}
    />
  );
}

