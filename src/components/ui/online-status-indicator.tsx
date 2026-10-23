import { cn } from "@/lib/utils";

interface OnlineStatusIndicatorProps {
  online: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  position?: "bottom-right" | "top-right" | "bottom-left" | "top-left";
  className?: string;
  showPulse?: boolean;
}

const sizeClasses = {
  xs: "w-2 h-2 border",
  sm: "w-2.5 h-2.5 border-2",
  md: "w-3 h-3 border-2",
  lg: "w-4 h-4 border-2",
};

const positionClasses = {
  "bottom-right": "bottom-0 right-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "top-left": "top-0 left-0",
};

export function OnlineStatusIndicator({
  online,
  size = "sm",
  position = "bottom-right",
  className,
  showPulse = true,
}: OnlineStatusIndicatorProps) {
  if (!online) return null;

  return (
    <div
      className={cn(
        "absolute z-10 rounded-full border-background",
        sizeClasses[size],
        positionClasses[position],
        online ? "bg-green-500" : "bg-gray-400",
        showPulse && online && "animate-pulse",
        className
      )}
    />
  );
}
