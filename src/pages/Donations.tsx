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
  category?: string;
  goal: number;
  raisedAmount: number;
  donors: Array<{
    userId: string | { _id: string };
    payments?: DonationReceipt[];
    paymentId?: string;
    amount: number;
  }>;
  endDate?: string;
  createdAt: string;
}

interface DonationReceipt {
  amount: number;
  paidAt: string;
  paymentId: string;
  orderId: string;
}

const ITEMS_PER_PAGE = 6;
let razorpayScriptPromise: Promise<boolean> | null = null;

export default function Donations() {

  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<DonationCampaign | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributing, setContributing] = useState(false);
  const [donatedCampaignIds, setDonatedCampaignIds] = useState<Set<string>>(new Set());
  const [donationReceipts, setDonationReceipts] = useState<Record<string, DonationReceipt>>({});
  const [receiptCampaign, setReceiptCampaign] = useState<DonationCampaign | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [completedPage, setCompletedPage] = useState(0);

  const restoreDonationReceipts = (campaignList: DonationCampaign[]) => {
    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId) return;

    const receipts: Record<string, DonationReceipt> = {};
    const donatedIds = new Set<string>();
    campaignList.forEach((campaign) => {
      const donor = campaign.donors?.find((item) => {
        const donorId = typeof item.userId === 'string' ? item.userId : item.userId?._id;
        return donorId === currentUserId;
      });
      const latestPayment = donor?.payments?.[donor.payments.length - 1];
      if (donor && latestPayment) {
        donatedIds.add(campaign._id);
        receipts[campaign._id] = latestPayment;
      }
    });
    setDonatedCampaignIds(donatedIds);
    setDonationReceipts(receipts);
  };

  const fetchCampaigns = async () => {
    try {
      // Check cache first
      const cachedCampaigns = cache.get<DonationCampaign[]>(CACHE_KEYS.USER_DONATIONS);
      if (cachedCampaigns) {
        setCampaigns(cachedCampaigns);
        restoreDonationReceipts(cachedCampaigns);
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await donationService.getCampaigns();

      if (response.success) {
        setCampaigns(response.data);
        restoreDonationReceipts(response.data);
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
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Unable to load Razorpay checkout");

      const orderResponse = await donationService.createPaymentOrder(selectedCampaign._id, amount);
      if (!orderResponse.success || !orderResponse.data) {
        throw new Error(orderResponse.message || "Unable to create payment order");
      }

      // Close the Radix modal before opening Razorpay. Keeping two modal focus
      // traps mounted prevents pointer events from reaching the Razorpay iframe.
      setContributeDialogOpen(false);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      const paymentResult = await new Promise<{ verification: any; payment: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
      } }>((resolve, reject) => {
        if (!window.Razorpay) {
          reject(new Error("Razorpay checkout is unavailable. Please refresh and try again."));
          return;
        }

        let settled = false;
        const finish = (callback: () => void) => {
          if (settled) return;
          settled = true;
          callback();
        };

        const checkout = new window.Razorpay({
          key: orderResponse.data.keyId,
          amount: orderResponse.data.amount,
          currency: orderResponse.data.currency,
          name: "AllyNet",
          description: selectedCampaign.name,
          order_id: orderResponse.data.orderId,
          handler: async (payment) => {
            try {
              const verification = await donationService.verifyPayment(selectedCampaign._id, payment);
              finish(() => resolve({ verification, payment }));
            } catch (error) {
              finish(() => reject(error));
            }
          },
          modal: { ondismiss: () => finish(() => reject(new Error("Payment was cancelled"))) },
          theme: { color: "#4775df" }
        });
        checkout.on("payment.failed", (payment) => {
          finish(() => reject(new Error(payment.error?.description || "Payment failed")));
        });
        checkout.open();
      });

      const { verification, payment } = paymentResult;
      if (verification.success) {
        toast.success(`Donation successful: ₹${amount}`, { description: "Thank you for your support." });
        setDonatedCampaignIds((current) => new Set(current).add(selectedCampaign._id));
        setDonationReceipts((current) => ({
          ...current,
          [selectedCampaign._id]: {
            amount,
            paidAt: new Date().toISOString(),
            paymentId: payment.razorpay_payment_id,
            orderId: payment.razorpay_order_id
          }
        }));
        if (verification.data?._id) {
          setCampaigns((current) => current.map((campaign) =>
            campaign._id === verification.data._id ? verification.data : campaign
          ));
          cache.set(
            CACHE_KEYS.USER_DONATIONS,
            campaigns.map((campaign) =>
              campaign._id === verification.data._id ? verification.data : campaign
            ),
            CACHE_TTL.MEDIUM
          );
        }
        setContributeDialogOpen(false);
        setContributionAmount('');
      } else {
        toast.error("Contribution failed", { description: verification.message });
      }
    } catch (error: any) {
      toast.error("Contribution failed", { description: error.message });
    } finally {
      setContributing(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    if (razorpayScriptPromise) {
      razorpayScriptPromise.then(resolve);
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    razorpayScriptPromise = new Promise<boolean>((scriptResolve) => {
      script.onload = () => scriptResolve(Boolean(window.Razorpay));
      script.onerror = () => scriptResolve(false);
    });
    razorpayScriptPromise.then((loaded) => {
      if (!loaded) razorpayScriptPromise = null;
      resolve(loaded);
    });
    document.head.appendChild(script);
  });

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
    const hasDonated = donatedCampaignIds.has(campaign._id);
    const donationReceipt = donationReceipts[campaign._id];

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
            {donationReceipt && (
              <div className="mb-3 space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                <div className="flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Donation confirmed
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 w-full border-green-500/25 bg-transparent text-xs font-medium text-green-700 hover:bg-green-500/10 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                  onClick={() => setReceiptCampaign(campaign)}
                >
                  View donation details
                </Button>
              </div>
            )}
            <Button
              className={`w-full rounded-full font-semibold transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-100 ${isCompleted || hasDonated
                ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shadow-sm shadow-emerald-500/5 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-red-500/10 text-red-600 hover:bg-red-500/25 hover:text-red-700 border border-red-500/20 hover:border-red-500/40 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/30 dark:hover:text-red-300'
                }`}
              onClick={() => handleContribute(campaign)}
              disabled={isCompleted || hasDonated}
              variant="ghost"
            >
              {isCompleted ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Goal Reached
                </>
              ) : hasDonated ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Donated
                </>
              ) : (
                '❤ Contribute Now'
              )}
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
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border p-0 shadow-modal">
          {/* Header */}
          <DialogHeader className="border-b bg-muted/20 px-6 py-5 pr-14 text-left">
            <DialogTitle className="text-xl font-semibold">Support this campaign</DialogTitle>
            <DialogDescription className="mt-1 leading-relaxed">
              {selectedCampaign?.name}
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div className="max-h-[min(30rem,calc(90vh-9rem))] space-y-5 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">What this supports</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {selectedCampaign?.description || "Support this community campaign and help it reach its goal."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-foreground">Choose an amount</Label>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2500].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    className="h-10 rounded-lg"
                    onClick={() => setContributionAmount(amount.toString())}
                  >
                    ₹{amount.toLocaleString()}
                  </Button>
                ))}
              </div>
              <Input
                id="amount"
                type="number"
                placeholder="Enter another amount"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                min="1"
                step="1"
                className="h-10 text-sm font-numeric"
              />
            </div>

            {selectedCampaign && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted-foreground">Campaign progress</span>
                  <span className="font-semibold text-foreground">
                    ₹{(selectedCampaign.raisedAmount ?? 0).toLocaleString()} of ₹{(selectedCampaign.goal ?? 0).toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={Math.min(((selectedCampaign.raisedAmount ?? 0) / (selectedCampaign.goal || 1)) * 100, 100)}
                  className="h-2"
                />
              </div>
            )}
          </div>

            {/* Footer */}
            <DialogFooter className="gap-3 border-t bg-muted/20 px-6 py-4 sm:gap-3">
              <Button variant="ghost" className="h-10 px-4 text-sm font-medium" onClick={() => setContributeDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="h-10 min-w-44 px-5 text-sm font-semibold" onClick={submitContribution} disabled={contributing}>
                {contributing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue to payment
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(receiptCampaign)}
        onOpenChange={(open) => {
          if (!open) setReceiptCampaign(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-2xl border p-0 shadow-modal">
          <DialogHeader className="border-b bg-muted/20 px-6 py-5 pr-14 text-left">
            <DialogTitle className="text-lg font-semibold">Donation details</DialogTitle>
            <DialogDescription className="mt-1 leading-relaxed">
              {receiptCampaign?.name}
            </DialogDescription>
          </DialogHeader>
          {receiptCampaign && donationReceipts[receiptCampaign._id] && (
            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                Payment confirmed
              </div>
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-right font-semibold text-foreground">
                  ₹{donationReceipts[receiptCampaign._id].amount.toLocaleString("en-IN")}
                </span>
                <span className="text-muted-foreground">Date</span>
                <span className="text-right text-foreground">
                  {new Date(donationReceipts[receiptCampaign._id].paidAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  })}
                </span>
                <span className="text-muted-foreground">Reference</span>
                <span className="text-right font-mono text-xs text-foreground">
                  {donationReceipts[receiptCampaign._id].paymentId.slice(-8)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="border-t bg-muted/20 px-6 py-4">
            <Button className="h-10 px-5 text-sm font-medium" onClick={() => setReceiptCampaign(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
