import { useState, useEffect, useRef } from "react";
import { Calendar, MapPin, Users, Clock, Search, CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, Check, CreditCard, Eye, ListFilter, UserX } from "lucide-react";
import { StatusButton } from "@/components/ui/status-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTag } from "@/components/ui/InfoTag";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { eventService } from "@/services/ApiServices";
import { userService } from "@/services/ApiServices";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

interface Event {
    _id: string;
    title: string;
    description: string;
    date: string;
    time?: string;
    location?: string;
    type?: string;
    category?: string;
    participants: any[];
    maxAttendees?: number;
    isPaid?: boolean;
    price?: number;
    image?: string;
    isactive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface RazorpayCheckoutOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    }) => void;
    prefill?: { name?: string };
    theme?: { color: string };
    modal?: { ondismiss?: () => void };
}

const ITEMS_PER_PAGE = 6;

export default function Events() {
    const { confirm, Dialog: ConfirmDialogEl } = useConfirm();
    const [searchQuery, setSearchQuery] = useState("");
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningEvent, setJoiningEvent] = useState<string | null>(null);
    const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
    const [activeEventPage, setActiveEventPage] = useState(0);
    const [pastEventPage, setPastEventPage] = useState(0);
    const [pastEventTab, setPastEventTab] = useState<"all" | "applied" | "not-applied">("all");
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string>();
    const initialLoadStarted = useRef(false);
    const [paymentEvent, setPaymentEvent] = useState<string | null>(null);

    useEffect(() => {
        if (initialLoadStarted.current) return;
        initialLoadStarted.current = true;
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            // Check cache first
            const cachedEvents = cache.get<Event[]>(CACHE_KEYS.USER_EVENTS);
            if (cachedEvents) {
                setEvents(cachedEvents);
                await checkRegisteredEvents(cachedEvents);
                setLoading(false);

                // Refresh in background if cache is stale
                if (cache.getTTL(CACHE_KEYS.USER_EVENTS) < CACHE_TTL.SHORT) {
                    refreshEventsInBackground();
                }
                return;
            }

            setLoading(true);
            setError(null);
            const response = await eventService.getEvents();

            if (response.success) {
                setEvents(response.data);
                cache.set(CACHE_KEYS.USER_EVENTS, response.data, CACHE_TTL.MEDIUM);
                await checkRegisteredEvents(response.data);
            } else {
                setError(response.message || "Failed to fetch events");
                toast.error("Failed to fetch events");
            }
        } catch (error: any) {
            setError(error.message || "Failed to fetch events");
            toast.error("Failed to fetch events");
        } finally {
            setLoading(false);
        }
    };

    const refreshEventsInBackground = async () => {
        try {
            const response = await eventService.getEvents();
            if (response.success) {
                setEvents(response.data);
                cache.set(CACHE_KEYS.USER_EVENTS, response.data, CACHE_TTL.MEDIUM);
                await checkRegisteredEvents(response.data);
            }
        } catch (error) {
            // Background refresh failed
        }
    };

    const checkRegisteredEvents = async (events: Event[]) => {
        try {
            const userResponse = await userService.getCurrentUser();

            if (userResponse.success && userResponse.data) {
                const userId = userResponse.data._id;
                setCurrentUserId(userId);

                const registered = new Set<string>();
                events.forEach(event => {
                    const isRegistered = event.participants.some((participant: any) => {
                        const participantId = typeof participant === 'string'
                            ? participant
                            : participant._id || participant.userId || participant.user;
                        return participantId === userId;
                    });

                    if (isRegistered) {
                        registered.add(event._id);
                    }
                });

                setRegisteredEvents(registered);
            }
        } catch (error) {
            // Error checking registered events
        }
    };

    const handleJoinEvent = async (eventId: string) => {
        try {
            setJoiningEvent(eventId);

            const userId = currentUserId;
            if (!userId) {
                toast.error("Error", { description: "Please login to join events" });
                return;
            }

            const response = await eventService.joinEvent(eventId);

            if (response.success) {
                toast.success("Joined event!", { description: "You will receive event updates via email." });

                setRegisteredEvents(prev => new Set(prev).add(eventId));

                setEvents(prevEvents =>
                    prevEvents.map(event =>
                        event._id === eventId
                            ? { ...event, participants: [...event.participants, userId] }
                            : event
                    )
                );
            } else {
                toast.error("Failed to join event", { description: response.message });
            }
        } catch (error: any) {
            toast.error("Failed to join event", { description: error.message });
        } finally {
            setJoiningEvent(null);
        }
    };

    const handlePaidEvent = async (event: Event) => {
        try {
            setPaymentEvent(event._id);
            const script = await loadRazorpayScript();
            if (!script) {
                throw new Error("Unable to load Razorpay checkout");
            }

            const orderResponse = await eventService.createPaymentOrder(event._id);
            if (!orderResponse.success || !orderResponse.data) {
                throw new Error(orderResponse.message || "Unable to create payment order");
            }

            await new Promise<void>((resolve, reject) => {
                const checkout = new window.Razorpay({
                    key: orderResponse.data.keyId,
                    amount: orderResponse.data.amount,
                    currency: orderResponse.data.currency,
                    name: "AllyNet",
                    description: event.title,
                    order_id: orderResponse.data.orderId,
                    handler: async (response) => {
                        try {
                            const verification = await eventService.verifyPayment(event._id, response);
                            if (!verification.success) throw new Error(verification.message || "Payment verification failed");
                            const userId = currentUserId;
                            if (userId) {
                                setRegisteredEvents(prev => new Set(prev).add(event._id));
                                setEvents(prev => prev.map(item => item._id === event._id
                                    ? { ...item, participants: [...item.participants, userId] }
                                    : item));
                            }
                            toast.success("Payment successful", { description: "You are registered for this event." });
                            resolve();
                        } catch (error: any) {
                            reject(error);
                        }
                    },
                    modal: { ondismiss: () => reject(new Error("Payment was cancelled")) },
                    theme: { color: "#4775df" }
                } as RazorpayCheckoutOptions);
                checkout.open();
            });
        } catch (error: any) {
            toast.error("Payment failed", { description: error.message || "Please try again." });
        } finally {
            setPaymentEvent(null);
        }
    };

    const loadRazorpayScript = (): Promise<boolean> => new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    const handleLeaveEvent = async (eventId: string, eventTitle?: string) => {
        const ok = await confirm({
          title: "Leave Event?",
          description: `You'll be removed from "${eventTitle || 'this event'}". You can rejoin later if spots are available.`,
          confirmText: "Leave Event",
          variant: "warning",
        });
        if (!ok) return;
        try {
            setJoiningEvent(eventId);

            const userId = currentUserId;
            if (!userId) {
                toast.error("Unable to leave event");
                return;
            }

            const response = await eventService.leaveEvent(eventId);

            if (response.success) {
                toast.success("Left the event");

                setRegisteredEvents(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(eventId);
                    return newSet;
                });

                setEvents(prevEvents =>
                    prevEvents.map(event =>
                        event._id === eventId
                            ? {
                                ...event,
                                participants: event.participants.filter(p => p !== userId)
                            }
                            : event
                    )
                );
            } else {
                toast.error("Failed to leave event", { description: response.message });
            }
        } catch (error: any) {
            toast.error("Failed to leave event", { description: error.message });
        } finally {
            setJoiningEvent(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    // Filter and categorize events
    const filteredEvents = events.filter((event) =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.category && event.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Categorize based on date - past events are those with dates before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today && event.isactive;
    });

    const pastEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < today || !event.isactive;
    });

    const appliedPastEvents = pastEvents.filter(event => registeredEvents.has(event._id));
    const notAppliedPastEvents = pastEvents.filter(event => !registeredEvents.has(event._id));
    const visiblePastEvents = pastEventTab === "applied"
        ? appliedPastEvents
        : pastEventTab === "not-applied"
            ? notAppliedPastEvents
            : pastEvents;

    // Pagination
    const activeEventsTotalPages = Math.ceil(activeEvents.length / ITEMS_PER_PAGE);
    const pastEventsTotalPages = Math.ceil(visiblePastEvents.length / ITEMS_PER_PAGE);

    const paginatedActiveEvents = activeEvents.slice(
        activeEventPage * ITEMS_PER_PAGE,
        (activeEventPage + 1) * ITEMS_PER_PAGE
    );

    const paginatedPastEvents = visiblePastEvents.slice(
        pastEventPage * ITEMS_PER_PAGE,
        (pastEventPage + 1) * ITEMS_PER_PAGE
    );

    const EventCard = ({ event, index, isPast = false }: { event: Event; index: number; isPast?: boolean }) => (
        <Card
            key={event._id}
            className="overflow-hidden border-border/30 bg-card animate-fade-in group flex flex-col h-full"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 font-sans">
                    {event.title}
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col px-4 pb-4">
                {/* Category Badge */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    {event.category && (
                        <Badge variant="secondary" className="text-xs font-medium">
                            {event.category}
                        </Badge>
                    )}
                    {isPast && (
                        <Badge variant="outline" className="text-xs font-medium text-muted-foreground">
                            Past Event
                        </Badge>
                    )}
                </div>

                {/* Description */}
                <p className="text-foreground/80 text-sm leading-relaxed line-clamp-2 mb-3">
                    {event.description}
                </p>

                {/* Event Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm flex-1 mb-4">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-foreground font-medium truncate">{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <span className="text-foreground font-medium truncate">{event.time || "TBD"}</span>
                    </div>
                    {event.location && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-teal-500 flex-shrink-0" />
                            <span className="text-foreground font-medium truncate">{event.location}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        <span className="text-foreground font-medium truncate">
                            {event.participants.length}{event.maxAttendees ? `/${event.maxAttendees}` : ""}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-foreground font-medium truncate">
                            {event.isPaid ? `₹${(event.price || 0).toLocaleString()}` : "Free"}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-10 min-w-0 flex-1 rounded-full px-2 text-xs font-semibold sm:px-3 sm:text-sm"
                        onClick={() => {
                            setSelectedEvent(event);
                            setDetailsOpen(true);
                        }}
                    >
                        <Eye className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
                        View Details
                    </Button>

                    {/* Registration status/action */}
                    {!isPast ? (
                        <Button
                            size="sm"
                            className={`h-10 min-w-0 flex-1 rounded-full px-2 text-xs font-semibold transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 sm:px-3 sm:text-sm ${registeredEvents.has(event._id)
                                ? 'bg-red-500/10 text-red-600 hover:bg-red-500/25 hover:text-red-700 border border-red-500/20 hover:border-red-500/40 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/30 dark:hover:text-red-300'
                                : 'bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300'
                                }`}
                            onClick={() => registeredEvents.has(event._id)
                                ? handleLeaveEvent(event._id, event.title)
                                : event.isPaid
                                    ? handlePaidEvent(event)
                                    : handleJoinEvent(event._id)
                            }
                            disabled={
                                paymentEvent === event._id ||
                                (!registeredEvents.has(event._id) &&
                                event.maxAttendees !== undefined && event.maxAttendees !== null &&
                                event.participants.length >= event.maxAttendees)
                            }
                            variant="ghost"
                        >
                        {joiningEvent === event._id ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                {registeredEvents.has(event._id) ? "Leaving..." : "Joining..."}
                            </>
                        ) : registeredEvents.has(event._id) ? (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Leave Event
                            </>
                        ) : paymentEvent === event._id ? (
                            "Opening payment..."
                        ) : event.isPaid ? (
                            `Pay ₹${(event.price || 0).toLocaleString()}`
                        ) : (event.maxAttendees !== undefined && event.maxAttendees !== null && event.participants.length >= event.maxAttendees) ? (
                            "Event Full"
                        ) : (
                            "Join Event"
                        )}
                        </Button>
                    ) : registeredEvents.has(event._id) ? (
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled
                            className="h-10 min-w-0 flex-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-600 opacity-100 sm:px-3 sm:text-sm dark:text-emerald-400"
                        >
                            <Check className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
                            Participated
                        </Button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );

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
    const EventCardsSkeleton = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 space-y-3 sm:space-y-4 animate-in fade-in slide-in- duration-300"
                    style={{ animationDelay: `${i * 40}ms` }}
                >
                    <div className="space-y-2">
                        <Skeleton className="h-4 sm:h-5 w-3/4" />
                        <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
                    </div>
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {[0, 1, 2, 3].map((j) => (
                            <div key={j} className="flex items-center gap-2">
                                <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded" />
                                <Skeleton className="h-3 sm:h-4 w-14 sm:w-20" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-9 sm:h-10 w-full rounded-lg" />
                </div>
            ))}
        </div>
    );

    if (error) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1 sm:mb-2">Alumni Events</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Discover upcoming events and connect with fellow alumni</p>
                </div>
                <div className="text-center py-12">
                    <Card className="border-destructive/50 bg-destructive/10">
                        <CardContent className="pt-6">
                            <p className="text-destructive mb-4">{error}</p>
                            <Button onClick={fetchEvents} variant="outline" size="sm">
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Header - Always visible */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1 sm:mb-2">Alumni Events</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Discover upcoming events and connect with fellow alumni</p>
            </div>

            {/* Search - Always visible */}
            <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Active Events Section */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                        Active Events {!loading && `(${activeEvents.length})`}
                    </h2>
                </div>

                {loading ? (
                    <EventCardsSkeleton />
                ) : activeEvents.length === 0 ? (
                    <Card className="border-card-border/50">
                        <CardContent className="pt-10 pb-10 sm:pt-12 sm:pb-12 text-center">
                            <CalendarDays className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-sm sm:text-base text-muted-foreground">No active events available.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {paginatedActiveEvents.map((event, index) => (
                                <EventCard key={event._id} event={event} index={index} isPast={false} />
                            ))}
                        </div>
                        {activeEventsTotalPages > 1 && (
                            <PaginationControls
                                currentPage={activeEventPage}
                                totalPages={activeEventsTotalPages}
                                onPrevious={() => setActiveEventPage(p => Math.max(0, p - 1))}
                                onNext={() => setActiveEventPage(p => Math.min(activeEventsTotalPages - 1, p + 1))}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Past Events Section */}
            {!loading && (
                <div>
                    <div className="mb-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                                Past Events ({pastEvents.length})
                            </h2>
                        </div>
                        {pastEvents.length > 0 && (
                            <Tabs
                                value={pastEventTab}
                                onValueChange={(value) => {
                                    setPastEventTab(value as typeof pastEventTab);
                                    setPastEventPage(0);
                                }}
                            >
                                <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1.5">
                                    <TabsTrigger value="all" className="gap-1.5 px-2 py-2 text-xs sm:px-3 sm:text-sm">
                                        <ListFilter className="h-3.5 w-3.5" />
                                        All <span className="text-xs opacity-75">({pastEvents.length})</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="applied" className="gap-1.5 px-2 py-2 text-xs sm:px-3 sm:text-sm">
                                        <Check className="h-3.5 w-3.5" />
                                        Applied <span className="text-xs opacity-75">({appliedPastEvents.length})</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="not-applied" className="gap-1.5 px-2 py-2 text-xs sm:px-3 sm:text-sm">
                                        <UserX className="h-3.5 w-3.5" />
                                        Not Applied <span className="text-xs opacity-75">({notAppliedPastEvents.length})</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        )}
                    </div>

                    {pastEvents.length === 0 ? (
                        <Card className="border-card-border/50">
                            <CardContent className="pt-10 pb-10 sm:pt-12 sm:pb-12 text-center">
                                <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm sm:text-base text-muted-foreground">No past events to display.</p>
                            </CardContent>
                        </Card>
                    ) : visiblePastEvents.length === 0 ? (
                        <Card className="border-card-border/50">
                            <CardContent className="py-10 text-center sm:py-12">
                                <Check className="mx-auto mb-4 h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
                                <p className="text-sm text-muted-foreground sm:text-base">
                                    {pastEventTab === "applied"
                                        ? "You have not applied to any past events."
                                        : "You have applied to all past events."}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {paginatedPastEvents.map((event, index) => (
                                    <EventCard key={event._id} event={event} index={index} isPast={true} />
                                ))}
                            </div>
                            {pastEventsTotalPages > 1 && (
                                <PaginationControls
                                    currentPage={pastEventPage}
                                    totalPages={pastEventsTotalPages}
                                    onPrevious={() => setPastEventPage(p => Math.max(0, p - 1))}
                                    onNext={() => setPastEventPage(p => Math.min(pastEventsTotalPages - 1, p + 1))}
                                />
                            )}
                        </>
                    )}
                </div>
            )}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
                    <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
                        <DialogTitle className="text-2xl font-bold">{selectedEvent?.title}</DialogTitle>
                        <DialogDescription className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            {selectedEvent && formatDate(selectedEvent.date)}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedEvent && (
                        <>
                            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-gutter:stable]">
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="mb-2 text-lg font-semibold">Event Description</h3>
                                        <p className="whitespace-pre-wrap text-muted-foreground">{selectedEvent.description}</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="flex items-start gap-3">
                                            <Clock className="mt-0.5 h-5 w-5 text-primary" />
                                            <div><p className="text-sm text-muted-foreground">Time</p><p className="font-semibold">{selectedEvent.time || "TBD"}</p></div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                                            <div><p className="text-sm text-muted-foreground">Location</p><p className="font-semibold">{selectedEvent.location || "TBD"}</p></div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Users className="mt-0.5 h-5 w-5 text-primary" />
                                            <div><p className="text-sm text-muted-foreground">Seats</p><p className="font-semibold">{selectedEvent.participants.length}{selectedEvent.maxAttendees ? ` / ${selectedEvent.maxAttendees}` : " registered"}</p></div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
                                            <div><p className="text-sm text-muted-foreground">Registration Fee</p><p className="font-semibold">{selectedEvent.isPaid ? `₹${(selectedEvent.price || 0).toLocaleString()}` : "Free"}</p></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 border-t bg-background px-6 py-4">
                                <Button
                                    className="w-full"
                                    disabled={paymentEvent === selectedEvent._id || selectedEvent.participants.length >= (selectedEvent.maxAttendees || Infinity) || registeredEvents.has(selectedEvent._id)}
                                    onClick={() => {
                                        setDetailsOpen(false);
                                        selectedEvent.isPaid
                                            ? handlePaidEvent(selectedEvent)
                                            : handleJoinEvent(selectedEvent._id);
                                    }}
                                >
                                    {paymentEvent === selectedEvent._id
                                        ? "Opening payment..."
                                        : selectedEvent.participants.length >= (selectedEvent.maxAttendees || Infinity)
                                            ? "Event Full"
                                            : registeredEvents.has(selectedEvent._id)
                                                ? "Already Registered"
                                                : selectedEvent.isPaid
                                                    ? `Pay ₹${(selectedEvent.price || 0).toLocaleString()} & Register`
                                                    : "Join Event"}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        {ConfirmDialogEl}
        </div>
    );
}
