import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:!right-3 group-[.toast]:!top-1/2 group-[.toast]:!-translate-y-1/2 group-[.toast]:!flex group-[.toast]:!h-8 group-[.toast]:!w-8 group-[.toast]:!items-center group-[.toast]:!justify-center group-[.toast]:!rounded-full group-[.toast]:!border group-[.toast]:!border-current/25 group-[.toast]:!bg-transparent group-[.toast]:!text-current group-[.toast]:opacity-70 group-[.toast]:transition-all group-[.toast]:hover:!bg-current/10 group-[.toast]:hover:opacity-100 group-[.toast]:focus:!outline-none group-[.toast]:focus-visible:!ring-2 group-[.toast]:focus-visible:!ring-current/40",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
