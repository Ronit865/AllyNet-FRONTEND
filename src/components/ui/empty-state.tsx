import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: {
    wrapper: "py-8",
    iconBox: "w-12 h-12 rounded-lg mb-3",
    iconSize: "w-5 h-5",
    title: "text-base font-semibold",
    desc: "text-xs",
  },
  md: {
    wrapper: "py-14",
    iconBox: "w-16 h-16 rounded-lg mb-4",
    iconSize: "w-7 h-7",
    title: "text-lg font-semibold",
    desc: "text-sm",
  },
  lg: {
    wrapper: "py-20",
    iconBox: "w-20 h-20 rounded-lg mb-5",
    iconSize: "w-9 h-9",
    title: "text-xl font-bold",
    desc: "text-sm",
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const s = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        s.wrapper,
        className
      )}
    >
      {/* Icon box */}
      <div
        className={cn(
          "flex items-center justify-center bg-muted/60 dark:bg-muted/40",
          s.iconBox
        )}
      >
        <span className={cn("text-muted-foreground/50", s.iconSize)}>
          {icon}
        </span>
      </div>

      {/* Text */}
      <p className={cn("text-foreground mb-1", s.title)}>{title}</p>
      {description && (
        <p
          className={cn(
            "text-muted-foreground max-w-xs leading-relaxed mb-4",
            s.desc
          )}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
