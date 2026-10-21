import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { Info, Check, AlertTriangle, X } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  const getIcon = (variant?: string) => {
    switch (variant) {
      case "info":
        return <Info className="h-5 w-5" />;
      case "success":
        return <Check className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "destructive":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getIconStyles = (variant?: string) => {
    switch (variant) {
      case "info":
        return "bg-blue-500 text-white dark:bg-blue-600";
      case "success":
        return "bg-emerald-500 text-white dark:bg-emerald-600";
      case "warning":
        return "bg-amber-500 text-white dark:bg-amber-600";
      case "destructive":
        return "bg-rose-500 text-white dark:bg-rose-600";
      default:
        return "bg-slate-500 text-white dark:bg-slate-600";
    }
  };

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = getIcon(variant);
        const iconStyles = getIconStyles(variant);
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center gap-3 flex-1">
              {icon && (
                <div className={`flex-shrink-0 rounded-lg p-2 ${iconStyles}`}>
                  {icon}
                </div>
              )}
              <div className="grid gap-0.5 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

