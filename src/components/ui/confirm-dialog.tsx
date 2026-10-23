import { useState, useCallback, useRef } from "react";
import { AlertTriangle, Trash2, Info, Loader2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────── */
type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  itemName?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  isLoading: boolean;
}

/* ─── Variant config ─────────────────────────────────────── */
const variantMap: Record<ConfirmVariant, {
  icon: React.ReactNode;
  confirmClass: string;
}> = {
  danger: {
    icon: <Trash2 className="h-4 w-4 text-destructive" />,
    confirmClass: "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    confirmClass: "bg-amber-600 text-white hover:bg-amber-700 shadow-sm",
  },
  info: {
    icon: <Info className="h-4 w-4 text-primary" />,
    confirmClass: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  },
};

/* ─── ConfirmDialog component ────────────────────────────── */
interface ConfirmDialogProps extends ConfirmState {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  isLoading,
  title = "Are you sure?",
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  itemName,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { icon, confirmClass } = variantMap[variant];

  const resolvedDescription =
    description ||
    (itemName
      ? `"${itemName}" will be permanently deleted. This cannot be undone.`
      : "This action cannot be undone.");

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && !isLoading && onCancel()}>
      <AlertDialogContent className="p-0 gap-0 max-w-sm rounded-lg border shadow-modal overflow-hidden bg-background">

        {/* ── Modal header ── */}
        <div className="modal-header">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                variant === "danger"  && "bg-destructive/10",
                variant === "warning" && "bg-amber-500/10",
                variant === "info"    && "bg-primary/10",
              )}>
                {icon}
              </div>
              <h2 className="modal-header-title">{title}</h2>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="modal-header-desc mt-2 pl-[2.375rem]">{resolvedDescription}</p>
        </div>

        {/* ── Modal footer ── */}
        <div className="modal-footer">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="h-9 px-4 text-sm font-medium"
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn("h-9 px-4 text-sm font-medium", confirmClass)}
          >
            {isLoading ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Working…</>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ─── useConfirm hook ────────────────────────────────────── */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    isLoading: false,
  });
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions = {}): Promise<boolean> => {
    setState({ open: true, isLoading: false, ...options });
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setState((s) => ({ ...s, open: false, isLoading: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState((s) => ({ ...s, open: false, isLoading: false }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((s) => ({ ...s, isLoading: loading }));
  }, []);

  const Dialog = (
    <ConfirmDialog
      {...state}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, setLoading, Dialog };
}
