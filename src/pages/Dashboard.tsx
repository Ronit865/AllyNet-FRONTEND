import {
  Calendar, Users, Briefcase, Heart, MessageCircle,
  Building2, ArrowRight, GraduationCap, Star,
  TrendingUp, Clock, ChevronRight
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminService, eventService, userService, jobService,
  donationService, connectionService, communicationService
} from "@/services/ApiServices";
import { toast } from "sonner";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────── */
interface DashboardStats {
  totalAlumni: number; totalEvents: number; activeEvents: number;
  totalDonations: string; totalJobs: number; totalConnections: number;
}
interface DonationStats {
  totalRaised: number; activeDonors: number; avgDonation: number;
  campaignGoalPercentage: number; totalGoal: number; totalCampaigns: number;
}
interface Event  { _id: string; title: string; date: string; location?: string; isactive: boolean; participants: string[]; }
interface Alumni { _id: string; name: string; email: string; role?: string; graduationYear?: string; course?: string; }
interface Job    { _id: string; title: string; company: string; salary: number; location?: string; jobType?: string; }
interface Post   { _id: string; content: string; author: { _id: string; name: string }; createdAt: string; }

/* ─── Animated Counter ─────────────────────────────────── */
function AnimatedCounter({ value, duration = 900 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>();
  useEffect(() => {
    if (!value) return;
    const start = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) rafRef.current = requestAnimationFrame(run);
    };
    rafRef.current = requestAnimationFrame(run);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);
  return <>{count.toLocaleString()}</>;
}

/* ─── Stat Card ────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, delay, onClick, trend, color
}: {
  label: string; value: number | string; icon: React.ElementType;
  delay: number; onClick?: () => void; trend?: string; color?: "blue" | "green" | "amber" | "rose";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={cn(
        "stat-card hover-lift",
        color === "blue"  && "stat-card-blue",
        color === "green" && "stat-card-green",
        color === "amber" && "stat-card-amber",
        color === "rose"  && "stat-card-rose",
        !color && "stat-card-blue"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="stat-card-label">{label}</p>
          <p className="stat-card-number mt-1">
            {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
          </p>
          {trend && (
            <p className="text-[11px] mt-1 flex items-center gap-1 opacity-70">
              <TrendingUp className="w-3 h-3" />{trend}
            </p>
          )}
        </div>
        <div className="stat-card-icon">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Section Header ───────────────────────────────────── */
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[13px] font-semibold text-foreground tracking-tight">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 font-medium"
        >
          {action} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────── */
const StatsGridSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {[0,1,2,3].map(i => (
      <div key={i} className="stat-card space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-14 font-numeric" />
      </div>
    ))}
  </div>
);

const ContentSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
    {[{ c:"lg:col-span-2" }, { c:"" }].map((x, i) => (
      <div key={i} className={`${x.c} surface-card p-4 space-y-3`}>
        <Skeleton className="h-4 w-32" />
        {[0,1,2].map(j => (
          <div key={j} className="flex items-center gap-3 py-2">
            <Skeleton className="h-8 w-8 rounded-md shrink-0" />
            <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-3 w-32" /></div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

/* ─── Main Component ───────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ totalAlumni: 0, totalEvents: 0, activeEvents: 0, totalDonations: "₹0", totalJobs: 0, totalConnections: 0 });
  const [recentEvents, setRecentEvents]     = useState<Event[]>([]);
  const [featuredAlumni, setFeaturedAlumni] = useState<Alumni[]>([]);
  const [recentJobs, setRecentJobs]         = useState<Job[]>([]);
  const [recentPosts, setRecentPosts]       = useState<Post[]>([]);
  const [donationStats, setDonationStats]   = useState<DonationStats | null>(null);
  const [loading, setLoading]               = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    const cached = cache.get<any>(CACHE_KEYS.DASHBOARD_DATA);
    if (cached && !forceRefresh) {
      setStats(cached.stats); setRecentEvents(cached.recentEvents);
      setFeaturedAlumni(cached.featuredAlumni); setRecentJobs(cached.recentJobs);
      setRecentPosts(cached.recentPosts); setDonationStats(cached.donationStats);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [alumniR, eventsR, jobsR, donationsR, connectionsR, postsR] = await Promise.allSettled([
        userService.getAllUsers(), eventService.getEvents(), jobService.getAllJobs(),
        donationService.getDonationStats(), connectionService.getConnections({ status: 'accepted' }),
        communicationService.getAllPosts()
      ]);

      let verifiedAlumni: Alumni[] = [], featured: Alumni[] = [];
      if (alumniR.status === 'fulfilled') {
        const all = Array.isArray(alumniR.value?.data) ? alumniR.value.data : [];
        verifiedAlumni = all.filter((u: Alumni) => u.role?.toLowerCase() === "alumni");
        featured = [...verifiedAlumni].sort(() => 0.5 - Math.random()).slice(0, 4);
      }

      let allEvents: Event[] = [], activeEvents: Event[] = [], upcoming: Event[] = [];
      if (eventsR.status === 'fulfilled') {
        allEvents = eventsR.value?.success && Array.isArray(eventsR.value.data) ? eventsR.value.data : [];
        activeEvents = allEvents.filter(e => e.isactive);
        upcoming = activeEvents.filter(e => new Date(e.date) >= new Date())
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 4);
      }

      let jobs: Job[] = [];
      if (jobsR.status === 'fulfilled') {
        jobs = Array.isArray(jobsR.value?.data) ? jobsR.value.data : [];
        setRecentJobs(jobs.filter((j: any) => j.isVerified).slice(0, 5));
      }

      let donationAmount = "₹0", donationStatsData: DonationStats | null = null;
      if (donationsR.status === 'fulfilled' && donationsR.value?.data) {
        const d = donationsR.value.data;
        donationStatsData = d; setDonationStats(d);
        const amt = d.totalRaised || 0;
        donationAmount = amt >= 100000 ? `₹${(amt/100000).toFixed(1)}L` : amt >= 1000 ? `₹${(amt/1000).toFixed(1)}k` : `₹${amt.toLocaleString()}`;
      }

      let connectionsCount = 0;
      if (connectionsR.status === 'fulfilled') {
        const d = connectionsR.value?.data;
        connectionsCount = Array.isArray(d) ? d.length : 0;
      }

      let recentPostsList: Post[] = [];
      if (postsR.status === 'fulfilled') {
        const d = postsR.value?.data;
        const allPosts: Post[] = Array.isArray(d) ? d : Array.isArray(d?.posts) ? d.posts : [];
        recentPostsList = allPosts.slice(0, 3);
        setRecentPosts(recentPostsList);
      }

      const newStats: DashboardStats = {
        totalAlumni: verifiedAlumni.length, totalEvents: allEvents.length,
        activeEvents: activeEvents.length, totalDonations: donationAmount,
        totalJobs: jobs.filter((j: any) => j.isVerified).length,
        totalConnections: connectionsCount
      };
      setStats(newStats); setRecentEvents(upcoming); setFeaturedAlumni(featured);

      cache.set(CACHE_KEYS.DASHBOARD_DATA, {
        stats: newStats, recentEvents: upcoming, featuredAlumni: featured,
        recentJobs: Array.isArray(jobs) ? jobs.filter((j: any) => j.isVerified).slice(0, 5) : [],
        recentPosts: recentPostsList, donationStats: donationStatsData
      }, CACHE_TTL.MEDIUM);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] text-muted-foreground mb-0.5">{greeting()}, {firstName}</p>
            <h1 className="page-title">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate('/alumni')} className="text-xs h-8">
              Browse alumni
            </Button>
            <Button size="sm" onClick={() => navigate('/events')} className="text-xs h-8">
              View events
            </Button>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────── */}
      {loading ? <StatsGridSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Alumni"        value={stats.totalAlumni}    icon={Users}     delay={0}    onClick={() => navigate('/alumni')}    color="blue"  trend="Network" />
          <StatCard label="Active Events" value={stats.activeEvents}   icon={Calendar}  delay={0.05} onClick={() => navigate('/events')}    color="green" />
          <StatCard label="Open Jobs"     value={stats.totalJobs}      icon={Briefcase} delay={0.1}  onClick={() => navigate('/jobs')}      color="amber" />
          <StatCard label="Raised"        value={stats.totalDonations} icon={Heart}     delay={0.15} onClick={() => navigate('/donations')} color="rose"  />
        </div>
      )}

      {/* ── MAIN GRID ──────────────────────────────────── */}
      {loading ? <ContentSkeleton /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Upcoming events — span 2 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="lg:col-span-2 surface-card p-4"
          >
            <SectionHeader title="Upcoming Events" action="View all" onAction={() => navigate('/events')} />
            {recentEvents.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No upcoming events</div>
            ) : (
              <div className="space-y-1">
                {recentEvents.map((event, i) => (
                  <motion.div
                    key={event._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="list-row group cursor-pointer"
                    onClick={() => navigate('/events')}
                  >
                    <div className="w-9 h-9 rounded-md border bg-muted/40 flex flex-col items-center justify-center shrink-0 mr-3">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">
                        {new Date(event.date).toLocaleString('en', { month: 'short' })}
                      </span>
                      <span className="text-[15px] font-bold text-foreground leading-none">
                        {new Date(event.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{event.title}</p>
                      <p className="text-[11px] text-muted-foreground">{event.location || 'Location TBD'}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Alumni spotlight */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="surface-card p-4"
          >
            <SectionHeader title="Alumni" action="All" onAction={() => navigate('/alumni')} />
            {featuredAlumni.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No alumni yet</div>
            ) : (
              <div className="space-y-1">
                {featuredAlumni.map((a, i) => (
                  <motion.div
                    key={a._id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    className="list-row cursor-pointer"
                    onClick={() => navigate('/alumni')}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-2.5">
                      <span className="text-[10px] font-bold text-primary">{getInitials(a.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.course || 'Alumni'}{a.graduationYear ? ` · ${a.graduationYear}` : ''}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── BOTTOM ROW ─────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Recent Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="surface-card p-4"
          >
            <SectionHeader title="Jobs" action="All" onAction={() => navigate('/jobs')} />
            {recentJobs.length === 0
              ? <p className="text-[12px] text-muted-foreground py-4 text-center">No jobs yet</p>
              : <div className="space-y-1">
                  {recentJobs.slice(0, 4).map(job => (
                    <div key={job._id} className="list-row cursor-pointer" onClick={() => navigate('/jobs')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-foreground truncate">{job.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{job.company}</p>
                      </div>
                      <span className="text-[11px] font-numeric text-muted-foreground shrink-0 ml-2">
                        ₹{(job.salary/1000).toFixed(0)}k
                      </span>
                    </div>
                  ))}
                </div>
            }
          </motion.div>

          {/* Companies */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.3 }}
            className="surface-card p-4"
          >
            <SectionHeader title="Top Companies" />
            <div className="space-y-1">
              {[
                { name: "TCS",       domain: "tcs.com",       count: "250+" },
                { name: "Infosys",   domain: "infosys.com",   count: "180+" },
                { name: "Google",    domain: "google.com",    count: "45+"  },
                { name: "Microsoft", domain: "microsoft.com", count: "38+"  },
              ].map(c => (
                <div key={c.name} className="list-row">
                  <CompanyLogo
                    companyName={c.name} domain={c.domain}
                    containerClassName="w-6 h-6 bg-white dark:bg-muted rounded border shrink-0 mr-2.5 flex items-center justify-center"
                    className="w-4 h-4 object-contain"
                    fallbackClassName="text-[10px] font-bold text-primary"
                  />
                  <span className="text-[12px] font-medium flex-1 text-foreground">{c.name}</span>
                  <span className="text-[11px] font-numeric text-muted-foreground">{c.count}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Community posts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="surface-card p-4"
          >
            <SectionHeader title="Community" action="Open" onAction={() => navigate('/communications')} />
            {recentPosts.length === 0
              ? <p className="text-[12px] text-muted-foreground py-4 text-center">No recent posts</p>
              : <div className="space-y-2">
                  {recentPosts.map(post => (
                    <div key={post._id} className="cursor-pointer" onClick={() => navigate('/communications')}>
                      <p className="text-[11px] font-medium text-muted-foreground">{post.author?.name}</p>
                      <p className="text-[12px] text-foreground line-clamp-2 mt-0.5">{post.content}</p>
                    </div>
                  ))}
                </div>
            }
          </motion.div>

          {/* Donations */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.3 }}
            className="surface-card p-4 cursor-pointer"
            onClick={() => navigate('/donations')}
          >
            <SectionHeader title="Donations" action="Donate" onAction={() => navigate('/donations')} />
            <div className="text-center py-2">
              <p className="font-numeric text-2xl font-bold text-foreground tracking-tight">{stats.totalDonations}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total raised</p>
            </div>
            {donationStats && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Goal progress</span>
                  <span className="font-numeric font-semibold text-foreground">{donationStats.campaignGoalPercentage.toFixed(0)}%</span>
                </div>
                <Progress value={Math.min(donationStats.campaignGoalPercentage, 100)} className="h-1" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="text-center">
                    <p className="font-numeric text-base font-bold text-foreground">{donationStats.activeDonors}</p>
                    <p className="text-[10px] text-muted-foreground">Donors</p>
                  </div>
                  <div className="text-center">
                    <p className="font-numeric text-base font-bold text-foreground">{donationStats.totalCampaigns}</p>
                    <p className="text-[10px] text-muted-foreground">Campaigns</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}