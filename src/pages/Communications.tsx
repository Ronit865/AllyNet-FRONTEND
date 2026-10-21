import { useState, useEffect } from "react";
import {
  MessageSquare, Bell, TrendingUp, Flame, Clock,
  Users, BarChart2, ArrowUp, RefreshCw, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { RedditPostCard } from "@/components/communication/RedditPostCard";
import { PostComposer } from "@/components/communication/PostComposer";
import { communicationService, notificationService } from "@/services/ApiServices";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/* ── types ── */
interface Stats { totalPosts: number; activeUsers: number; comments: number; upvotes: number; }
interface Notification { _id: string; title: string; message: string; createdAt: string; type: string; read: boolean; postId?: string; sender?: { name: string; avatar?: string }; }

/* ── Sort pill ── */
function SortPill({ active, icon: Icon, label, color, onClick }: { active: boolean; icon: React.ElementType; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-100",
        active
          ? cn("border-current", color)
          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/60"
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

/* ── Stat chip ── */
function StatChip({ icon: Icon, label, value, className }: { icon: React.ElementType; label: string; value: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border bg-card", className)}>
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <div>
        <p className="text-[11px] font-medium text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-sm font-bold text-foreground leading-none font-numeric">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

/* ── Notification item ── */
function NotifItem({ n, onClick }: { n: Notification; onClick: (n: Notification) => void }) {
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };
  const typeIcon: Record<string, string> = {
    comment: "💬", upvote: "👍", reply: "↩️", mention: "@", connection: "🤝", event: "📅", general: "🔔"
  };
  return (
    <button
      onClick={() => onClick(n)}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover-row transition-colors",
        !n.read && "bg-primary/[0.04]"
      )}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        {n.sender ? (
          <Avatar className="w-8 h-8">
            <AvatarImage src={n.sender.avatar} />
            <AvatarFallback className="text-xs bg-muted">{n.sender.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
            {typeIcon[n.type] || "🔔"}
          </div>
        )}
        {!n.read && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-foreground" : "font-normal text-foreground/80")}>
          {n.title}
        </p>
        {n.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>}
        <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
      </div>
      {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />}
    </button>
  );
}

/* ── Main ── */
export function Communications() {
  const [posts, setPosts]               = useState<any[]>([]);
  const [stats, setStats]               = useState<Stats>({ totalPosts: 0, activeUsers: 0, comments: 0, upvotes: 0 });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [sortBy, setSortBy]             = useState<"hot" | "new" | "top">("hot");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const navigate = useNavigate();

  const CATEGORIES = ["all", "General", "Mentorship", "Events", "Research", "Jobs", "Alumni Stories"];

  const fetchPosts = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const res = await communicationService.getAllPosts({
        sortBy,
        category: selectedCategory === "all" ? undefined : selectedCategory,
        limit: 20,
      });
      if (res.success && res.data) setPosts(res.data.posts || []);
    } catch (e: any) {
      if (!quiet) toast.error("Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await communicationService.getCommunicationStats();
      if (res.success && res.data) setStats(res.data);
    } catch {}
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await notificationService.getNotifications({ page: 1, limit: 30, type: "reply,comment,upvote,mention,post" });
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {}
    finally { setNotifLoading(false); }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (e: any) {
      toast.error("Failed to mark as read");
    }
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.read) {
      try { await notificationService.markAsRead(n._id); } catch {}
      fetchNotifications();
    }
    if (n.postId) navigate(`/communications/post/${n.postId}`);
  };

  useEffect(() => { fetchPosts(); fetchStats(); fetchNotifications(); }, [sortBy, selectedCategory]);

  const sortOptions = [
    { key: "hot" as const,  icon: Flame,      label: "Hot",  color: "text-orange-500 bg-orange-500/10 border-orange-500/30" },
    { key: "new" as const,  icon: Clock,      label: "New",  color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
    { key: "top" as const,  icon: TrendingUp, label: "Top",  color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── HEADER ── */}
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Community</h1>
            <p className="page-subtitle">Share, discuss, and connect with the alumni network</p>
          </div>
          <button
            onClick={() => fetchPosts(true)}
            disabled={refreshing}
            className="hover-icon p-2 flex-shrink-0 text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      <Tabs defaultValue="community" className="space-y-4">
        {/* ── TAB CONTROLS ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <TabsList className="h-9">
              <TabsTrigger value="community" className="gap-1.5 text-sm">
                <MessageSquare className="w-3.5 h-3.5" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5 text-sm relative">
                <Bell className="w-3.5 h-3.5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 h-4 min-w-[18px] text-[10px] leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Sort pills */}
            <div className="flex items-center gap-1.5">
              {sortOptions.map(({ key, icon, label, color }) => (
                <SortPill key={key} active={sortBy === key} icon={icon} label={label} color={color} onClick={() => setSortBy(key)} />
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-100",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-muted/50"
                )}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── COMMUNITY TAB ── */}
        <TabsContent value="community" className="space-y-4">
          {/* Stats row */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatChip icon={MessageSquare} label="Posts"    value={stats.totalPosts}  />
            <StatChip icon={Users}         label="Members"  value={stats.activeUsers} />
            <StatChip icon={MessageSquare} label="Comments" value={stats.comments}    />
            <StatChip icon={ArrowUp}       label="Votes"    value={stats.upvotes}     />
          </div>

          {/* Post composer */}
          <PostComposer onPostCreated={() => { fetchPosts(); fetchStats(); }} />

          {/* Posts feed */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="surface-card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <div className="flex gap-3">
                    <Skeleton className="h-7 w-16 rounded-lg" />
                    <Skeleton className="h-7 w-20 rounded-lg" />
                  </div>
                </div>
              ))
            ) : posts.length === 0 ? (
              <div className="surface-card p-12 flex flex-col items-center gap-3 text-center">
                <div className="empty-state-icon">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No posts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to share something with the community</p>
                </div>
              </div>
            ) : (
              posts.map(post => <RedditPostCard key={post._id} post={post} onUpdate={fetchPosts} />)
            )}
          </div>
        </TabsContent>

        {/* ── NOTIFICATIONS TAB ── */}
        <TabsContent value="notifications">
          <div className="surface-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[11px] h-5 px-1.5">{unreadCount} unread</Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                  Mark all read
                </Button>
              )}
            </div>

            {/* List */}
            {notifLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="empty-state-icon">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground mt-1">No notifications to show</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {notifications.map(n => <NotifItem key={n._id} n={n} onClick={handleNotifClick} />)}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Communications;
