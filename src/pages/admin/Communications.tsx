import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Send, Users, MessageSquare, Bell, TrendingUp, Eye, Calendar, Briefcase, Heart, Megaphone, Loader2 } from "lucide-react";
import { emailService, adminService, notificationService, eventService, jobService, donationService } from "@/services/ApiServices";
import { toast } from 'sonner';

export function Communications() {
  const [emailForm, setEmailForm] = useState({
    subject: "",
    body: "",
    filter: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    alumniCount: 0,
    studentCount: 0,
    donorCount: 0,
    messagesSent: 0
  });
  const [loading, setLoading] = useState(true);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);

  const handleSendEmail = async () => {
    if (!emailForm.subject || !emailForm.body || !emailForm.filter) {
      toast.error("Please fill in all fields and select recipients");
      return;
    }

    setIsSending(true);
    try {
      const response = await emailService.sendBulkEmails({
        subject: emailForm.subject,
        body: emailForm.body,
        filter: emailForm.filter,
        type: 'quick_message'
      });

      if (response?.success) {
        toast.success(response.message || "Emails sent successfully!");
      } else {
        throw new Error(response?.message || "Failed to send emails");
      }

      // Update messages sent count
      setStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + (response.data?.totalSent || 1)
      }));

      // Refresh email history to show the email send activity
      fetchEmailHistory();

      // Reset form
      setEmailForm({
        subject: "",
        body: "",
        filter: ""
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to send emails");
    } finally {
      setIsSending(false);
    }
  };

  const handleRecipientSelect = (type: string) => {
    setEmailForm(prev => ({ ...prev, filter: type }));
  };

  const handleSendCampaignEmail = async (campaignType: 'event' | 'job' | 'donation') => {
    let campaignData: any[] = [];
    let subject = "";
    let emailBody = "";

    // Determine campaign data based on type
    switch (campaignType) {
      case 'event':
        if (recentEvents.length === 0) {
          toast.error("No recent events to share");
          return;
        }
        campaignData = recentEvents;
        subject = "Upcoming Events - Alumni Network";
        break;
      case 'job':
        if (recentJobs.length === 0) {
          toast.error("No recent jobs to share");
          return;
        }
        campaignData = recentJobs;
        subject = "New Job Opportunities - Alumni Network";
        break;
      case 'donation':
        if (recentDonations.length === 0) {
          toast.error("No recent donations/campaigns to share");
          return;
        }
        campaignData = recentDonations;
        subject = "Support Our Initiatives - Alumni Network";
        break;
    }

    try {
      setSendingCampaign(campaignType);

      // Create email content based on campaign type
      if (campaignType === 'event') {
        const eventsList = recentEvents.map(event =>
          `<div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${event.location || 'TBA'}</p>
            <p style="margin: 10px 0 0 0; color: #555;">${event.description}</p>
          </div>`
        ).join('');

        emailBody = `
          <h2 style="color: #333; margin-bottom: 20px;">Upcoming Events</h2>
          <p style="color: #666; margin-bottom: 20px;">Here are the latest events happening in our alumni network:</p>
          ${eventsList}
          <p style="margin-top: 30px; color: #666;">We look forward to seeing you there!</p>
        `;
      } else if (campaignType === 'job') {
        const jobsList = recentJobs.map(job =>
          `<div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${job.title}</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${job.company}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${job.location}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${job.jobType}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Experience:</strong> ${job.experienceRequired}</p>
            ${job.salary ? `<p style="margin: 5px 0; color: #666;"><strong>Salary:</strong> ₹${job.salary.toLocaleString()}</p>` : ''}
            <p style="margin: 10px 0 0 0; color: #555;">${job.description}</p>
          </div>`
        ).join('');

        emailBody = `
          <h2 style="color: #333; margin-bottom: 20px;">New Job Opportunities</h2>
          <p style="color: #666; margin-bottom: 20px;">Check out these latest job opportunities from our alumni network:</p>
          ${jobsList}
          <p style="margin-top: 30px; color: #666;">Best of luck with your applications!</p>
        `;
      } else if (campaignType === 'donation') {
        const donationsList = recentDonations.map(donation =>
          `<div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${donation.name}</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Goal:</strong> ₹${donation.goal?.toLocaleString()}</p>
            ${donation.raisedAmount ? `<p style="margin: 5px 0; color: #666;"><strong>Raised:</strong> ₹${donation.raisedAmount?.toLocaleString()}</p>` : ''}
            <p style="margin: 10px 0 0 0; color: #555;">${donation.description || ''}</p>
          </div>`
        ).join('');

        emailBody = `
          <h2 style="color: #333; margin-bottom: 20px;">Support Our Initiatives</h2>
          <p style="color: #666; margin-bottom: 20px;">Help us make a difference. Here are ongoing campaigns:</p>
          ${donationsList}
          <p style="margin-top: 30px; color: #666;">Your contribution matters!</p>
        `;
      }

      const response = await emailService.sendBulkEmails({
        subject,
        body: emailBody,
        filter: "all",
        type: campaignType
      });

      if (response?.success) {
        toast.success(`${campaignType.charAt(0).toUpperCase() + campaignType.slice(1)} notifications sent successfully!`);
        fetchEmailHistory();
      } else {
        throw new Error(response?.message || "Failed to send campaign emails");
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to send ${campaignType} emails`);
    } finally {
      setSendingCampaign(null);
    }
  };

  const handleSendEventEmails = async () => {
    if (recentEvents.length === 0) {
      toast.error("No recent events to share");
      return;
    }

    try {
      setSendingCampaign('event');

      // Create email content with all recent events
      const eventsList = recentEvents.map(event =>
        `<div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #667eea;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${event.title}</h3>
          <p style="margin: 5px 0; color: #666;"><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${event.location || 'TBA'}</p>
          <p style="margin: 10px 0 0 0; color: #555;">${event.description}</p>
        </div>`
      ).join('');

      const emailBody = `
        <h2 style="color: #333; margin-bottom: 20px;">Upcoming Events</h2>
        <p style="color: #666; margin-bottom: 20px;">Here are the latest events happening in our alumni network:</p>
        ${eventsList}
        <p style="margin-top: 30px; color: #666;">We look forward to seeing you there!</p>
      `;

      const response = await emailService.sendBulkEmails({
        subject: "Upcoming Events - Alumni Network",
        body: emailBody,
        filter: "all",
        type: "event"
      });

      if (response?.success) {
        toast.success("Event notifications sent successfully!");
        fetchEmailHistory();
      } else {
        throw new Error(response?.message || "Failed to send event emails");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send event emails");
    } finally {
      setSendingCampaign(null);
    }
  };

  const handleSendJobEmails = async () => {
    if (recentJobs.length === 0) {
      toast.error("No recent jobs to share");
      return;
    }

    try {
      setSendingCampaign('job');

      // Create email content with all recent jobs
      const jobsList = recentJobs.map(job =>
        `<div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #667eea;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${job.title}</h3>
          <p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${job.company}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Location:</strong> ${job.location}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${job.jobType}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Experience:</strong> ${job.experienceRequired}</p>
          ${job.salary ? `<p style="margin: 5px 0; color: #666;"><strong>Salary:</strong> ₹${job.salary.toLocaleString()}</p>` : ''}
          <p style="margin: 10px 0 0 0; color: #555;">${job.description}</p>
        </div>`
      ).join('');

      const emailBody = `
        <h2 style="color: #333; margin-bottom: 20px;">New Job Opportunities</h2>
        <p style="color: #666; margin-bottom: 20px;">Check out these latest job opportunities from our alumni network:</p>
        ${jobsList}
        <p style="margin-top: 30px; color: #666;">Best of luck with your applications!</p>
      `;

      const response = await emailService.sendBulkEmails({
        subject: "New Job Opportunities - Alumni Network",
        body: emailBody,
        filter: "all",
        type: "job"
      });

      if (response?.success) {
        toast.success("Job notifications sent successfully!");
        fetchEmailHistory();
      } else {
        throw new Error(response?.message || "Failed to send job emails");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send job emails");
    } finally {
      setSendingCampaign(null);
    }
  };

  // Fetch email history function (can be called to refresh)
  const fetchEmailHistory = async () => {
    try {
      setEmailHistoryLoading(true);
      const response = await emailService.getEmailHistory({
        page: 1,
        limit: 20
      });

      if (response?.success && response?.data) {
        setEmailHistory(response.data.emails || []);
      }
    } catch (error) {
      // Don't show error toast for background fetch
    } finally {
      setEmailHistoryLoading(false);
    }
  };

  // Fetch stats and notifications on component mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Fetch all users to calculate stats - using adminService for admin
        const usersResponse = await adminService.getAllUsers();

        if (usersResponse.success && usersResponse.data) {
          const users = usersResponse.data;

          // Calculate stats from users - using 'role' field instead of 'userType'
          const alumniCount = users.filter((u: any) => u.role?.toLowerCase() === 'alumni').length;
          const studentCount = users.filter((u: any) => u.role?.toLowerCase() === 'student').length;
          const donorCount = users.filter((u: any) => u.role?.toLowerCase() === 'donor').length;

          setStats({
            totalUsers: users.length,
            alumniCount,
            studentCount,
            donorCount,
            messagesSent: 0 // This would need email history from backend
          });
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    const fetchRecentEventsAndJobs = async () => {
      try {
        const [eventsRes, jobsRes, donationsRes] = await Promise.all([
          eventService.getEvents(),
          jobService.getAllJobs(),
          adminService.getAllDonations().catch(() => ({ success: false, data: [] }))
        ]);

        // Calculate start of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        if (eventsRes?.success && eventsRes?.data) {
          // Filter events for current month (and future)
          const events = Array.isArray(eventsRes.data)
            ? eventsRes.data.filter((e: any) => new Date(e.date) >= startOfMonth)
            : [];
          setRecentEvents(events.slice(0, 5));
        }

        if (jobsRes?.success && jobsRes?.data) {
          // Filter verified jobs and sort by date (newest first)
          const jobs = Array.isArray(jobsRes.data)
            ? jobsRes.data
              .filter((j: any) => j.isVerified)
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            : [];
          setRecentJobs(jobs.slice(0, 5));
        }

        if (donationsRes?.success && donationsRes?.data) {
          // Filter pending campaigns (incomplete)
          const donations = Array.isArray(donationsRes.data)
            ? donationsRes.data.filter((d: any) => {
              const raised = d.raised || d.raisedAmount || 0;
              const goal = d.goal || 1;
              return raised < goal;
            })
            : [];
          setRecentDonations(donations.slice(0, 5));
        }
      } catch (error) {
      }
    };

    fetchStats();
    fetchEmailHistory();
    fetchRecentEventsAndJobs();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-muted/60" />
          <Skeleton className="h-4 w-80 bg-muted/60" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4 bg-card border border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-20 bg-muted/60" />
                  <Skeleton className="h-8 w-16 bg-muted/60" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-card border border-border/50 p-6 space-y-4">
              <Skeleton className="h-12 w-12 rounded-xl bg-muted/60" />
              <Skeleton className="h-5 w-32 bg-muted/60" />
              <Skeleton className="h-20 w-full rounded-lg bg-muted/60" />
              <Skeleton className="h-10 w-full rounded-lg bg-muted/60" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Communications</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Manage newsletters, announcements, and alumni communications.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 animate-slide-up">
        <div className="stats-card-pink">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Total Users</p>
              <p className="stats-card-number">{loading ? '...' : stats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                <Users className="w-3 h-3" />
                All registered users
              </p>
            </div>
            <Mail className="stats-card-icon" />
          </div>
        </div>

        <div className="stats-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Alumni</p>
              <p className="stats-card-number">{loading ? '...' : stats.alumniCount.toLocaleString()}</p>
              <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                <Users className="w-3 h-3" />
                Active alumni
              </p>
            </div>
            <Send className="stats-card-icon" />
          </div>
        </div>

        <div className="stats-card-teal">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Students</p>
              <p className="stats-card-number">{loading ? '...' : stats.studentCount.toLocaleString()}</p>
              <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                <Users className="w-3 h-3" />
                Current students
              </p>
            </div>
            <Eye className="stats-card-icon" />
          </div>
        </div>

        <div className="stats-card-orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Donors</p>
              <p className="stats-card-number">{loading ? '...' : stats.donorCount.toLocaleString()}</p>
              <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                <MessageSquare className="w-3 h-3" />
                Active donors
              </p>
            </div>
            <MessageSquare className="stats-card-icon" />
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
      <Card className="bento-card gradient-surface border-card-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Email Campaigns
          </CardTitle>
          <CardDescription>
            Send bulk notifications to all users about events, jobs, and donation campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Event Campaign */}
            <div className="rounded-2xl p-5 bg-blue-500/15 border border-blue-500/30 hover:border-blue-500/50 transition-colors duration-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-blue-950 dark:text-blue-50">Events</h3>
              </div>

              <div className="flex-1 min-h-[80px]">
                {recentEvents.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2 font-medium text-blue-900/70 dark:text-blue-100/70">{recentEvents.length} upcoming event(s):</p>
                      <ul className="space-y-1 text-xs">
                        {recentEvents.slice(0, 2).map((event, idx) => (
                          <li key={idx} className="truncate">• {event.title}</li>
                        ))}
                        {recentEvents.length > 2 && <li className="text-muted-foreground/70">+ {recentEvents.length - 2} more</li>}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No upcoming events</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-blue-500/20">
                <Button
                  className="w-full gap-2 rounded-full font-medium transition-all duration-200 bg-blue-500/10 text-blue-600 hover:bg-blue-500/25 hover:text-blue-700 border border-blue-500/20 hover:border-blue-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:hover:text-blue-300"
                  onClick={() => handleSendCampaignEmail('event')}
                  disabled={recentEvents.length === 0 || sendingCampaign !== null}
                >
                  {sendingCampaign === 'event' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingCampaign === 'event' ? "Sending..." : "Send Campaign"}
                </Button>
              </div>
            </div>

            {/* Job Campaign */}
            <div className="rounded-2xl p-5 bg-green-500/15 border border-green-500/30 hover:border-green-500/50 transition-colors duration-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-green-950 dark:text-green-50">Jobs</h3>
              </div>

              <div className="flex-1 min-h-[80px]">
                {recentJobs.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2 font-medium text-green-900/70 dark:text-green-100/70">{recentJobs.length} new job(s):</p>
                      <ul className="space-y-1 text-xs">
                        {recentJobs.slice(0, 2).map((job, idx) => (
                          <li key={idx} className="truncate">• {job.title}</li>
                        ))}
                        {recentJobs.length > 2 && <li className="text-muted-foreground/70">+ {recentJobs.length - 2} more</li>}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No new job openings</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-green-500/20">
                <Button
                  className="w-full gap-2 rounded-full font-medium transition-all duration-200 bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
                  onClick={() => handleSendCampaignEmail('job')}
                  disabled={recentJobs.length === 0 || sendingCampaign !== null}
                >
                  {sendingCampaign === 'job' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingCampaign === 'job' ? "Sending..." : "Send Campaign"}
                </Button>
              </div>
            </div>

            {/* Donation Campaign */}
            <div className="rounded-2xl p-5 bg-blue-500/15 border border-blue-500/30 hover:border-blue-500/50 transition-colors duration-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg text-blue-950 dark:text-blue-50">Donations</h3>
              </div>

              <div className="flex-1 min-h-[80px]">
                {recentDonations.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2 font-medium text-blue-900/70 dark:text-blue-100/70">{recentDonations.length} pending campaign(s):</p>
                      <ul className="space-y-1 text-xs">
                        {recentDonations.slice(0, 2).map((donation, idx) => (
                          <li key={idx} className="truncate">• {donation.name || donation.description}</li>
                        ))}
                        {recentDonations.length > 2 && <li className="text-muted-foreground/70">+ {recentDonations.length - 2} more</li>}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No pending campaigns</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-blue-500/20">
                <Button
                  className="w-full gap-2 rounded-full font-medium transition-all duration-200 bg-blue-500/10 text-blue-600 hover:bg-blue-500/25 hover:text-blue-700 border border-blue-500/20 hover:border-blue-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:hover:text-blue-300"
                  onClick={() => handleSendCampaignEmail('donation')}
                  disabled={recentDonations.length === 0 || sendingCampaign !== null}
                >
                  {sendingCampaign === 'donation' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sendingCampaign === 'donation' ? "Sending..." : "Send Campaign"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card >

      {/* Main Content */}
      < div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6" >
        {/* Quick Compose */}
        < Card className="bento-card gradient-surface border-card-border/50 lg:col-span-2" >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Quick Email
            </CardTitle>
            <CardDescription>
              Send a quick update to your alumni network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Input
                placeholder="Enter email subject..."
                className="mt-1"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Message</label>
              <Textarea
                placeholder="Write your message..."
                className="mt-1 min-h-[100px]"
                value={emailForm.body}
                onChange={(e) => setEmailForm(prev => ({ ...prev, body: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Recipients</label>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecipientSelect("alumni")}
                  className={`text-xs sm:text-sm ${emailForm.filter === "alumni" ? "bg-primary/10 border-primary" : ""}`}
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Alumni
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRecipientSelect("student")}
                  className={`text-xs sm:text-sm ${emailForm.filter === "student" ? "bg-primary/10 border-primary" : ""}`}
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Students
                </Button>
              </div>
              {emailForm.filter && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: {emailForm.filter}
                </p>
              )}
            </div>
            <Button
              className="w-full gap-2 rounded-full font-medium transition-all duration-200 bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
              onClick={handleSendEmail}
              disabled={isSending}
            >
              <Send className="h-4 w-4" />
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </CardContent>
        </Card >

        {/* Email History */}
        < Card className="bento-card gradient-surface border-card-border/50" >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Recent Mails
            </CardTitle>
            <CardDescription>
              Latest emails sent to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailHistoryLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading email history...</p>
              </div>
            ) : emailHistory.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No emails sent yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {emailHistory.map((email, index) => {
                  // Format timestamp
                  const formatTimestamp = (timestamp: string) => {
                    const date = new Date(timestamp);
                    const now = new Date();
                    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

                    if (diffInSeconds < 60) return 'just now';
                    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
                    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
                    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

                    return date.toLocaleDateString();
                  };

                  // Get email type badge color
                  const getTypeBadgeClass = (type: string) => {
                    switch (type) {
                      case 'event': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                      case 'job': return 'bg-green-500/10 text-green-500 border-green-500/20';
                      case 'donation': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
                      case 'quick_message': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
                      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
                    }
                  };

                  return (
                    <div
                      key={email._id || email.id}
                      className="p-4 rounded-lg border border-card-border/50 transition-smooth animate-fade-in bg-gradient-to-br from-card/50 to-transparent"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{email.subject}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent to: <span className="font-medium capitalize">{email.to}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span className="text-green-500">✓ {email.totalSent}</span>
                            {email.totalFailed > 0 && (
                              <span className="text-red-500">✗ {email.totalFailed}</span>
                            )}
                            <span>•</span>
                            <span>{formatTimestamp(email.createdAt)}</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs whitespace-nowrap ${getTypeBadgeClass(email.type)}`}
                        >
                          {email.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card >
      </div >
    </div >
  );
}
