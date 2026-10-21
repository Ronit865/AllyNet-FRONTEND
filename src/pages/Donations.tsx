import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTag } from '@/components/ui/InfoTag';
import { donationService } from '@/services/ApiServices';
import { toast } from 'sonner';
import { Heart, Target, TrendingUp, Loader2, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache';

interface DonationCampaign {
  _id: string;
  name: string;
  description: string;
  goal: number;
  raisedAmount: number;
  donors: any[];
  createdAt: string;
}

const ITEMS_PER_PAGE = 6;

export default function Donations() {

  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributing, setContributing] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);

  const fetchCampaigns = async () => {
    try {
      // Check cache first
      const cachedCampaigns = cache.get<DonationCampaign[]>(CACHE_KEYS.USER_DONATIONS);
      if (cachedCampaigns) {
        setCampaigns(cachedCampaigns);
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await donationService.getCampaigns();

      if (response.success) {
        setCampaigns(response.data);
        cache.set(CACHE_KEYS.USER_DONATIONS, response.data, CACHE_TTL.MEDIUM);
      } else {
        toast.error("Error", { description: response.message || 'Failed to fetch donation campaigns' });
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || 'Failed to load donation campaigns' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleContribute = (campaign: DonationCampaign) => {
    setSelectedCampaign(campaign);
    setContributeDialogOpen(true);
    setContributionAmount('');
  };

  const submitContribution = async () => {
    if (!selectedCampaign || !contributionAmount) {
      toast.error("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setContributing(true);
      const response = await donationService.contributeToCampaign(selectedCampaign._id, amount);

      if (response.success) {
        toast.success(`Contributed ₹${amount}!`, { description: "Thank you for your support." });
        setContributeDialogOpen(false);
        setContributionAmount('');
        fetchCampaigns();
      } else {
        toast.error("Contribution failed", { description: response.message });
      }
    } catch (error: any) {
      toast.error("Contribution failed", { description: error.message });
    } finally {
      setContributing(false);
    }
  };

  // Categorize campaigns
  const activeCampaigns = campaigns.filter(c => ((c.raisedAmount ?? 0) / (c.goal ?? 1)) * 100 < 100);
  const completedCampaigns = campaigns.filter(c => ((c.raisedAmount ?? 0) / (c.goal ?? 1)) * 100 >= 100);

  // Pagination
  const activeTotalPages = Math.ceil(activeCampaigns.length / ITEMS_PER_PAGE);
  const completedTotalPages = Math.ceil(completedCampaigns.length / ITEMS_PER_PAGE);

  const paginatedActiveCampaigns = activeCampaigns.slice(
    activePage * ITEMS_PER_PAGE,
    (activePage + 1) * ITEMS_PER_PAGE
  );

  const paginatedCompletedCampaigns = completedCampaigns.slice(
    completedPage * ITEMS_PER_PAGE,
    (completedPage + 1) * ITEMS_PER_PAGE
  );

  const CampaignCard = ({ campaign, isCompleted = false }: { campaign: DonationCampaign; isCompleted?: boolean }) => {
    const progress = ((campaign.raisedAmount ?? 0) / (campaign.goal ?? 1)) * 100;
    const remaining = (campaign.goal ?? 0) - (campaign.raisedAmount ?? 0);

    return (
      <Card className="bento-card hover:shadow-md border-card-border/50 hover-lift flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold font-sans">
            <Heart className="h-5 w-5 text-red-500 flex-shrink-0" />
            <span className="line-clamp-2">{campaign.name}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Progress Section */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-primary">₹{(campaign.raisedAmount ?? 0).toLocaleString()}</span>
              <span className="text-muted-foreground">of ₹{(campaign.goal ?? 0).toLocaleString()}</span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{Math.min(progress, 100).toFixed(1)}% funded</p>
          </div>


          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-4 pt-2 flex-1">
            <div className="flex items-center gap-2">
              <Target className={`h-4 w-4 flex-shrink-0 ${isCompleted ? 'text-green-500' : 'text-yellow-500'}`} />
              <div>
                <p className="text-xs text-muted-foreground">{isCompleted ? 'Exceeded' : 'Remaining'}</p>
                <p className="text-sm font-semibold text-foreground">
                  {isCompleted ? `+₹${Math.abs(remaining).toLocaleString()}` : `₹${remaining.toLocaleString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Contributors</p>
                <p className="text-sm font-semibold text-foreground">{campaign.donors?.length || 0}</p>
              </div>
            </div>
          </div>
          {/* Button - Colorful Pill Style */}
          <div className="pt-2 mt-auto">
            <Button
              className={`w-full rounded-full font-semibold transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 ${isCompleted
                ? 'bg-green-500/10 text-green-600 border border-green-500/20 dark:bg-green-500/15 dark:text-green-400'
                : 'bg-red-500/10 text-red-600 hover:bg-red-500/25 hover:text-red-700 border border-red-500/20 hover:border-red-500/40 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/30 dark:hover:text-red-300'
                }`}
              onClick={() => handleContribute(campaign)}
              disabled={isCompleted}
              variant="ghost"
            >
              {isCompleted ? '✓ Goal Reached' : '❤ Contribute Now'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

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
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={currentPage === 0}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage + 1} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={currentPage >= totalPages - 1}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  // Data-only skeleton - static UI renders immediately
  const CampaignCardsSkeleton = () => (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 space-y-3 sm:space-y-4 animate-in fade-in slide-in- duration-300"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded" />
            <Skeleton className="h-4 sm:h-5 w-32 sm:w-40" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
              <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-2.5 sm:h-3 w-12 sm:w-16" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[0, 1].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-2.5 sm:h-3 w-10 sm:w-14" />
                  <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-9 sm:h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header - Always visible */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Donation Campaigns</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Support causes that matter to our community</p>
      </div>

      {/* Active Donations Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg sm:text-xl font-semibold text-foreground">
            Active Donations {!loading && `(${activeCampaigns.length})`}
          </h2>
        </div>

        {loading ? (
          <CampaignCardsSkeleton />
        ) : activeCampaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12">
              <Heart className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Active Campaigns</h3>
              <p className="text-sm text-muted-foreground text-center">Check back later for new donation opportunities</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedActiveCampaigns.map((campaign) => (
                <CampaignCard key={campaign._id} campaign={campaign} />
              ))}
            </div>
            {activeTotalPages > 1 && (
              <PaginationControls
                currentPage={activePage}
                totalPages={activeTotalPages}
                onPrevious={() => setActivePage(p => Math.max(0, p - 1))}
                onNext={() => setActivePage(p => Math.min(activeTotalPages - 1, p + 1))}
              />
            )}
          </>
        )}
      </div>

      {/* Completed Donations Section - Only show when data is loaded */}
      {!loading && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              Completed Donations ({completedCampaigns.length})
            </h2>
          </div>

          {completedCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 sm:py-12">
                <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">No Completed Campaigns</h3>
                <p className="text-sm text-muted-foreground text-center">Completed campaigns will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedCompletedCampaigns.map((campaign) => (
                  <CampaignCard key={campaign._id} campaign={campaign} isCompleted />
                ))}
              </div>
              {completedTotalPages > 1 && (
                <PaginationControls
                  currentPage={completedPage}
                  totalPages={completedTotalPages}
                  onPrevious={() => setCompletedPage(p => Math.max(0, p - 1))}
                  onNext={() => setCompletedPage(p => Math.min(completedTotalPages - 1, p + 1))}
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Contribution Dialog */}
      <Dialog open={contributeDialogOpen} onOpenChange={setContributeDialogOpen}>
        <DialogContent className="p-0 gap-0 max-w-sm rounded-lg border shadow-modal overflow-hidden">
          {/* Header */}
          <DialogHeader className="modal-header">
            <DialogTitle className="modal-header-title">Contribute to campaign</DialogTitle>
            <DialogDescription className="modal-header-desc mt-1">
              {selectedCampaign?.name} — every amount makes a difference.
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div className="modal-body space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-[12px] font-medium text-foreground">Amount (₹)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g. 500"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  min="1"
                  step="1"
                  className="flex-1 h-9 text-sm font-numeric"
                />
                {selectedCampaign && (selectedCampaign.goal ?? 0) > (selectedCampaign.raisedAmount ?? 0) && (
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => {
                      const rem = (selectedCampaign.goal ?? 0) - (selectedCampaign.raisedAmount ?? 0);
                      setContributionAmount(rem.toString());
                    }}
                    className="h-9 text-xs"
                  >
                    Fill gap
                  </Button>
                )}
              </div>
            </div>

            {selectedCampaign && (
              <div className="rounded-md border bg-muted/40 divide-y text-[12px]">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Goal</span>
                  <span className="font-numeric font-semibold text-foreground">₹{(selectedCampaign.goal ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Raised so far</span>
                  <span className="font-numeric font-semibold text-foreground">₹{(selectedCampaign.raisedAmount ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-numeric font-semibold text-foreground">₹{((selectedCampaign.goal ?? 0) - (selectedCampaign.raisedAmount ?? 0)).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="modal-footer">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setContributeDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={submitContribution} disabled={contributing}>
              {contributing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Contribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

