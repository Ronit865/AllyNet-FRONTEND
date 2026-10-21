import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/ApiServices";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Flag,
    Shield,
    ShieldOff,
    AlertTriangle,
    Search,
    Loader2,
    Ban,
    CheckCircle,
    XCircle,
    Clock,
    User,
} from "lucide-react";
import { toast } from 'sonner';

interface Report {
    _id: string;
    post: {
        _id: string;
        content: string;
        category: string;
        createdAt: string;
        author: {
            _id: string;
            name: string;
            email: string;
            avatar?: string;
            reportCount: number;
            banStatus: string;
        };
    };
    reporter: {
        _id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    reason: string;
    description?: string;
    status: string;
    createdAt: string;
}

interface ReportedUser {
    _id: string;
    reportCount: number;
    reports: { reason: string; createdAt: string; postId: string }[];
    user: {
        name: string;
        email: string;
        avatar?: string;
        banStatus: string;
        banReason?: string;
        banExpiresAt?: string;
    };
}

export function Reports() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ReportedUser | null>(null);
    const [banType, setBanType] = useState<"temp_banned" | "suspended">("temp_banned");
    const [banDuration, setBanDuration] = useState("7");
    const [banReason, setBanReason] = useState("");

    const queryClient = useQueryClient();

    // Fetch reports
    const { data: reportsResponse, isLoading: reportsLoading } = useQuery({
        queryKey: ["admin-reports", statusFilter],
        queryFn: async () => {
            const params = statusFilter !== "all" ? { status: statusFilter } : {};
            return await adminService.getReports(params);
        },
    });

    // Fetch reported users
    const { data: usersResponse, isLoading: usersLoading } = useQuery({
        queryKey: ["reported-users"],
        queryFn: async () => {
            return await adminService.getReportedUsers();
        },
    });

