import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Calendar, IndianRupee, TrendingUp, UserCheck, Mail, Award,
  ArrowUpRight, Loader2, GraduationCap, Briefcase, ArrowRight,
  Activity, Clock, ChevronRight, Zap, MessageSquare, BarChart2,
  UserPlus, RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { adminService, eventService, donationService, jobService, handleApiError } from "@/services/ApiServices";
import { toast } from 'sonner';
import { Navigate, useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const DEPARTMENT_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6',
  '#f97316', '#84cc16', '#a855f7', '#0ea5e9'
];

export function Dashboard() {
  const [totalAlumni, setTotalAlumni] = useState<number>(0);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [donationStats, setDonationStats] = useState<any>(null);
  const [verifiedJobs, setVerifiedJobs] = useState<number>(0);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [recentDonors, setRecentDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    if (!amount || amount === 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toLocaleString()}`;
  };

  const getTimeAgo = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        let alumni: any[] = [];
        let events: any[] = [];
        let donors: any[] = [];

        try {
          const alumniResponse = await adminService.getAllUsers();
          alumni = Array.isArray(alumniResponse?.data) ? alumniResponse.data : [];
          setTotalAlumni(alumni.length);

          const courseCounts = alumni.reduce((acc: any, user: any) => {
            const course = user?.course || 'Not Specified';
            acc[course] = (acc[course] || 0) + 1;
            return acc;
          }, {});

          const chartData = Object.entries(courseCounts).map(([name, value], index) => ({
            name,
            value: value as number,
            color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]
          }));

          setDepartmentData(chartData);
        } catch (alumniError) {
          setTotalAlumni(0);
          setDepartmentData([]);
        }

        try {
          const eventsResponse = await eventService.getEvents();
          events = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];
          setTotalEvents(events.length);

          // Filter upcoming events (events with date >= today)
          const now = new Date();
          const upcoming = events
            .filter((event: any) => new Date(event.date) >= now)
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);
          setUpcomingEvents(upcoming);
        } catch (eventsError) {
          setTotalEvents(0);
          setUpcomingEvents([]);
        }

        try {
          const donationStatsResponse = await donationService.getDonationStats();
          const stats = donationStatsResponse?.data || {};
          setDonationStats(stats);
        } catch (donationError) {
          setDonationStats(null);
        }

        try {
          const jobsResponse = await jobService.getAllJobs();
          const jobs = jobsResponse?.data || [];
          setTotalJobs(Array.isArray(jobs) ? jobs.length : 0);
          const verified = Array.isArray(jobs)
            ? jobs.filter((job: any) => job.isVerified === true).length
            : 0;
          setVerifiedJobs(verified);

          // Get pending jobs (not verified)
          const pending = Array.isArray(jobs)
            ? jobs.filter((job: any) => job.isVerified !== true).slice(0, 5)
            : [];
          setPendingJobs(pending);
        } catch (jobsError) {
          setTotalJobs(0);
          setVerifiedJobs(0);
          setPendingJobs([]);
        }

        try {
          const donorsResponse = await donationService.getRecentDonors();
          donors = Array.isArray(donorsResponse?.data) ? donorsResponse.data : [];
          setRecentDonors(donors.slice(0, 10));
        } catch (donorsError) {
          setRecentDonors([]);
        }

        const activities: any[] = [];

        if (alumni.length > 0) {
          const sortedAlumni = [...alumni]
            .filter((user: any) => user.createdAt)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 2);

          sortedAlumni.forEach((user: any) => {
            activities.push({
              id: `alumni-${user._id}`,
              type: 'new_member',
              title: user.name || 'New Alumni',
              description: `Joined the network`,
              time: user.createdAt,
              icon: UserCheck,
              color: 'text-emerald-500',
              bgColor: 'bg-emerald-500/10',
            });
          });
        }

        if (events.length > 0) {
          const sortedEvents = [...events]
            .filter((event: any) => event.createdAt)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 2);

          sortedEvents.forEach((event: any) => {
            activities.push({
              id: `event-${event._id}`,
              type: 'event',
              title: event.title || 'New Event',
              description: event.location || 'Event scheduled',
              time: event.createdAt,
              icon: Calendar,
              color: 'text-blue-500',
              bgColor: 'bg-blue-500/10',
            });
          });
        }

        if (donors.length > 0) {
          const uniqueDonors = donors
            .filter((donor: any, index: number, self: any[]) =>
              index === self.findIndex((d: any) => d.name === donor.name && d.campaign === donor.campaign)
            )
            .slice(0, 3);

          uniqueDonors.forEach((donor: any) => {
            activities.push({
              id: `donation-${donor._id}`,
              type: 'donation',
              title: donor.name || 'Anonymous',
              description: `Donated ${formatCurrency(donor.amount)}`,
              time: donor.donatedAt || new Date(),
              icon: IndianRupee,
              color: 'text-pink-500',
              bgColor: 'bg-pink-500/10',
            });
          });
        }

        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivities(activities.slice(0, 6));
        setLastUpdated(new Date());

      } catch (error: any) {
        setError('Failed to load dashboard data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [refreshKey]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-xl p-3 shadow-xl">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} alumni
          </p>
        </div>
      );
    }
    return null;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
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
            <div
              key={i}
              className="rounded-2xl p-4 sm:p-5 bg-card border border-border/50 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-20 bg-muted/60" />
                  <Skeleton className="h-8 w-16 bg-muted/60" />
                  <Skeleton className="h-3 w-24 bg-muted/60" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl bg-muted/60" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div
          className="rounded-2xl bg-card border border-border/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: '300ms' }}
        >
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
          <div
            className="lg:col-span-2 rounded-2xl bg-card border border-border/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: '400ms' }}
          >
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
          <div
            className="rounded-2xl bg-card border border-border/50 p-6 animate-in fade-in slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: '500ms' }}
          >
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
  }

  const quickActions = [
    { label: 'Alumni',    icon: Users,         route: '/admin/alumni',         iconBg: 'bg-blue-100 dark:bg-blue-900/30',    iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Events',    icon: Calendar,      route: '/admin/events',         iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Donations', icon: IndianRupee,   route: '/admin/donations',      iconBg: 'bg-rose-100 dark:bg-rose-900/30',    iconColor: 'text-rose-600 dark:text-rose-400' },
    { label: 'Jobs',      icon: Briefcase,     route: '/admin/jobs',           iconBg: 'bg-amber-100 dark:bg-amber-900/30',  iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: 'Messages',  icon: MessageSquare, route: '/admin/communications', iconBg: 'bg-slate-100 dark:bg-slate-800/60',  iconColor: 'text-slate-600 dark:text-slate-400' },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <Badge variant="outline" className="gap-1.5 rounded-full text-[10px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live data
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Overview of your alumni network</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading live data'}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey(value => value + 1)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dashboard shell toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
          <span className="rounded-md bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
            Overview
          </span>
          <button
            type="button"
            onClick={() => navigate('/admin/alumni')}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
          >
            People
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/reports')}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
          >
            Reports
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Metrics are loaded from the current admin APIs
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stats-card-orange group cursor-pointer shadow-md transition-colors duration-100" onClick={() => navigate('/admin/alumni')}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="stats-card-label">Total Alumni</p>
              <p className="stats-card-number">{totalAlumni.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/20 dark:bg-white/10">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs opacity-80">
            <span>{departmentData.length} departments</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="stats-card-blue group cursor-pointer shadow-md transition-colors duration-100" onClick={() => navigate('/admin/events')}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="stats-card-label">Total Events</p>
              <p className="stats-card-number">{totalEvents}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/20 dark:bg-white/10">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs opacity-80">
            <span>Scheduled & past</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="stats-card-pink group cursor-pointer shadow-md transition-colors duration-100" onClick={() => navigate('/admin/donations')}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="stats-card-label">Donations</p>
              <p className="stats-card-number">{formatCurrency(donationStats?.totalRaised || 0)}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/20 dark:bg-white/10">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs opacity-80">
            <span>{donationStats?.totalCampaigns || 0} campaigns</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="stats-card-teal group cursor-pointer shadow-md transition-colors duration-100" onClick={() => navigate('/admin/jobs')}>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="stats-card-label">Verified Jobs</p>
              <p className="stats-card-number">{verifiedJobs}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/20 dark:bg-white/10">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs opacity-80">
            <span>{totalJobs} total postings</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className="group flex flex-col items-center gap-2.5 p-3 rounded-lg hover:bg-muted/60 transition-colors duration-100 active:scale-[0.97]"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.iconBg} transition-colors duration-100`}>
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <Card className="h-full font-sans lg:col-span-2 border-0 shadow-md transition-colors duration-100 bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>Next scheduled events</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/events')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map((event: any, index: number) => (
                  <div
                    key={event._id || index}
                    className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/admin/events')}
                  >
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <span className="text-[10px] font-semibold uppercase leading-none text-primary/70">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-base font-bold leading-tight">
                        {new Date(event.date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.title || 'Untitled Event'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {event.location || 'Location TBD'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No upcoming events</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (activity.type === 'new_member') navigate('/admin/alumni');
                      else if (activity.type === 'event') navigate('/admin/events');
                      else if (activity.type === 'donation') navigate('/admin/donations');
                    }}
                  >
                    <div className={`p-2 rounded-lg ${activity.bgColor} flex-shrink-0`}>
                      <activity.icon className={`w-4 h-4 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {getTimeAgo(activity.time)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent activity</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Jobs Approval */}
        <Card className="h-full font-sans lg:col-span-2 border-0 shadow-md transition-colors duration-100 bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  Pending Approval
                </CardTitle>
                <CardDescription>Jobs awaiting verification</CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {pendingJobs.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingJobs.length > 0 ? (
              <div className="space-y-3">
                {pendingJobs.map((job: any, index: number) => (
                  <div
                    key={job._id || index}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => navigate('/admin/jobs')}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {job.title || 'Untitled Job'}
                        </p>
                        <Badge variant="outline" className="text-xs flex-shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {job.company || 'Company not specified'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span>{job.location || 'Remote'}</span>
                        <span>•</span>
                        <span>{job.type || 'Full-time'}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-3" />
                  </div>
                ))}
                <Button
                  className="w-full mt-2 gap-2 h-9 px-4 rounded-full font-medium transition-all duration-200 bg-orange-500/10 text-orange-600 hover:bg-orange-500/25 hover:text-orange-700 border border-orange-500/20 hover:border-orange-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/30 dark:hover:text-orange-300"
                  onClick={() => navigate('/admin/jobs')}
                >
                  Review All Jobs <ArrowRight className="w-4 h-4 ml-1 text-orange-500" />
                </Button>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No pending approvals</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Donations */}
        <Card className="">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-muted-foreground" />
                  Recent Donations
                </CardTitle>
                <CardDescription>Latest contributions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/donations')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentDonors.length > 0 ? (
              <div className="space-y-3">
                {recentDonors.slice(0, 5).map((donor: any, index: number) => (
                  <div
                    key={donor._id || index}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {(donor.name || 'A')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {donor.name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {donor.campaign || 'General Fund'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(donor.amount || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTimeAgo(donor.donatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No recent donations</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
