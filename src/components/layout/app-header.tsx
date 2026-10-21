import {
  Bell, LogOut, MessagesSquare, Calendar, Heart,
  UserPlus, MessageSquare, CheckCheck, Settings, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { authService, notificationService, messageService } from "@/services/ApiServices";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Relative time ────────────────────────────────────── */
function relTime(ts: string) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/* ─── Notif icon ───────────────────────────────────────── */
function NotifIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5";
  switch (type) {
    case "comment":
    case "reply":      return <MessageSquare className={cn(cls, "text-muted-foreground")} />;
    case "upvote":     return <Heart          className={cn(cls, "text-muted-foreground")} />;
    case "event":      return <Calendar       className={cn(cls, "text-muted-foreground")} />;
    case "connection": return <UserPlus       className={cn(cls, "text-muted-foreground")} />;
    default:           return <Bell           className={cn(cls, "text-muted-foreground")} />;
  }
}

/* ─── Main Header ─────────────────────────────────────── */
export function AppHeader() {
  const { user, admin, logout, userType, isInitialized } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications]   = useState<any[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [notifOpen, setNotifOpen]           = useState(false);
  const [chatOpen, setChatOpen]             = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [unreadChats, setUnreadChats]       = useState(0);

  useEffect(() => {
    if (!isInitialized || !(user || admin) || userType === "admin") return;
    const load = async () => {
      try {
        const r = await notificationService.getNotifications({ page: 1, limit: 10, type: "connection" });
        if (r.success && r.data) { setNotifications(r.data.notifications || []); setUnreadCount(r.data.unreadCount || 0); }
      } catch {}
      try {
        const r = await messageService.getUserConversations();
        const convs = Array.isArray(r?.data) ? r.data : [];
        const uid = localStorage.getItem("userId");
        setUnreadChats(convs.filter((c: any) => c.lastMessage && c.lastMessage.sender !== uid && !c.lastMessage.read).length);
      } catch {}
    };
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [isInitialized, user, admin, userType]);

  const markRead = async (n: any) => {
    try {
      if (!n.read) {
        await notificationService.markAsRead(n._id);
        setNotifications(p => p.map(x => x._id === n._id ? { ...x, read: true } : x));
        setUnreadCount(p => Math.max(0, p - 1));
      }
      setNotifOpen(false);
      if (n.type === "connection") navigate("/connections");
      else if (n.link) navigate(n.link);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(p => p.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("Marked all as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleLogout = async () => {
    try { await authService.logout(); } catch {}
    logout();
    toast.success("Signed out");
    navigate("/auth/login");
  };

  const currentUser     = user || admin;
  const displayName     = currentUser?.name  || "User";
  const displayEmail    = currentUser?.email || "";
  const avatarSrc       = currentUser?.avatar || "";
  const avatarFallback  = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <header className="h-[56px] border-b bg-background/90 sticky top-0 z-40 flex items-center px-4 gap-3">

        {/* Mobile sidebar trigger */}
        <SidebarTrigger className="md:hidden h-7 w-7 rounded-md" />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">

          {/* Messages */}
          {userType !== "admin" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="relative h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                  onClick={() => setChatOpen(true)}
                >
                  <MessagesSquare className="w-4 h-4" />
                  <AnimatePresence>
                    {unreadChats > 0 && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground rounded-full flex items-center justify-center"
                      >
                        <span className="text-[9px] text-background font-bold leading-none">{unreadChats > 9 ? "9+" : unreadChats}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Messages</TooltipContent>
            </Tooltip>
          )}

          {/* Notifications */}
          {userType !== "admin" && (
            <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className="relative h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                >
                  <Bell className="w-4 h-4" />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-foreground rounded-full flex items-center justify-center"
                      >
                        <span className="text-[9px] text-background font-bold leading-none">{unreadCount > 9 ? "9+" : unreadCount}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end" sideOffset={8}
                className="w-80 p-0 rounded-lg shadow-modal border"
              >
                {/* Header */}
                <div className="modal-header !py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="modal-header-title">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="status-pill status-pill-default font-numeric">{unreadCount}</span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                {/* Body */}
                <ScrollArea className="h-[320px]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10">
                      <div className="empty-state-icon mb-3">
                        <Bell className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">All caught up</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">No new notifications</p>
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-px">
                      {notifications.map((n) => (
                        <button
                          key={n._id}
                          className={cn(
                            "list-row w-full text-left gap-2.5",
                            !n.read && "bg-primary/[0.04] dark:bg-primary/[0.08]"
                          )}
                          onClick={() => markRead(n)}
                        >
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <NotifIcon type={n.type} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className={cn("text-[12px] truncate", !n.read ? "font-semibold text-foreground" : "text-foreground/80")}>
                                {n.title}
                              </p>
                              <span className="text-[10px] font-numeric text-muted-foreground shrink-0">{relTime(n.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                          </div>
                          {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Separator */}
          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 gap-2 px-2 rounded-md font-normal hover:bg-accent"
              >
                <Avatar className="h-5 w-5">
                  <AvatarImage src={avatarSrc} />
                  <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[12px] font-medium hidden sm:inline text-foreground">{displayName.split(" ")[0]}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-56 p-0 rounded-lg shadow-modal border">
              {/* Header */}
              <div className="modal-header !py-3">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">{avatarFallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                </div>
                {userType === "admin" && (
                  <p className="mt-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Administrator</p>
                )}
              </div>

              <DropdownMenuSeparator className="m-0" />

              <div className="p-1">
                <DropdownMenuItem
                  onClick={() => navigate(userType === "admin" ? "/admin/settings" : "/settings")}
                  className="text-[13px] gap-2 cursor-pointer rounded-md h-8"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  Settings
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="m-0" />

              <div className="p-1">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-[13px] gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-md h-8"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Chat Dialog */}
      {userType !== "admin" && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          conversationId={selectedConversation?._id}
          participantName={selectedConversation?.participant?.name}
          participantAvatar={selectedConversation?.participant?.avatar}
        />
      )}
    </>
  );
}
