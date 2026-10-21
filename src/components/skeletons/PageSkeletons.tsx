import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Shimmer effect wrapper
const ShimmerWrapper = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("animate-pulse", className)}>
    {children}
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn("rounded-2xl p-4 sm:p-5 bg-card border border-border/50", className)} style={style}>
    <div className="flex items-center justify-between">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20 bg-muted/60" />
        <Skeleton className="h-8 w-16 bg-muted/60" />
        <Skeleton className="h-3 w-24 bg-muted/60" />
      </div>
      <Skeleton className="h-10 w-10 rounded-xl bg-muted/60" />
    </div>
  </div>
);

// Card Skeleton (for events, jobs, donations)
export const ContentCardSkeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn("rounded-2xl p-5 bg-card border border-border/50 space-y-4", className)} style={style}>
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-3/4 bg-muted/60" />
        <Skeleton className="h-3 w-1/2 bg-muted/60" />
      </div>
      <Skeleton className="h-8 w-8 rounded-lg bg-muted/60" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full bg-muted/60" />
      <Skeleton className="h-3 w-5/6 bg-muted/60" />
    </div>
    <div className="flex items-center gap-4 pt-2">
      <Skeleton className="h-4 w-24 bg-muted/60" />
      <Skeleton className="h-4 w-20 bg-muted/60" />
    </div>
    <Skeleton className="h-2 w-full rounded-full bg-muted/60" />
    <div className="flex items-center justify-between pt-2">
      <Skeleton className="h-6 w-16 rounded-full bg-muted/60" />
      <Skeleton className="h-8 w-20 rounded-lg bg-muted/60" />
    </div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 6 }: { columns?: number }) => (
  <tr className="border-b border-border/30">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton className={cn(
          "h-4 bg-muted/60",
          i === 0 ? "w-10" : i === 1 ? "w-32" : i === 2 ? "w-40" : "w-20"
        )} />
      </td>
    ))}
  </tr>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) => (
  <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
    <div className="bg-muted/30 p-4 border-b border-border/30">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn(
            "h-4 bg-muted/60",
            i === 0 ? "w-10" : i === 1 ? "w-24" : "w-20"
          )} />
        ))}
      </div>
    </div>
    <table className="w-full">
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  </div>
);

// Dashboard Page Skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6 p-1 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-muted/60" />
        <Skeleton className="h-4 w-64 bg-muted/60" />
      </div>
      <Skeleton className="h-5 w-40 bg-muted/60" />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <StatsCardSkeleton key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 75}ms` } as React.CSSProperties} />
      ))}
    </div>

    {/* Quick Actions */}
    <div className="rounded-2xl bg-card border border-border/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '300ms' }}>
      <Skeleton className="h-5 w-32 mb-4 bg-muted/60" />
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 p-4">
            <Skeleton className="h-12 w-12 rounded-xl bg-muted/60" />
            <Skeleton className="h-3 w-12 bg-muted/60" />
          </div>
        ))}
      </div>
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl bg-card border border-border/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '400ms' }}>
        <Skeleton className="h-5 w-40 mb-4 bg-muted/60" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30">
              <Skeleton className="h-14 w-14 rounded-xl bg-muted/60" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 bg-muted/60" />
                <Skeleton className="h-3 w-28 bg-muted/60" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '500ms' }}>
        <Skeleton className="h-5 w-36 mb-4 bg-muted/60" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-9 w-9 rounded-full bg-muted/60" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-28 bg-muted/60" />
                <Skeleton className="h-3 w-20 bg-muted/60" />
              </div>
              <Skeleton className="h-3 w-12 bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Events/Jobs/Donations Page Skeleton
export const CardsPageSkeleton = ({ 
  title, 
  showTabs = true,
  cardCount = 6 
}: { 
  title?: string; 
  showTabs?: boolean;
  cardCount?: number;
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 bg-muted/60" />
        <Skeleton className="h-4 w-80 bg-muted/60" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg bg-muted/60" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
      {[0, 1, 2].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>

    {/* Tabs */}
    {showTabs && (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
        <Skeleton className="h-10 w-full rounded-lg bg-muted/60" />
      </div>
    )}

    {/* Cards Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in duration-500" style={{ animationDelay: '300ms' }}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <ContentCardSkeleton 
          key={i} 
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${300 + i * 50}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  </div>
);

// Alumni/Users Table Page Skeleton
export const UsersPageSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 bg-muted/60" />
        <Skeleton className="h-4 w-96 bg-muted/60" />
      </div>
      <Skeleton className="h-10 w-32 rounded-lg bg-muted/60" />
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
      {[0, 1, 2].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>

    {/* Search and Filters */}
    <div className="flex flex-col md:flex-row gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
      <Skeleton className="h-10 flex-1 rounded-lg bg-muted/60" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-[140px] rounded-lg bg-muted/60" />
        <Skeleton className="h-10 w-10 rounded-lg bg-muted/60" />
      </div>
    </div>

    {/* Table */}
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '300ms' }}>
      <TableSkeleton rows={8} columns={6} />
    </div>
  </div>
);

// Communications Page Skeleton
export const CommunicationsPageSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-muted/60" />
        <Skeleton className="h-4 w-80 bg-muted/60" />
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
      {[0, 1, 2, 3].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>

    {/* Campaign Cards */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-card border border-border/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl bg-muted/60" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 bg-muted/60" />
              <Skeleton className="h-3 w-48 bg-muted/60" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-lg bg-muted/60" />
          <Skeleton className="h-10 w-full rounded-lg bg-muted/60" />
        </div>
      ))}
    </div>

    {/* Email Compose */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '300ms' }}>
      <div className="rounded-2xl bg-card border border-border/50 p-6 space-y-4">
        <Skeleton className="h-6 w-40 bg-muted/60" />
        <Skeleton className="h-10 w-full rounded-lg bg-muted/60" />
        <Skeleton className="h-32 w-full rounded-lg bg-muted/60" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full bg-muted/60" />
          ))}
        </div>
        <Skeleton className="h-10 w-32 rounded-lg bg-muted/60" />
      </div>
      <div className="rounded-2xl bg-card border border-border/50 p-6 space-y-4">
        <Skeleton className="h-6 w-32 bg-muted/60" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <Skeleton className="h-8 w-8 rounded-full bg-muted/60" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-48 bg-muted/60" />
                <Skeleton className="h-3 w-32 bg-muted/60" />
              </div>
              <Skeleton className="h-3 w-16 bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Dialog Loading Skeleton
export const DialogContentSkeleton = ({ itemCount = 5 }: { itemCount?: number }) => (
  <div className="space-y-4 py-4">
    <div className="flex items-center justify-center py-8">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    </div>
    <p className="text-center text-muted-foreground text-sm animate-pulse">Loading...</p>
  </div>
);

// List Item Skeleton (for participants, donors, applicants)
export const ListItemSkeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30 border border-card-border/30">
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full bg-muted/60" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 bg-muted/60" />
        <Skeleton className="h-3 w-48 bg-muted/60" />
        <Skeleton className="h-3 w-24 bg-muted/60" />
      </div>
    </div>
    <Skeleton className="h-6 w-20 rounded-full bg-muted/60" />
  </div>
);

export const ListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="animate-in fade-in slide-in-from-right-2 duration-300"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <ListItemSkeleton />
      </div>
    ))}
  </div>
);
