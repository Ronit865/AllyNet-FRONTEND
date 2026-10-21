import { useState, useEffect } from "react";
import { Calendar, MapPin, Users, Clock, Search, CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, Check } from "lucide-react";
import { StatusButton } from "@/components/ui/status-button";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTag } from "@/components/ui/InfoTag";
import { useToast } from "@/hooks/use-toast";
import { eventService } from "@/services/ApiServices";
import { userService } from "@/services/ApiServices";
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
    image?: string;
    isactive: boolean;
    createdAt: string;
    updatedAt: string;
}

const ITEMS_PER_PAGE = 6;

export default function Events() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joiningEvent, setJoiningEvent] = useState<string | null>(null);
    const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
    const [activeEventPage, setActiveEventPage] = useState(0);
    const [pastEventPage, setPastEventPage] = useState(0);

    useEffect(() => {
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
                toast({ title: "Error", description: "Failed to fetch events", variant: "destructive" });
            }
        } catch (error: any) {
            setError(error.message || "Failed to fetch events");
            toast({ title: "Error", description: "Failed to fetch events", variant: "destructive" });
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

    const getCurrentUserId = async (): Promise<string | undefined> => {
        try {
            const userResponse = await userService.getCurrentUser();
            return userResponse.data?._id;
        } catch (error) {
            return undefined;
        }
    };

    const handleJoinEvent = async (eventId: string) => {
        try {
            setJoiningEvent(eventId);

            const userId = await getCurrentUserId();
            if (!userId) {
                toast({ title: "Error", description: "Please login to join events", variant: "destructive" });
                return;
            }

            const response = await eventService.joinEvent(eventId);

            if (response.success) {
                toast({ 
                    title: "Successfully joined the event!", 
                    description: "You will receive event updates via email.",
                    variant: "success"
                });

                setRegisteredEvents(prev => new Set(prev).add(eventId));

                setEvents(prevEvents =>
                    prevEvents.map(event =>
                        event._id === eventId
                            ? { ...event, participants: [...event.participants, userId] }
                            : event
                    )
                );
            } else {
                toast({ title: "Error", description: response.message || "Failed to join event", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to join event", variant: "destructive" });
        } finally {
            setJoiningEvent(null);
        }
    };

    const handleLeaveEvent = async (eventId: string) => {
        try {
            setJoiningEvent(eventId);

            const userId = await getCurrentUserId();
            if (!userId) {
                toast({ title: "Error", description: "Unable to leave event", variant: "destructive" });
                return;
            }

            const response = await eventService.leaveEvent(eventId);

            if (response.success) {
                toast({ title: "Successfully left the event", variant: "success" });

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
                toast({ title: "Error", description: response.message || "Failed to leave event", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to leave event", variant: "destructive" });
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

    // Pagination
    const activeEventsTotalPages = Math.ceil(activeEvents.length / ITEMS_PER_PAGE);
    const pastEventsTotalPages = Math.ceil(pastEvents.length / ITEMS_PER_PAGE);

    const paginatedActiveEvents = activeEvents.slice(
        activeEventPage * ITEMS_PER_PAGE,
        (activeEventPage + 1) * ITEMS_PER_PAGE
    );

    const paginatedPastEvents = pastEvents.slice(
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
                        <Clock className="h-4 w-4 text-purple-500 flex-shrink-0" />
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
                            {event.participants.length}{event.maxAttendees && `/${event.maxAttendees}`}
                        </span>
                    </div>
                </div>

                {/* Action Button - Hide for past events unless already registered */}
                {(!isPast || registeredEvents.has(event._id)) && (
                    <Button
                        size="sm"
                        className={`w-full h-10 font-semibold rounded-full transition-all duration-200 focus-visible:ring-0 focus-visible:ring-offset-0 ${registeredEvents.has(event._id)
                            ? 'bg-red-500/10 text-red-600 hover:bg-red-500/25 hover:text-red-700 border border-red-500/20 hover:border-red-500/40 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/30 dark:hover:text-red-300'
                            : 'bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300'
                            }`}
                        onClick={() => registeredEvents.has(event._id)
                            ? handleLeaveEvent(event._id)
                            : handleJoinEvent(event._id)
                        }
                        disabled={
                            isPast || // Disable for past events
                            (!registeredEvents.has(event._id) && 
                            event.maxAttendees !== undefined && 
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
                        ) : (event.maxAttendees && event.participants.length >= event.maxAttendees) ? (
                            "Event Full"
                        ) : (
                            "Join Event"
                        )}
                    </Button>
                )}
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
                    className="rounded-2xl bg-card border border-border/50 p-4 sm:p-5 space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
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
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                            Past Events ({pastEvents.length})
                        </h2>
                    </div>

                    {pastEvents.length === 0 ? (
                        <Card className="border-card-border/50">
                            <CardContent className="pt-10 pb-10 sm:pt-12 sm:pb-12 text-center">
                                <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm sm:text-base text-muted-foreground">No past events to display.</p>
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
        </div>
    );
}