    // Ban user mutation
    const banMutation = useMutation({
        mutationFn: async (data: { userId: string; type: "temp_banned" | "suspended"; duration?: number; reason?: string }) => {
            return await adminService.banUser(data.userId, { type: data.type, duration: data.duration, reason: data.reason });
        },
        onSuccess: () => {
            toast.success("User banned successfully");
            setBanDialogOpen(false);
            setSelectedUser(null);
            queryClient.invalidateQueries({ queryKey: ["reported-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to ban user");
        },
    });

    // Unban user mutation
    const unbanMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await adminService.unbanUser(userId);
        },
        onSuccess: () => {
            toast.success("User unbanned successfully");
            queryClient.invalidateQueries({ queryKey: ["reported-users"] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to unban user");
        },
    });

    // Dismiss report mutation
    const dismissMutation = useMutation({
        mutationFn: async (reportId: string) => {
            return await adminService.dismissReport(reportId);
        },
        onSuccess: () => {
            toast.success("Report dismissed");
            queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
        },
    });

    const reports: Report[] = Array.isArray(reportsResponse?.data?.reports) ? reportsResponse.data.reports : [];
    const reportedUsers: ReportedUser[] = Array.isArray(usersResponse?.data) ? usersResponse.data : [];

    const filteredReports = reports.filter((report) => {
        const matchesSearch =
            report.post?.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.post?.author?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.reporter?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.reason?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const handleBanUser = (user: ReportedUser) => {
        setSelectedUser(user);
        setBanDialogOpen(true);
        setBanReason("");
        setBanType("temp_banned");
        setBanDuration("7");
    };

    const handleBanSubmit = () => {
        if (!selectedUser) return;
        banMutation.mutate({
            userId: selectedUser._id,
            type: banType,
            duration: banType === "temp_banned" ? parseInt(banDuration) : undefined,
            reason: banReason || undefined,
        });
    };

    const getBanStatusBadge = (status: string) => {
        switch (status) {
            case "suspended":
                return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Suspended</Badge>;
            case "temp_banned":
                return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Temp Banned</Badge>;
            default:
                return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
        }
    };

    const getReasonBadge = (reason: string) => {
        const colors: Record<string, string> = {
            spam: "bg-yellow-500/20 text-yellow-600",
            harassment: "bg-red-500/20 text-red-500",
            inappropriate: "bg-orange-500/20 text-orange-500",
            misinformation: "bg-blue-500/20 text-blue-500",
            abuse: "bg-rose-500/20 text-rose-500",
            other: "bg-gray-500/20 text-gray-500",
        };
        return <Badge className={colors[reason] || colors.other}>{reason}</Badge>;
    };

    if (reportsLoading || usersLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reports Management</h1>
                <p className="text-muted-foreground mt-1">Review reported posts and manage user bans</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stats-card-orange">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">Total Reports</p>
                            <p className="stats-card-number">{reports.length}</p>
                        </div>
                        <Flag className="stats-card-icon" />
                    </div>
                </div>
                <div className="stats-card-pink">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">Pending</p>
                            <p className="stats-card-number">{reports.filter(r => r.status === 'pending').length}</p>
                        </div>
                        <Clock className="stats-card-icon" />
                    </div>
                </div>
                <div className="stats-card-blue">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">Reported Users</p>
                            <p className="stats-card-number">{reportedUsers.length}</p>
                        </div>
                        <User className="stats-card-icon" />
                    </div>
                </div>
                <div className="stats-card-teal">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">High Risk (3+)</p>
                            <p className="stats-card-number">{reportedUsers.filter(u => u.reportCount >= 3).length}</p>
                        </div>
                        <AlertTriangle className="stats-card-icon" />
                    </div>
                </div>
            </div>

            <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="users">Reported Users</TabsTrigger>
                    <TabsTrigger value="reports">All Reports</TabsTrigger>
                </TabsList>

                {/* Reported Users Tab */}
                <TabsContent value="users">
                    <Card className="bento-card">
                        <CardHeader>
                            <CardTitle>Reported Users</CardTitle>
                            <CardDescription>Users with 3+ reports are highlighted in red</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6 sm:pt-0">
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Reports</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Top Reasons</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportedUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No reported users found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            reportedUsers.map((item) => (
                                                <TableRow
                                                    key={item._id}
                                                    className={item.reportCount >= 3 ? "bg-red-500/10 hover:bg-red-500/20" : ""}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={item.user.avatar} />
                                                                <AvatarFallback>{item.user.name?.charAt(0) || "U"}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className={`font-medium ${item.reportCount >= 3 ? "text-red-500" : ""}`}>
                                                                    {item.user.name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">{item.user.email}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={item.reportCount >= 3
                                                                ? "bg-red-500/20 text-red-500 border-red-500/30"
                                                                : "bg-orange-500/20 text-orange-500 border-orange-500/30"
                                                            }
                                                        >
                                                            {item.reportCount} reports
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{getBanStatusBadge(item.user.banStatus)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 flex-wrap">
                                                            {[...new Set(item.reports.map(r => r.reason))].slice(0, 2).map((reason, i) => (
                                                                <span key={i}>{getReasonBadge(reason)}</span>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.user.banStatus === "active" ? (
                                                            <Button
                                                                size="sm"
                                                                className="gap-1 h-8 px-3 rounded-full font-medium bg-red-500/10 text-red-600 hover:bg-red-500/25 hover:text-red-700 border border-red-500/20 hover:border-red-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/30 dark:hover:text-red-300"
                                                                onClick={() => handleBanUser(item)}
                                                            >
                                                                <Ban className="h-3.5 w-3.5" />
                                                                Ban
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                className="gap-1 h-8 px-3 rounded-full font-medium bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
                                                                onClick={() => unbanMutation.mutate(item._id)}
                                                                disabled={unbanMutation.isPending}
                                                            >
                                                                <ShieldOff className="h-3.5 w-3.5" />
                                                                Unban
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3 p-3">
                                {reportedUsers.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No reported users found
                                    </div>
                                ) : (
                                    reportedUsers.map((item) => (
                                        <div
                                            key={item._id}
                                            className={`p-4 rounded-xl border ${item.reportCount >= 3 ? "bg-red-500/10 border-red-500/30" : "bg-accent/30 border-card-border/30"}`}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10">
                                                        <AvatarImage src={item.user.avatar} />
                                                        <AvatarFallback>{item.user.name?.charAt(0) || "U"}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className={`font-medium text-sm ${item.reportCount >= 3 ? "text-red-500" : ""}`}>
                                                            {item.user.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{item.user.email}</p>
                                                    </div>
                                                </div>
                                                {getBanStatusBadge(item.user.banStatus)}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                <Badge
                                                    className={item.reportCount >= 3
                                                        ? "bg-red-500/20 text-red-500 border-red-500/30"
                                                        : "bg-orange-500/20 text-orange-500 border-orange-500/30"
                                                    }
                                                >
                                                    {item.reportCount} reports
                                                </Badge>
                                                {[...new Set(item.reports.map(r => r.reason))].slice(0, 2).map((reason, i) => (
                                                    <span key={i}>{getReasonBadge(reason)}</span>
                                                ))}
                                            </div>
                                            <div className="flex justify-end">
                                                {item.user.banStatus === "active" ? (
                                                    <Button
                                                        size="sm"
                                                        className="gap-1 h-8 px-3 rounded-full font-medium bg-red-500/10 text-red-600 hover:bg-red-500/25 hover:text-red-700 border border-red-500/20 hover:border-red-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/30 dark:hover:text-red-300"
                                                        onClick={() => handleBanUser(item)}
                                                    >
                                                        <Ban className="h-3.5 w-3.5" />
                                                        Ban User
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        className="gap-1 h-8 px-3 rounded-full font-medium bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
                                                        onClick={() => unbanMutation.mutate(item._id)}
                                                        disabled={unbanMutation.isPending}
                                                    >
                                                        <ShieldOff className="h-3.5 w-3.5" />
                                                        Unban
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* All Reports Tab */}
                <TabsContent value="reports">
                    <Card className="bento-card">
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div>
                                    <CardTitle>All Reports</CardTitle>
                                    <CardDescription>Review and manage reported content</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 w-48"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="reviewed">Reviewed</SelectItem>
                                            <SelectItem value="resolved">Resolved</SelectItem>
                                            <SelectItem value="dismissed">Dismissed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6 sm:pt-0">
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Post Author</TableHead>
                                            <TableHead>Content</TableHead>
                                            <TableHead>Reported By</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredReports.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    No reports found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredReports.map((report) => (
                                                <TableRow key={report._id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={report.post?.author?.avatar} />
                                                                <AvatarFallback>{report.post?.author?.name?.charAt(0) || "U"}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-sm">{report.post?.author?.name || "Unknown"}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm line-clamp-2 max-w-xs">{report.post?.content || "Content unavailable"}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm">{report.reporter?.name || "Unknown"}</span>
                                                    </TableCell>
                                                    <TableCell>{getReasonBadge(report.reason)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={report.status === "pending" ? "outline" : "secondary"}>
                                                            {report.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {report.status === "pending" && (
                                                            <Button
                                                                size="sm"
                                                                className="gap-1 h-8 px-3 rounded-full font-medium bg-zinc-500/10 text-zinc-600 hover:bg-zinc-500/25 hover:text-zinc-700 border border-zinc-500/20 hover:border-zinc-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-zinc-500/15 dark:text-zinc-400 dark:hover:bg-zinc-500/30 dark:hover:text-zinc-300"
                                                                onClick={() => dismissMutation.mutate(report._id)}
                                                                disabled={dismissMutation.isPending}
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Dismiss
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile/Tablet Card View */}
                            <div className="lg:hidden space-y-3 p-3">
                                {filteredReports.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        No reports found
                                    </div>
                                ) : (
                                    filteredReports.map((report) => (
                                        <div
                                            key={report._id}
                                            className="p-4 rounded-xl bg-accent/30 border border-card-border/30"
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={report.post?.author?.avatar} />
                                                        <AvatarFallback>{report.post?.author?.name?.charAt(0) || "U"}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm">{report.post?.author?.name || "Unknown"}</p>
                                                        <p className="text-xs text-muted-foreground">Reported by {report.reporter?.name || "Unknown"}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={report.status === "pending" ? "outline" : "secondary"} className="text-xs">
                                                    {report.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{report.post?.content || "Content unavailable"}</p>
                                            <div className="flex items-center justify-between">
                                                {getReasonBadge(report.reason)}
                                                {report.status === "pending" && (
                                                    <Button
                                                        size="sm"
                                                        className="gap-1 h-8 px-3 rounded-full font-medium bg-zinc-500/10 text-zinc-600 hover:bg-zinc-500/25 hover:text-zinc-700 border border-zinc-500/20 hover:border-zinc-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-zinc-500/15 dark:text-zinc-400 dark:hover:bg-zinc-500/30 dark:hover:text-zinc-300"
                                                        onClick={() => dismissMutation.mutate(report._id)}
                                                        disabled={dismissMutation.isPending}
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        Dismiss
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Ban User Dialog */}
            <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-destructive" />
                            Ban User: {selectedUser?.user.name}
                        </DialogTitle>
                        <DialogDescription>
                            Choose a ban type and provide a reason for banning this user.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ban Type</Label>
                            <Select value={banType} onValueChange={(v) => setBanType(v as "temp_banned" | "suspended")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="temp_banned">Temporary Ban</SelectItem>
                                    <SelectItem value="suspended">Permanent Suspension</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {banType === "temp_banned" && (
                            <div className="space-y-2">
                                <Label>Duration (days)</Label>
                                <Select value={banDuration} onValueChange={setBanDuration}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 day</SelectItem>
                                        <SelectItem value="3">3 days</SelectItem>
                                        <SelectItem value="7">7 days</SelectItem>
                                        <SelectItem value="14">14 days</SelectItem>
                                        <SelectItem value="30">30 days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Reason (optional)</Label>
                            <Textarea
                                placeholder="Enter reason for ban..."
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBanSubmit}
                            disabled={banMutation.isPending}
                        >
                            {banMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Banning...
                                </>
                            ) : (
                                <>
                                    <Ban className="h-4 w-4 mr-2" />
                                    {banType === "suspended" ? "Suspend User" : "Ban User"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

