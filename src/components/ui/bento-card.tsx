import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BentoCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  gradient?: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
  onClick?: () => void;
}

const sizeClasses = {
  sm: "col-span-1 row-span-1",
  md: "col-span-2 row-span-1",
  lg: "col-span-2 row-span-2",
  xl: "col-span-3 row-span-2"
};

export function BentoCard({
  title,
  description,
  children,
  className,
  size = "md",
  gradient = false,
  icon,
  iconBg = "bg-primary/10",
  onClick
}: BentoCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group transition-colors duration-100",
        "rounded-lg border-border/30",
        "bg-gradient-to-br from-card via-card to-muted/20",
        "dark:from-card dark:via-card dark:to-muted/10",
        sizeClasses[size],
        gradient && "from-primary/5 via-primary/3 to-transparent border-primary/15 dark:from-primary/10 dark:via-primary/5",
        className
      )}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", iconBg)}>
              {icon}
            </div>
          )}
          <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        </div>
        {description && (
          <CardDescription className="text-xs text-muted-foreground/70">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {children}
      </CardContent>
    </Card>
  );
}