import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, TrendingUp, Users, Target, ArrowUpRight, Clock, Plus, Loader2, ChevronLeft, ChevronRight, CheckCircle, MoreVertical, Trash2, Edit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { donationService, handleApiError } from "@/services/ApiServices";
import { toast } from 'sonner';

// Keep the static data for stats (will be replaced with API data)
// Removed static donationStats and recentDonations arrays - now using API data

// Enhanced interface for campaign data from backend - matching user side
interface Campaign {
    _id: string;
    name: string;
    description: string;
    goal: number;
    raised?: number;
    raisedAmount?: number;
    donors?: number | any[]; // Can be either number or array
    donorCount?: number;
    donorsCount?: number;
    numberOfDonors?: number;
    donations?: any[]; // Array of donation records
    endDate?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    category?: string;
}

interface CreateCampaignForm {
    name: string;
    description: string;
    goal: string;
    endDate: string;
    category: string;
}

// Add new interface for donor data
interface Donor {
    _id: string;
    name: string;
    email: string;
    amount: number;
    date: string;
    avatar?: string;
}

const ITEMS_PER_PAGE = 6;

export function Donations() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<CreateCampaignForm>({
        name: "",
        description: "",
        goal: "",
        endDate: "",
        category: ""
    });
    const [formErrors, setFormErrors] = useState<Partial<CreateCampaignForm>>({});
    const [selectedCampaignDonors, setSelectedCampaignDonors] = useState<Donor[]>([]);
    const [loadingDonors, setLoadingDonors] = useState(false);
    const [isDonorsDialogOpen, setIsDonorsDialogOpen] = useState(false);
    const [selectedCampaignName, setSelectedCampaignName] = useState("");
    const [donationStats, setDonationStats] = useState<any>(null);
    const [recentDonors, setRecentDonors] = useState<any[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [activePage, setActivePage] = useState(0);
    const [completedPage, setCompletedPage] = useState(0);

    // Edit Campaign State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [isEditingCampaign, setIsEditingCampaign] = useState(false);
    const [editFormData, setEditFormData] = useState<CreateCampaignForm>({
        name: "",
        description: "",
        goal: "",
        endDate: "",
        category: ""
    });
    const [editFormErrors, setEditFormErrors] = useState<Partial<CreateCampaignForm>>({});

    // Get featured campaigns (campaigns that need the least amount to reach their goal)
    const getFeaturedCampaigns = () => {
        return campaigns
            .filter(campaign => (campaign.raised || 0) < campaign.goal) // Only incomplete campaigns
            .sort((a, b) => {
                const remainingA = a.goal - (a.raised || 0);
                const remainingB = b.goal - (b.raised || 0);
                return remainingA - remainingB; // Sort by least remaining amount
            })
            .slice(0, 3); // Take top 3
    };

    // Fetch campaigns from database
    useEffect(() => {
        const fetchCampaigns = async () => {
            try {
                setLoading(true);
                const response = await donationService.getCampaigns();

                if (response.success) {
                    // Process campaigns to handle the schema differences - same as user side
                    const processedCampaigns = (response.data || []).map((campaign: any) => {
                        // Handle raised amount - prioritize 'raised' over 'raisedAmount'
                        const raisedAmount = campaign.raised || campaign.raisedAmount || 0;

                        // Handle donors count with multiple fallbacks - same logic as user side
                        let donorCount = 0;
                        if (Array.isArray(campaign.donors)) {
                            donorCount = campaign.donors.length;
                        } else if (typeof campaign.donors === 'number') {
                            donorCount = campaign.donors;
                        } else if (campaign.donorCount) {
                            donorCount = campaign.donorCount;
                        } else if (campaign.donorsCount) {
                            donorCount = campaign.donorsCount;
                        } else if (campaign.numberOfDonors) {
                            donorCount = campaign.numberOfDonors;
                        } else if (campaign.donations && Array.isArray(campaign.donations)) {
                            donorCount = campaign.donations.length;
                        }

                        return {
                            ...campaign,
                            raised: raisedAmount,
                            donors: donorCount
                        };
                    });

                    setCampaigns(processedCampaigns);
                    setError(null);
                } else {
                    setError(response.message || "Failed to fetch campaigns");
                    toast.error("Error", { description: response.message || "Failed to fetch campaigns" });
                }
            } catch (err: any) {
                const apiError = handleApiError(err);
                setError(apiError.message || "An error occurred while fetching campaigns");
                toast.error("Error", { description: apiError.message || "Failed to load campaigns" });
            } finally {
                setLoading(false);
            }
        };

        fetchCampaigns();
    }, []);

    // Fetch donation stats and recent donors
    useEffect(() => {
        const fetchStatsAndDonors = async () => {
            try {
                setLoadingStats(true);

                // Fetch donation stats
                const statsResponse = await donationService.getDonationStats();
                if (statsResponse.success) {
                    setDonationStats(statsResponse.data);
                } else {
                    // Failed to fetch donation stats
                }

                // Fetch recent donors
                const donorsResponse = await donationService.getRecentDonors();
                if (donorsResponse.success) {
                    // Take only the first 5 recent donors
                    setRecentDonors((donorsResponse.data || []).slice(0, 5));
                } else {
                    // Failed to fetch recent donors
                }
            } catch (error: any) {
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStatsAndDonors();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "completed":
                return <Badge className="bg-green-500/15 text-green-600 border-green-200/50">✓ Completed</Badge>;
            case "pending":
                return <Badge className="bg-amber-500/15 text-amber-600 border-amber-200/50">⚠ Pending</Badge>;
            case "failed":
                return <Badge className="bg-red-500/15 text-red-600 border-red-200/50">✕ Failed</Badge>;
            default:
                return <Badge variant="secondary">Unknown</Badge>;
        }
    };

    // Function to calculate progress percentage
    const getProgressPercentage = (raised: number = 0, goal: number) => {
        return Math.min(Math.round((raised / goal) * 100), 100);
    };

    // Function to format date
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return "N/A";
        }
    };

    // Updated function to safely get donor count - matching user side logic
    const getDonorCount = (campaign: Campaign): number => {
        // Handle different possible field names and formats - same as user side
        if (Array.isArray(campaign.donors)) {
            return campaign.donors.length;
        } else if (typeof campaign.donors === 'number') {
            return campaign.donors;
        } else if (typeof campaign.donorCount === 'number') {
            return campaign.donorCount;
        } else if (typeof campaign.donorsCount === 'number') {
            return campaign.donorsCount;
        } else if (typeof campaign.numberOfDonors === 'number') {
            return campaign.numberOfDonors;
        } else if (campaign.donations && Array.isArray(campaign.donations)) {
            return campaign.donations.length;
        } else if (typeof campaign.donors === 'string') {
            // Try to parse if it's a string number
            const parsed = parseInt(campaign.donors, 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    const handleInputChange = (field: keyof CreateCampaignForm, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const errors: Partial<CreateCampaignForm> = {};

        if (!formData.name.trim()) {
            errors.name = "Campaign name is required";
        }

        if (!formData.description.trim()) {
            errors.description = "Description is required";
        }

        if (!formData.goal || parseFloat(formData.goal) <= 0) {
            errors.goal = "Please enter a valid goal amount";
        }

        if (!formData.endDate) {
            errors.endDate = "End date is required";
        } else {
            const selectedDate = new Date(formData.endDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate <= today) {
                errors.endDate = "End date must be in the future";
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setIsCreating(true);

            const campaignData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                goal: parseFloat(formData.goal),
                endDate: formData.endDate,
                category: formData.category.trim() || undefined
            };

            const response = await donationService.createCampaign(campaignData);

            if (response.success) {
                toast({
                    title: "Campaign created",
                    description: "Campaign has been successfully created",
                    variant: "success",
                });

                // Reset form and close dialog
                setFormData({
                    name: "",
                    description: "",
                    goal: "",
                    endDate: "",
                    category: ""
                });
                setFormErrors({});
                setIsCreateDialogOpen(false);

                // Refresh campaigns list
                window.location.reload();
            } else {
                toast.error("Error", { description: `Failed to create campaign: ${response.message}` });
            }
        } catch (err: any) {
            const errorInfo = handleApiError(err);
            toast.error("Error", { description: `Failed to create campaign: ${errorInfo.message}` });
        } finally {
            setIsCreating(false);
        }
    };

    const fetchCampaignDonors = async (campaignId: string, campaignName: string) => {
        try {
            // Reset state first
            setSelectedCampaignDonors([]);
            setLoadingDonors(true);
            setSelectedCampaignName(campaignName);
            setIsDonorsDialogOpen(true);

            const response = await donationService.getCampaignDonors(campaignId);

            // Handle the response - check multiple possible formats
            const responseData = response?.data || response;
            const isSuccess = response?.success ?? (responseData && Array.isArray(responseData));

            if (isSuccess && Array.isArray(responseData)) {
                if (responseData.length > 0) {
                    // Transform the donor data - data is now flattened
                    const transformedDonors = responseData.map((donor: any) => ({
                        _id: donor._id || '',
                        name: donor.name || 'Anonymous',
                        email: donor.email || 'No email',
                        amount: Number(donor.amount) || 0,
                        date: donor.donatedAt || new Date().toISOString(),
                        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(donor.name || 'Anonymous')}`
                    }));

                    setSelectedCampaignDonors(transformedDonors);
                } else {
                    setSelectedCampaignDonors([]);
                }
            } else {
                toast.error("Error", { description: "Unexpected response format from server" });
                setSelectedCampaignDonors([]);
            }
        } catch (err: any) {
            const apiError = handleApiError(err);
            toast.error("Error", { description: apiError.message || "Failed to load donors" });
            setSelectedCampaignDonors([]);
            console.error("Error fetching campaign donors:", err);
        } finally {
            setLoadingDonors(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            goal: "",
            endDate: "",
            category: ""
        });
        setFormErrors({});
    };

    // Handle Edit Campaign
    const handleEditCampaign = (campaign: Campaign) => {
        setEditingCampaign(campaign);
        setEditFormData({
            name: campaign.name,
            description: campaign.description,
            goal: campaign.goal.toString(),
            endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().split('T')[0] : "",
            category: campaign.category || ""
        });
        setEditFormErrors({});
        setIsEditDialogOpen(true);
    };

    const handleEditInputChange = (field: keyof CreateCampaignForm, value: string) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
        if (editFormErrors[field]) {
            setEditFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateEditForm = (): boolean => {
        const errors: Partial<CreateCampaignForm> = {};
        if (!editFormData.name.trim()) errors.name = "Campaign name is required";
        if (!editFormData.description.trim()) errors.description = "Description is required";
        if (!editFormData.goal || parseFloat(editFormData.goal) <= 0) errors.goal = "Please enter a valid goal amount";
        if (!editFormData.endDate) errors.endDate = "End date is required";
        setEditFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleUpdateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateEditForm() || !editingCampaign) return;

        try {
            setIsEditingCampaign(true);
            const campaignData = {
                name: editFormData.name.trim(),
                description: editFormData.description.trim(),
                goal: parseFloat(editFormData.goal),
                endDate: editFormData.endDate,
                category: editFormData.category.trim() || undefined
            };

            await donationService.updateCampaign(editingCampaign._id, campaignData);
            toast({
                title: "Campaign updated",
                description: "Campaign has been successfully updated",
                variant: "success",
            });

            setIsEditDialogOpen(false);
            setEditingCampaign(null);
            window.location.reload();
        } catch (err: any) {
            const errorInfo = handleApiError(err);
            toast.error("Error", { description: `Failed to update campaign: ${errorInfo.message}` });
        } finally {
            setIsEditingCampaign(false);
        }
    };

    const handleDeleteCampaign = async (campaignId: string) => {
        try {
            await donationService.deleteCampaign(campaignId);
            toast({
                title: "Campaign deleted",
                description: "Campaign has been successfully deleted",
                variant: "success",
            });
            window.location.reload();
        } catch (err: any) {
            const errorInfo = handleApiError(err);
            toast.error("Error", { description: `Failed to delete campaign: ${errorInfo.message}` });
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3 animate-in fade-in slide-in- duration-500">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-56 bg-muted/60" />
                        <Skeleton className="h-4 w-80 bg-muted/60" />
                    </div>
                    <Skeleton className="h-10 w-40 rounded-lg bg-muted/60" />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 animate-in fade-in slide-in- duration-500" style={{ animationDelay: '100ms' }}>
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="rounded-2xl p-4 sm:p-5 bg-card border border-border/50"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-3">
                                    <Skeleton className="h-3 w-24 bg-muted/60" />
                                    <Skeleton className="h-8 w-20 bg-muted/60" />
                                    <Skeleton className="h-3 w-16 bg-muted/60" />
                                </div>
                                <Skeleton className="h-10 w-10 rounded-xl bg-muted/60" />
                            </div>
                        </div>
                    ))}
                </div>



                {/* Campaigns Grid */}
                <div className="animate-in fade-in slide-in- duration-500" style={{ animationDelay: '200ms' }}>
                    <Skeleton className="h-6 w-40 mb-4 bg-muted/60" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="rounded-2xl p-5 bg-card border border-border/50 space-y-4 animate-in fade-in slide-in- duration-500"
                                style={{ animationDelay: `${400 + i * 50}ms` }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-5 w-3/4 bg-muted/60" />
                                        <Skeleton className="h-3 w-1/2 bg-muted/60" />
                                    </div>
                                    <Skeleton className="h-8 w-8 rounded-lg bg-muted/60" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full bg-muted/60" />
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-4 w-28 bg-muted/60" />
                                    <Skeleton className="h-4 w-20 bg-muted/60" />
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <Skeleton className="h-6 w-16 rounded-full bg-muted/60" />
                                    <Skeleton className="h-8 w-24 rounded-lg bg-muted/60" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Donations Table */}
                <div className="rounded-2xl bg-card border border-border/50 overflow-hidden animate-in fade-in slide-in- duration-500" style={{ animationDelay: '500ms' }}>
                    <div className="p-4 border-b border-border/30">
                        <Skeleton className="h-6 w-40 bg-muted/60" />
                    </div>
                    <div className="divide-y divide-border/30">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-4">
                                <Skeleton className="h-10 w-10 rounded-full bg-muted/60" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-32 bg-muted/60" />
                                    <Skeleton className="h-3 w-48 bg-muted/60" />
                                </div>
                                <Skeleton className="h-5 w-20 bg-muted/60" />
                                <Skeleton className="h-6 w-20 rounded-full bg-muted/60" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* Custom Scrollbar Styles */}
            <style>{`
                /* Webkit Scrollbars */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: hsl(var(--muted) / 0.3);
                    border-radius: 10px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--primary) / 0.5);
                    border-radius: 10px;
                    transition: background 0.2s ease;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--primary) / 0.7);
                }

                .custom-scrollbar::-webkit-scrollbar-corner {
                    background: hsl(var(--muted) / 0.3);
                }

                /* Firefox Scrollbars */
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: hsl(var(--primary) / 0.5) hsl(var(--muted) / 0.3);
                }

                /* Thin Scrollbar Variant */
                .custom-scrollbar-thin::-webkit-scrollbar {
                    width: 4px;
                    height: 4px;
                }

                .custom-scrollbar-thin::-webkit-scrollbar-track {
                    background: hsl(var(--border) / 0.2);
                    border-radius: 8px;
                }

                .custom-scrollbar-thin::-webkit-scrollbar-thumb {
                    background: hsl(var(--accent-foreground) / 0.4);
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--accent-foreground) / 0.6);
                }

                /* Table Scrollbar */
                .table-scrollbar::-webkit-scrollbar {
                    height: 8px;
                }

                .table-scrollbar::-webkit-scrollbar-track {
                    background: hsl(var(--muted) / 0.2);
                    border-radius: 4px;
                    margin: 0 8px;
                }

                .table-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary) / 0.4));
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }

                .table-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(90deg, hsl(var(--primary) / 0.8), hsl(var(--primary) / 0.6));
                    box-shadow: 0 0 8px hsl(var(--primary) / 0.3);
                }
            `}</style>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 animate-fade-in">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Donation Management</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
                        Track fundraising campaigns, donations, and donor engagement.
                    </p>
                </div>

                {/* Create Campaign Dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="gap-2 h-9 px-4 rounded-full font-medium transition-all duration-200 bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
                            onClick={() => setIsCreateDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Create Campaign
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] bento-card gradient-surface border-card-border/50" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold text-foreground">Create New Campaign</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Start a new fundraising campaign for the alumni community.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateCampaign} className="space-y-6 mt-4">
                            {/* Campaign Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                                    Campaign Name *
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Enter campaign name"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    className={`border-card-border/50 focus:border-primary ${formErrors.name ? "border-destructive" : ""
                                        }`}
                                />
                                {formErrors.name && (
                                    <p className="text-sm text-destructive">{formErrors.name}</p>
                                )}
                            </div>

                            {/* Campaign Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                                    Description *
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe your campaign goals and purpose"
                                    value={formData.description}
                                    onChange={(e) => handleInputChange("description", e.target.value)}
                                    className={`min-h-[100px] border-card-border/50 focus:border-primary resize-none ${formErrors.description ? "border-destructive" : ""
                                        }`}
                                />
                                {formErrors.description && (
                                    <p className="text-sm text-destructive">{formErrors.description}</p>
                                )}
                            </div>

                            {/* Goal and End Date Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="goal" className="text-sm font-medium text-foreground">
                                        Goal Amount (₹) *
                                    </Label>
                                    <Input
                                        id="goal"
                                        type="number"
                                        placeholder="100000"
                                        value={formData.goal}
                                        onChange={(e) => handleInputChange("goal", e.target.value)}
                                        className={`border-card-border/50 focus:border-primary ${formErrors.goal ? "border-destructive" : ""
                                            }`}
                                    />
                                    {formErrors.goal && (
                                        <p className="text-sm text-destructive">{formErrors.goal}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="endDate" className="text-sm font-medium text-foreground">
                                        End Date *
                                    </Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => handleInputChange("endDate", e.target.value)}
                                        className={`border-card-border/50 focus:border-primary ${formErrors.endDate ? "border-destructive" : ""
                                            }`}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    {formErrors.endDate && (
                                        <p className="text-sm text-destructive">{formErrors.endDate}</p>
                                    )}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="space-y-2">
                                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                                    Category (Optional)
                                </Label>
                                <Input
                                    id="category"
                                    placeholder="e.g., Scholarship, Infrastructure, Research"
                                    value={formData.category}
                                    onChange={(e) => handleInputChange("category", e.target.value)}
                                    className="border-card-border/50 focus:border-primary"
                                />
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        resetForm();
                                        setIsCreateDialogOpen(false);
                                    }}
                                    disabled={isCreating}
                                    className="border-card-border/50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isCreating}
                                    className="gradient-primary text-primary-foreground hover:shadow-purple"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Campaign
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 animate-slide-up">
                <div className="stats-card-pink">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">Total Raised</p>
                            <p className="stats-card-number">
                                {loadingStats ? "Loading..." : formatCurrency(donationStats?.totalRaised || 0)}
                            </p>
                            <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                                <ArrowUpRight className="w-3 h-3" />
                                This year
                            </p>
                        </div>
                        <IndianRupee className="stats-card-icon" />
                    </div>
                </div>

                <div className="stats-card-blue">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">Active Donors</p>
                            <p className="stats-card-number">
                                {loadingStats ? "Loading..." : (donationStats?.activeDonors || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3" />
                                Unique contributors
                            </p>
                        </div>
                        <Users className="stats-card-icon" />
                    </div>
                </div>

                <div className="stats-card-orange">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">Avg. Donation</p>
                            <p className="stats-card-number">
                                {loadingStats ? "Loading..." : formatCurrency(donationStats?.avgDonation || 0)}
                            </p>
                            <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3" />
                                Per donor
                            </p>
                        </div>
                        <TrendingUp className="stats-card-icon" />
                    </div>
                </div>

                <div className="stats-card-teal">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="stats-card-label">Campaign Goal</p>
                            <p className="stats-card-number">
                                {loadingStats ? "Loading..." : `${(donationStats?.campaignGoalPercentage || 0).toFixed(0)}%`}
                            </p>
                            <p className="text-xs text-white/80 flex items-center gap-1 mt-1">
                                <Target className="w-3 h-3" />
                                Of {loadingStats ? "..." : formatCurrency(donationStats?.totalGoal || 0)} target
                            </p>
                        </div>
                        <Target className="stats-card-icon" />
                    </div>
                </div>
            </div>

            {/* Pagination Controls Component */}
            {(() => {
                const PaginationControls = ({
                    currentPage,
                    totalPages,
                    onPrevious,
                    onNext
                }: {
                    currentPage: number;
                    totalPages: number;
                    onPrevious: () => void;
                    onNext: () => void;
                }) => (
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <Button variant="outline" size="sm" onClick={onPrevious} disabled={currentPage === 0} className="gap-1">
                            <ChevronLeft className="h-4 w-4" />Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">Page {currentPage + 1} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={onNext} disabled={currentPage >= totalPages - 1} className="gap-1">
                            Next<ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                );

                // Categorize campaigns
                const activeCampaigns = campaigns.filter(c => getProgressPercentage(c.raised, c.goal) < 100);
                const completedCampaigns = campaigns.filter(c => getProgressPercentage(c.raised, c.goal) >= 100);
                const activeTotalPages = Math.ceil(activeCampaigns.length / ITEMS_PER_PAGE);
                const completedTotalPages = Math.ceil(completedCampaigns.length / ITEMS_PER_PAGE);
                const paginatedActive = activeCampaigns.slice(activePage * ITEMS_PER_PAGE, (activePage + 1) * ITEMS_PER_PAGE);
                const paginatedCompleted = completedCampaigns.slice(completedPage * ITEMS_PER_PAGE, (completedPage + 1) * ITEMS_PER_PAGE);

                const CampaignCard = ({ campaign, index }: { campaign: Campaign; index: number }) => {
                    return (
                        <Card key={`campaign-${campaign._id}`} className="overflow-hidden border-border/30 bg-card font-sans shadow-sm hover:shadow-lg transition-colors duration-100 flex flex-col h-full animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                            <CardHeader className="pb-3 pt-5 px-5">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg font-semibold text-foreground line-clamp-2">
                                            {campaign.name}
                                        </CardTitle>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-popover">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleEditCampaign(campaign)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit Campaign
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => handleDeleteCampaign(campaign._id)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Campaign
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col px-5 pb-5 space-y-3">
                                <CardDescription className="line-clamp-2 text-xs">
                                    {campaign.description}
                                </CardDescription>

                                {/* Progress Section */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium text-foreground">{getProgressPercentage(campaign.raised, campaign.goal)}%</span>
                                    </div>
                                    <div className="w-full bg-secondary rounded-full h-2">
                                        <div className=" from-primary to-primary/80 h-2 rounded-full transition-all duration-500" style={{ width: `${getProgressPercentage(campaign.raised, campaign.goal)}%` }} />
                                    </div>
                                </div>

                                {/* Raised & Goal */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Raised</p>
                                        <p className="font-semibold text-foreground">{formatCurrency(campaign.raised || 0)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Goal</p>
                                        <p className="font-semibold text-foreground">{formatCurrency(campaign.goal)}</p>
                                    </div>
                                </div>

                                {/* Donors and Button */}
                                <div className="mt-auto pt-2 space-y-2">
                                    <Button
                                        size="sm"
                                        className="w-full h-8 text-xs gap-1.5 rounded-full font-medium transition-all duration-200 bg-blue-500/10 text-blue-600 hover:bg-blue-500/25 hover:text-blue-700 border border-blue-500/20 hover:border-blue-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:hover:text-blue-300"
                                        onClick={() => fetchCampaignDonors(campaign._id, campaign.name)}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        View Donors ({getDonorCount(campaign)})
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                };

                return (
                    <>
                        {/* Active Campaigns */}
                        <div>
                            <div className="flex items-center gap-2 mb-4"><Target className="h-5 w-5 text-muted-foreground" /><h2 className="text-xl font-semibold text-foreground">Active Donations ({activeCampaigns.length})</h2></div>
                            {activeCampaigns.length === 0 ? (
                                <Card className="border-card-border/50"><CardContent className="pt-12 pb-12 text-center"><Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No active campaigns.</p></CardContent></Card>
                            ) : (
                                <><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{paginatedActive.map((c, i) => <CampaignCard key={c._id} campaign={c} index={i} />)}</div>{activeTotalPages > 1 && <PaginationControls currentPage={activePage} totalPages={activeTotalPages} onPrevious={() => setActivePage(p => Math.max(0, p - 1))} onNext={() => setActivePage(p => Math.min(activeTotalPages - 1, p + 1))} />}</>
                            )}
                        </div>

                        {/* Completed Campaigns */}
                        <div>
                            <div className="flex items-center gap-2 mb-4"><CheckCircle className="h-5 w-5 text-muted-foreground" /><h2 className="text-xl font-semibold text-foreground">Completed Donations ({completedCampaigns.length})</h2></div>
                            {completedCampaigns.length === 0 ? (
                                <Card className="border-card-border/50"><CardContent className="pt-12 pb-12 text-center"><CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No completed campaigns yet.</p></CardContent></Card>
                            ) : (
                                <><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{paginatedCompleted.map((c, i) => <CampaignCard key={c._id} campaign={c} index={i} />)}</div>{completedTotalPages > 1 && <PaginationControls currentPage={completedPage} totalPages={completedTotalPages} onPrevious={() => setCompletedPage(p => Math.max(0, p - 1))} onNext={() => setCompletedPage(p => Math.min(completedTotalPages - 1, p + 1))} />}</>
                            )}
                        </div>
                    </>
                );
            })()}

            {/* Recent Donations - Full Width */}
            <Card className="bento-card gradient-surface border-card-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        Recent Donations
                    </CardTitle>
                    <CardDescription>
                        Latest donation activity across all campaigns
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingStats ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : recentDonors.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground mb-2">No recent donations</p>
                                <p className="text-sm text-muted-foreground">Donations will appear here once received.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto table-scrollbar">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Donor</TableHead>
                                            <TableHead>Campaign</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentDonors.map((donation, index) => (
                                            <TableRow
                                                key={`recent-donation-${donation._id}-${index}`}
                                                className="animate-fade-in hover:bg-accent/30"
                                                style={{ animationDelay: `${index * 100}ms` }}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarImage
                                                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(donation.name || 'Anonymous')}`}
                                                                alt={donation.name}
                                                            />
                                                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                                {donation.name.split(' ').map((n: string) => n[0]).join('')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium">{donation.name}</p>
                                                            <p className="text-sm text-muted-foreground">{donation.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{donation.campaign}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {donation.graduationYear ? `Class of ${donation.graduationYear}` : 'Alumni'}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-semibold text-primary">
                                                        {formatCurrency(donation.amount)}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm">{formatDate(donation.donatedAt)}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            donation.status === 'completed'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border-0'
                                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400 border-0'
                                                        }
                                                    >
                                                        {donation.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3 p-3">
                                {recentDonors.map((donation, index) => (
                                    <div
                                        key={`recent-donation-mobile-${donation._id}-${index}`}
                                        className="p-4 rounded-xl bg-accent/30 border border-card-border/30 animate-fade-in"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10">
                                                    <AvatarImage
                                                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(donation.name || 'Anonymous')}`}
                                                        alt={donation.name}
                                                    />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                                        {donation.name.split(' ').map((n: string) => n[0]).join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm">{donation.name}</p>
                                                    <p className="text-xs text-muted-foreground">{donation.campaign}</p>
                                                </div>
                                            </div>
                                            <Badge
                                                className={
                                                    donation.status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border-0'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400 border-0'
                                                }
                                            >
                                                {donation.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-primary">{formatCurrency(donation.amount)}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(donation.donatedAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Campaign Donors Dialog - Redesigned */}
            <Dialog open={isDonorsDialogOpen} onOpenChange={setIsDonorsDialogOpen}>
                <DialogContent
                    key={selectedCampaignDonors.length}
                    className="sm:max-w-[700px] max-w-[95vw] bento-card gradient-surface border-card-border/50"
                    style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                >
                    <DialogHeader className="pb-4 border-b border-card-border/20">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl from-primary/20 to-primary/10 flex items-center justify-center">
                                <IndianRupee className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold text-foreground">
                                    Campaign Donors
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground mt-1">
                                    {selectedCampaignName} • {selectedCampaignDonors.length} donors
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="mt-4">
                        {loadingDonors ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="text-center">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                    <p className="text-muted-foreground font-medium">Loading donors...</p>
                                </div>
                            </div>
                        ) : selectedCampaignDonors.length === 0 ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="text-center">
                                    <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                        <Users className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">No donors yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">This campaign hasn't received any donations. Share the campaign to get more donors.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedCampaignDonors.map((donor, index) => (
                                        <div
                                            key={`donor-${donor._id}-${index}`}
                                            className="flex items-center justify-between p-4 rounded-xl bg-accent/30 border border-card-border/30 hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 group animate-fade-in"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl from-primary/20 to-accent/50 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-background shadow-sm">
                                                    {donor.avatar ? (
                                                        <img src={donor.avatar} alt={donor.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-lg font-semibold text-primary">
                                                            {donor.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{donor.name}</h4>
                                                    <p className="text-sm text-muted-foreground">{donor.email}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(donor.date)}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-xl text-primary">{formatCurrency(donor.amount)}</p>
                                                <Badge variant="outline" className="bg-success/10 text-success border-success/30 mt-1">
                                                    Donated
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-card-border/20">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsDonorsDialogOpen(false)}
                                        className="border-card-border/50"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Campaign Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bento-card gradient-surface border-card-border/50" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <DialogHeader className="pb-4 border-b border-card-border/20">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl from-primary/20 to-primary/10 flex items-center justify-center">
                                <Edit className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-semibold text-foreground">Edit Campaign</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Update campaign details below
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleUpdateCampaign} className="space-y-5 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name" className="text-sm font-medium text-foreground">Campaign Name *</Label>
                            <Input
                                id="edit-name"
                                placeholder="Enter campaign name"
                                value={editFormData.name}
                                onChange={(e) => handleEditInputChange("name", e.target.value)}
                                className={`border-card-border/50 focus:border-primary ${editFormErrors.name ? "border-destructive" : ""}`}
                            />
                            {editFormErrors.name && <p className="text-sm text-destructive">{editFormErrors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description" className="text-sm font-medium text-foreground">Description *</Label>
                            <Textarea
                                id="edit-description"
                                placeholder="Describe your campaign"
                                value={editFormData.description}
                                onChange={(e) => handleEditInputChange("description", e.target.value)}
                                className={`min-h-[100px] border-card-border/50 focus:border-primary resize-none ${editFormErrors.description ? "border-destructive" : ""}`}
                            />
                            {editFormErrors.description && <p className="text-sm text-destructive">{editFormErrors.description}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-goal" className="text-sm font-medium text-foreground">Goal Amount (₹) *</Label>
                                <Input
                                    id="edit-goal"
                                    type="number"
                                    placeholder="100000"
                                    value={editFormData.goal}
                                    onChange={(e) => handleEditInputChange("goal", e.target.value)}
                                    className={`border-card-border/50 focus:border-primary ${editFormErrors.goal ? "border-destructive" : ""}`}
                                />
                                {editFormErrors.goal && <p className="text-sm text-destructive">{editFormErrors.goal}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-endDate" className="text-sm font-medium text-foreground">End Date *</Label>
                                <Input
                                    id="edit-endDate"
                                    type="date"
                                    value={editFormData.endDate}
                                    onChange={(e) => handleEditInputChange("endDate", e.target.value)}
                                    className={`border-card-border/50 focus:border-primary ${editFormErrors.endDate ? "border-destructive" : ""}`}
                                />
                                {editFormErrors.endDate && <p className="text-sm text-destructive">{editFormErrors.endDate}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-category" className="text-sm font-medium text-foreground">Category (Optional)</Label>
                            <Input
                                id="edit-category"
                                placeholder="e.g., Scholarship, Infrastructure"
                                value={editFormData.category}
                                onChange={(e) => handleEditInputChange("category", e.target.value)}
                                className="border-card-border/50 focus:border-primary"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-card-border/20">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                                disabled={isEditingCampaign}
                                className="border-card-border/50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isEditingCampaign}
                                className="gradient-primary text-primary-foreground hover:shadow-purple"
                            >
                                {isEditingCampaign ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Edit className="h-4 w-4 mr-2" />
                                        Update Campaign
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

