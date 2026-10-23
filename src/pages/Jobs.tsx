import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { InfoTag } from "@/components/ui/InfoTag";
import { connectionService, jobService } from "@/services/ApiServices";
import PostJobDialog from "@/components/PostJobDialog";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { UserProfileDialog } from "@/components/profile/UserProfileDialog";
import {
  Briefcase,
  MapPin,
  IndianRupee,
  Users,
  Edit,
  Trash2,
  Eye,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Plus,
  MessageCircle,
  UserPlus,
  UserCheck,
  Loader2
} from "lucide-react";
import { StatusButton } from "@/components/ui/status-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


interface Job {
  _id: string;
  title: string;
  description: string;
  location: string;
  company: string;
  jobType: string;
  category: string;
  experienceRequired: string;
  salary: number;
  isVerified: boolean;
  applicants?: any[];
  postedBy?: string;
  createdAt: string;
}

export default function Jobs() {
  const queryClient = useQueryClient();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [applicantsDialogOpen, setApplicantsDialogOpen] = useState(false);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [applicantConnectionStatuses, setApplicantConnectionStatuses] = useState<Record<string, any>>({});
  const [loadingApplicantConnections, setLoadingApplicantConnections] = useState<Record<string, boolean>>({});
  const [applicantProfileId, setApplicantProfileId] = useState<string | null>(null);
  const [applicantChatId, setApplicantChatId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("new");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);
  const [jobDetailsData, setJobDetailsData] = useState<Job | null>(null);
  const { confirm, Dialog: ConfirmDialogEl } = useConfirm();

  // Get current user ID from localStorage
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    setCurrentUserId(userId);
  }, []);

  // Fetch All Jobs
  const { data: allJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: [CACHE_KEYS.USER_JOBS],
    queryFn: async () => {
      const response = await jobService.getAllJobs();
      if (response.success) {
        return (Array.isArray(response.data) ? response.data : []).filter((job: Job) => job.isVerified);
      }
      throw new Error(response.message || "Failed to fetch jobs");
    },
    staleTime: CACHE_TTL.MEDIUM,
  });

  // Fetch Posted Jobs
  const { data: postedJobs = [], isLoading: loadingPosted, refetch: refetchPostedJobs } = useQuery({
    queryKey: ['myPostedJobs'],
    queryFn: async () => {
      const response = await jobService.getMyPostedJobs();
      if (response.success) {
        return Array.isArray(response.data) ? response.data : [];
      }
      throw new Error(response.message || "Failed to fetch posted jobs");
    },
    enabled: !!currentUserId,
    staleTime: CACHE_TTL.MEDIUM,
  });

  const loading = loadingJobs || loadingPosted;

  // Optimistic Apply Mutation
  const applyMutation = useMutation({
    mutationFn: (jobId: string) => jobService.applyForJob(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: [CACHE_KEYS.USER_JOBS] });
      const previousJobs = queryClient.getQueryData<Job[]>([CACHE_KEYS.USER_JOBS]);

      if (previousJobs && currentUserId) {
        queryClient.setQueryData<Job[]>([CACHE_KEYS.USER_JOBS], (old) =>
          old?.map(job =>
            job._id === jobId
              ? { ...job, applicants: [...(job.applicants || []), { _id: currentUserId }] }
              : job
          )
        );
      }
      return { previousJobs };
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Application submitted!", { description: "Your application has been submitted successfully." });
      } else {
        throw new Error(response.message);
      }
    },
    onError: (error: any, variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData([CACHE_KEYS.USER_JOBS], context.previousJobs);
      }
      toast.error("Failed to apply", { description: error.message || "Please try again." });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.USER_JOBS] });
    },
  });

  // Optimistic Unapply Mutation
  const unapplyMutation = useMutation({
    mutationFn: (jobId: string) => jobService.unapplyForJob(jobId),
    onMutate: async (jobId) => {
      await queryClient.cancelQueries({ queryKey: [CACHE_KEYS.USER_JOBS] });
      const previousJobs = queryClient.getQueryData<Job[]>([CACHE_KEYS.USER_JOBS]);

      if (previousJobs && currentUserId) {
        queryClient.setQueryData<Job[]>([CACHE_KEYS.USER_JOBS], (old) =>
          old?.map(job =>
            job._id === jobId
              ? {
                ...job,
                applicants: (job.applicants || []).filter((a: any) => {
                  const id = typeof a === 'string' ? a : a._id || a.id;
                  return id !== currentUserId;
                })
              }
              : job
          )
        );
      }
      return { previousJobs };
    },
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Application withdrawn", { description: "Your application has been withdrawn." });
      } else {
        throw new Error(response.message);
      }
    },
    onError: (error: any, variables, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData([CACHE_KEYS.USER_JOBS], context.previousJobs);
      }
      toast.error("Failed to withdraw", { description: error.message || "Please try again." });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.USER_JOBS] });
    },
  });

  const handleApply = (jobId: string) => {
    if (!currentUserId) {
      toast.error("Please log in to apply for jobs");
      return;
    }
    applyMutation.mutate(jobId);
  };

  const handleUnapply = async (jobId: string) => {
    if (!currentUserId) {
      toast.error("Please log in first");
      return;
    }
    const ok = await confirm({
      title: "Withdraw Application?",
      description: "Are you sure you want to withdraw your application for this job? You can re-apply later.",
      confirmText: "Withdraw",
      variant: "warning",
    });
    if (ok) unapplyMutation.mutate(jobId);
  };

  const handleEdit = (job: Job) => {
    setSelectedJob(job);
    setEditDialogOpen(true);
  };

  const handleDelete = async (jobId: string, jobTitle?: string) => {
    const ok = await confirm({
      title: "Delete Job Posting?",
      itemName: jobTitle,
      description: `This will permanently remove the job posting "${jobTitle || 'this job'}". Applicants will no longer see it.`,
      confirmText: "Delete Job",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const response = await jobService.deleteJob(jobId);
      if (response.success) {
        toast.success("Job deleted", { description: "The job posting has been removed." });
        refetchPostedJobs();
      } else {
        toast.error("Failed to delete job", { description: response.message });
      }
    } catch (error: any) {
      toast.error("Failed to delete job", { description: error.message });
    }
  };

  const viewApplicants = async (job: Job) => {
    setSelectedJob(job);
    setApplicantsDialogOpen(true);

    try {
      setLoadingApplicants(true);
      const response = await jobService.getJobApplicants(job._id);

      if (response.success) {
        const applicantsData = Array.isArray(response.data) ? response.data : [];
        setApplicants(applicantsData);
        const statuses = await Promise.all(
          applicantsData.map(async (applicant: any) => {
            const applicantId = applicant._id || applicant.id;
            if (!applicantId) return null;

            try {
              const statusResponse = await connectionService.getConnectionStatus(applicantId);
              return [applicantId, statusResponse.data || { status: "none" }] as const;
            } catch {
              return [applicantId, { status: "none" }] as const;
            }
          })
        );
        setApplicantConnectionStatuses(
          Object.fromEntries(statuses.filter((entry): entry is readonly [string, any] => entry !== null))
        );
      } else {
        toast.error("Failed to load applicants", { description: response.message });
        setApplicants([]);
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to load applicants" });
      setApplicants([]);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleApplicantConnect = async (applicantId: string) => {
    try {
      setLoadingApplicantConnections(prev => ({ ...prev, [applicantId]: true }));
      const response = await connectionService.sendConnectionRequest(applicantId);
      if (!response.success) {
        throw new Error(response.message || "Failed to send connection request");
      }

      setApplicantConnectionStatuses(prev => ({
        ...prev,
        [applicantId]: { ...prev[applicantId], status: "pending", isRequester: true },
      }));
      toast.success("Connection request sent!");
    } catch (error: any) {
      toast.error("Failed to send connection request", {
        description: error.message || "Please try again.",
      });
    } finally {
      setLoadingApplicantConnections(prev => ({ ...prev, [applicantId]: false }));
    }
  };

  const handleApplicantProfile = (applicantId: string) => {
    setApplicantProfileId(applicantId);
    setProfileDialogOpen(true);
  };

  const handleApplicantMessage = (applicantId: string) => {
    setApplicantChatId(applicantId);
    setChatDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const hasApplied = (job: Job) => {
    if (!currentUserId || !job.applicants || !Array.isArray(job.applicants)) {
      return false;
    }
    const applied = job.applicants.some((applicant: any) => {
      const applicantId = typeof applicant === 'string' ? applicant : applicant._id || applicant.id;
      return applicantId === currentUserId;
    });
    return applied;
  };

  const handleViewDetails = (job: Job) => {
    setJobDetailsData(job);
    setJobDetailsOpen(true);
  };

  // Data-only skeleton - static UI renders immediately  
  const JobCardsSkeleton = () => (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 space-y-3 sm:space-y-4 animate-in fade-in slide-in- duration-300"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 sm:h-5 w-3/4" />
              <Skeleton className="h-3 sm:h-4 w-1/2" />
            </div>
            <Skeleton className="h-5 sm:h-6 w-14 sm:w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 sm:h-6 w-20 sm:w-24 rounded-full" />
          <div className="space-y-2 sm:space-y-3">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
                <Skeleton className="h-3 sm:h-4 w-20 sm:w-28" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1 sm:pt-2">
            <Skeleton className="h-8 sm:h-9 flex-1 rounded-lg" />
            <Skeleton className="h-8 sm:h-9 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );

  // Filter jobs based on application status
  const appliedJobs = allJobs.filter(job => hasApplied(job));
  const newJobs = allJobs.filter(job => !hasApplied(job));

  // Helper function to render job cards
  const renderJobCards = (jobs: Job[], emptyMessage: string, emptySubMessage: string) => {
    if (jobs.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12">
            <Briefcase className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">{emptyMessage}</h3>
            <p className="text-sm text-muted-foreground text-center">
              {emptySubMessage}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Card key={job._id} className="overflow-hidden border-border/30 bg-card flex flex-col h-full group hover:shadow-lg transition-colors duration-100">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex justify-between items-start gap-3">
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1 font-sans">
                  {job.title}
                </CardTitle>
                {job.isVerified && (
                  <Badge className="bg-green-500/15 text-green-600 border-green-200/50 text-xs shrink-0">✓ Verified</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col px-5 pb-5">
              {/* Company */}
              <p className="text-sm font-medium text-muted-foreground mb-4">
                {job.company || 'Company Not Specified'}
              </p>

              {/* Category */}
              {job.category && (
                <Badge variant="secondary" className="text-xs font-medium w-fit mb-4">
                  {job.category}
                </Badge>
              )}

              {/* Job Details - Stacked */}
              <div className="space-y-3 text-sm flex-1 mb-4">
                {job.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    <span className="text-foreground font-medium">{job.location}</span>
                  </div>
                )}
                {job.salary && (
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-foreground font-medium">₹{job.salary.toLocaleString()}/yr</span>
                  </div>
                )}
                {job.jobType && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="text-foreground font-medium">{job.jobType}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="text-foreground font-medium">{new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons - Colorful Pill Style */}
              <div className="mt-auto pt-4 flex gap-2">
                <Button
                  onClick={() => handleViewDetails(job)}
                  variant="ghost"
                  size="sm"
                  className="flex-1 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/25 hover:text-blue-700 border border-blue-500/20 hover:border-blue-500/40 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:hover:text-blue-300"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Details
                </Button>
                {hasApplied(job) ? (
                  <Button
                    onClick={() => handleUnapply(job._id)}
                    size="sm"
                    variant="ghost"
                    className="flex-1 rounded-full bg-green-500/10 text-green-600 hover:bg-red-500/25 hover:text-red-700 border border-green-500/20 hover:border-red-500/40 group/applybtn transition-all duration-200 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-red-500/30 dark:hover:text-red-300"
                  >
                    <span className="flex items-center group-hover/applybtn:hidden">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Applied
                    </span>
                    <span className="hidden items-center group-hover/applybtn:flex">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Withdraw
                    </span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleApply(job._id)}
                    size="sm"
                    variant="ghost"
                    className="flex-1 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Apply
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header - Always visible */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1 sm:mb-2">Job Opportunities</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse and apply for jobs or manage your postings
          </p>
        </div>
        <Button onClick={() => setPostDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Post a Job
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new" className="text-xs sm:text-sm">New Jobs {!loading && `(${newJobs.length})`}</TabsTrigger>
          <TabsTrigger value="applied" className="text-xs sm:text-sm">Applied Jobs {!loading && `(${appliedJobs.length})`}</TabsTrigger>
          <TabsTrigger value="posted" className="text-xs sm:text-sm">My Posted {!loading && `(${postedJobs.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4 sm:mt-6">
          {loading ? (
            <JobCardsSkeleton />
          ) : (
            renderJobCards(newJobs, "No New Jobs Available", "There are no new job postings at the moment. Check back later!")
          )}
        </TabsContent>

        <TabsContent value="applied" className="mt-4 sm:mt-6">
          {loading ? (
            <JobCardsSkeleton />
          ) : (
            renderJobCards(appliedJobs, "No Applied Jobs", "You haven't applied to any jobs yet. Browse the New Jobs tab to find opportunities!")
          )}
        </TabsContent>

        <TabsContent value="posted" className="mt-6">
          {postedJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Jobs Posted Yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven't posted any jobs yet. Start by creating your first job posting.
                </p>
                <Button onClick={() => setPostDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {postedJobs.map((job) => (
                <Card key={job._id} className="bento-card hover:shadow-md border-card-border/50 hover-lift flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2 min-h-[3.5rem]">{job.title}</CardTitle>
                      <div className="flex gap-2 flex-shrink-0">
                        {job.isVerified ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{job.company}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {job.description}
                    </p>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IndianRupee className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>₹{job.salary.toLocaleString()}/year</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>Posted {formatDate(job.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{job.applicants?.length || 0} Applicants</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{job.jobType}</Badge>
                      <Badge variant="outline">{job.experienceRequired}</Badge>
                    </div>

                    <div className="flex gap-2 pt-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => viewApplicants(job)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Applicants
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(job)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(job._id, job.title)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Post Job Dialog */}
      <PostJobDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        onSuccess={refetchPostedJobs}
      />

      {/* Edit Job Dialog */}
      <PostJobDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={refetchPostedJobs}
        jobData={selectedJob ? {
          id: selectedJob._id,
          title: selectedJob.title,
          description: selectedJob.description,
          location: selectedJob.location,
          company: selectedJob.company,
          jobType: selectedJob.jobType,
          category: selectedJob.category,
          experienceRequired: selectedJob.experienceRequired,
          salary: selectedJob.salary,
        } : undefined}
      />



      {/* Applicants Dialog */}
      <Dialog open={applicantsDialogOpen} onOpenChange={setApplicantsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Job Applicants</DialogTitle>
            <DialogDescription>
              {selectedJob?.title} - {applicants.length} applicant(s)
            </DialogDescription>
          </DialogHeader>

          {loadingApplicants ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No applicants yet
            </div>
          ) : (
            <div className="space-y-4">
              {applicants.map((applicant, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <h4 className="font-semibold">{applicant.name}</h4>
                        <p className="text-sm text-muted-foreground">{applicant.email}</p>
                        {applicant.resume && (
                          <a
                            href={applicant.resume}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-2 inline-block"
                          >
                            View Resume
                          </a>
                        )}
                      </div>
                      {(() => {
                        const applicantId = applicant._id || applicant.id;
                        const connectionStatus = applicantConnectionStatuses[applicantId]?.status;
                        const isLoading = loadingApplicantConnections[applicantId];

                        if (!applicantId) return null;

                        return connectionStatus === "accepted" ? (
                          <div className="flex shrink-0 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApplicantProfile(applicantId)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Profile
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApplicantMessage(applicantId)}
                              className="gap-2"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Message
                            </Button>
                          </div>
                        ) : connectionStatus === "pending" ? (
                          <Button variant="outline" size="sm" disabled className="shrink-0 gap-2">
                            <UserCheck className="h-4 w-4" />
                            {applicantConnectionStatuses[applicantId]?.isRequester
                              ? "Request Sent"
                              : "Request Pending"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleApplicantConnect(applicantId)}
                            disabled={isLoading}
                            className="shrink-0 gap-2"
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4" />
                            )}
                            Connect
                          </Button>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UserProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={applicantProfileId}
        onMessageClick={handleApplicantMessage}
      />

      <ChatDialog
        open={chatDialogOpen}
        onOpenChange={setChatDialogOpen}
        userId={applicantChatId || undefined}
      />

      {/* Job Details Dialog */}
      <Dialog open={jobDetailsOpen} onOpenChange={setJobDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{jobDetailsData?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {jobDetailsData?.company}
            </DialogDescription>
          </DialogHeader>

          {jobDetailsData && (
            <div className="space-y-6">
              {/* Status Badge */}
              {jobDetailsData.isVerified && (
                <Badge variant="default" className="flex items-center gap-1 w-fit">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </Badge>
              )}

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Job Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{jobDetailsData.description}</p>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="font-semibold">{jobDetailsData.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <IndianRupee className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Salary</p>
                      <p className="font-semibold">₹{jobDetailsData.salary.toLocaleString()}/year</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Job Type</p>
                      <p className="font-semibold">{jobDetailsData.jobType}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <p className="font-semibold">{jobDetailsData.category}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Experience Required</p>
                      <p className="font-semibold">{jobDetailsData.experienceRequired}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Posted On</p>
                      <p className="font-semibold">{formatDate(jobDetailsData.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  className={`flex-1 ${hasApplied(jobDetailsData) ? ' hover: hover: text-white font-semibold shadow-lg' : ''}`}
                  onClick={() => {
                    if (hasApplied(jobDetailsData)) {
                      handleUnapply(jobDetailsData._id);
                    } else {
                      handleApply(jobDetailsData._id);
                    }
                    setJobDetailsOpen(false);
                  }}
                >
                  {hasApplied(jobDetailsData) ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Applied - Click to Withdraw
                    </>
                  ) : (
                    "Apply Now"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog (delete, withdraw) */}
      {ConfirmDialogEl}
    </div>
  );
}

