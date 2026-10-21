import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  TrendingUp,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { eventService, handleApiError } from "@/services/ApiServices";
import { toast } from 'sonner';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  location?: string;
  participants: string[];
  isactive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ITEMS_PER_PAGE = 6;

interface CreateEventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
}

interface Participant {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  course?: string;
}

export function Events() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateEventForm>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: ""
  });
  const [formErrors, setFormErrors] = useState<Partial<CreateEventForm>>({});
  const [selectedEventParticipants, setSelectedEventParticipants] = useState<Participant[]>([]);
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [activeEventPage, setActiveEventPage] = useState(0);
  const [pastEventPage, setPastEventPage] = useState(0);

  // Edit Event State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateEventForm>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: ""
  });
  const [editFormErrors, setEditFormErrors] = useState<Partial<CreateEventForm>>({});

  // Fetch events from backend
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventService.getEvents();
      setEvents(response.data || []);
      setError(null);
    } catch (err: any) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      toast.error("Error", { description: `Failed to fetch events: ${errorInfo.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await eventService.deleteEvent(eventId);
      toast.success("Event deleted", { description: "Event has been successfully deleted" });
      fetchEvents(); // Refresh the events list
    } catch (err: any) {
      const errorInfo = handleApiError(err);
      toast.error("Error", { description: `Failed to delete event: ${errorInfo.message}` });
    }
  };

  const handleInputChange = (field: keyof CreateEventForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<CreateEventForm> = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.date) {
      errors.date = "Date is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsCreating(true);

      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        time: formData.time || undefined,
        location: formData.location.trim() || undefined
      };

      await eventService.createEvent(eventData);
      toast.success("Event created", { description: "Event has been successfully created" });

      // Reset form and close dialog
      setFormData({
        title: "",
        description: "",
        date: "",
        time: "",
        location: ""
      });
      setFormErrors({});
      setIsCreateDialogOpen(false);

      // Refresh events list
      fetchEvents();
    } catch (err: any) {
      const errorInfo = handleApiError(err);
      toast.error("Error", { description: `Failed to create event: ${errorInfo.message}` });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: "",
      time: "",
      location: ""
    });
    setFormErrors({});
  };

  // Handle Edit Event
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEditFormData({
      title: event.title,
      description: event.description,
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : "",
      time: event.time || "",
      location: event.location || ""
    });
    setEditFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleEditInputChange = (field: keyof CreateEventForm, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateEditForm = (): boolean => {
    const errors: Partial<CreateEventForm> = {};
    if (!editFormData.title.trim()) errors.title = "Title is required";
    if (!editFormData.description.trim()) errors.description = "Description is required";
    if (!editFormData.date) errors.date = "Date is required";
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEditForm() || !editingEvent) return;

    try {
      setIsEditing(true);
      const eventData = {
        title: editFormData.title.trim(),
        description: editFormData.description.trim(),
        date: editFormData.date,
        time: editFormData.time || undefined,
        location: editFormData.location.trim() || undefined
      };

      await eventService.updateEvent(editingEvent._id, eventData);
      toast.success("Event updated", { description: "Event has been successfully updated" });

      setIsEditDialogOpen(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err: any) {
      const errorInfo = handleApiError(err);
      toast.error("Error", { description: `Failed to update event: ${errorInfo.message}` });
    } finally {
      setIsEditing(false);
    }
  };

  const handleViewParticipants = async (eventId: string, eventTitle: string) => {
    try {
      setLoadingParticipants(true);
      setSelectedEventTitle(eventTitle);
      setIsParticipantsDialogOpen(true);

      const response = await eventService.getEventParticipants(eventId);

      // Handle the response - response.data should contain the participants array
      const participants = response.data || [];
      setSelectedEventParticipants(participants);
    } catch (err: any) {
      const errorInfo = handleApiError(err);
      toast.error("Error", { description: `Failed to fetch participants: ${errorInfo.message}` });
      setSelectedEventParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "active") return event.isactive;
    if (selectedFilter === "inactive") return !event.isactive;
    return true;
  });

  // Categorize events
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeEventsList = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return event.isactive && eventDate >= today;
  });

  const pastEventsList = events.filter(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return !event.isactive || eventDate < today;
  });

  // Pagination
  const activeEventsTotalPages = Math.ceil(activeEventsList.length / ITEMS_PER_PAGE);
  const pastEventsTotalPages = Math.ceil(pastEventsList.length / ITEMS_PER_PAGE);

  const paginatedActiveEvents = activeEventsList.slice(
    activeEventPage * ITEMS_PER_PAGE,
    (activeEventPage + 1) * ITEMS_PER_PAGE
  );

  const paginatedPastEvents = pastEventsList.slice(
    pastEventPage * ITEMS_PER_PAGE,
    (pastEventPage + 1) * ITEMS_PER_PAGE
  );

  // Calculate stats from actual data
  const totalEvents = events.length;
  const activeEventsCount = activeEventsList.length;
  const totalParticipants = events.reduce((total, event) => total + event.participants.length, 0);
  const averageParticipants = totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0;

  // Function to get events for a specific date
  const getEventsForDate = (checkDate: Date) => {
    const dateString = checkDate.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.date).toISOString().split('T')[0];
      return eventDate === dateString;
    });
  };

  // Function to check if a date has events
  const hasEvents = (checkDate: Date) => {
    return getEventsForDate(checkDate).length > 0;
  };

  // Function to get event dates for calendar highlighting
  const getEventDates = () => {
    return events.map(event => new Date(event.date));
  };

  // Custom day content renderer for calendar
  const dayContentRenderer = (day: Date) => {
    const dayEvents = getEventsForDate(day);
    const hasActiveEvents = dayEvents.some(event => event.isactive);
    const hasInactiveEvents = dayEvents.some(event => !event.isactive);

    return (
      <div className="relative w-full h-full flex items-center justify-center p-1">
        <span className={`relative z-10 text-center ${dayEvents.length > 0 ? 'font-semibold' : ''}`}>
          {day.getDate()}
        </span>
        {dayEvents.length > 0 && (
          <>
            {/* Event indicator dot */}
            <div className={`absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${hasActiveEvents ? 'bg-primary' : 'bg-muted-foreground'
              }`} />
            {/* Multiple events indicator */}
            {dayEvents.length > 1 && (
              <div className={`absolute bottom-0.5 left-1/2 transform translate-x-0.5 w-1 h-1 rounded-full ${hasActiveEvents ? 'bg-primary' : 'bg-muted-foreground'
                }`} />
            )}
          </>
        )}
      </div>
    );
  };

  // Filter events based on selected date
  const getFilteredEventsForSelectedDate = () => {
    if (!date) return filteredEvents;

    const selectedDateEvents = getEventsForDate(date);
    return selectedDateEvents.filter(event => {
      if (selectedFilter === "all") return true;
      if (selectedFilter === "active") return event.isactive;
      if (selectedFilter === "inactive") return !event.isactive;
      return true;
    });
  };

  // Get events to display (either for selected date or all filtered events)
  const eventsToDisplay = date ? getFilteredEventsForSelectedDate() : filteredEvents;

  // Pagination Controls Component
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

  // Event Card Component
  const EventCard = ({ event, index }: { event: Event; index: number }) => (
    <Card
      key={event._id}
      className="bento-card font-sans shadow-sm hover:shadow-lg transition-colors duration-100 border-card-border/50 animate-fade-in relative group flex flex-col h-full"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardContent className="p-6 flex-1 flex flex-col">
        {/* Event Header with Actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground line-clamp-1 mb-2">
              {event.title}
            </h3>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                <Edit className="h-4 w-4 mr-2 text-blue-600" />
                Edit Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewParticipants(event._id, event.title)}>
                <Users className="h-4 w-4 mr-2" />
                View Participants
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteEvent(event._id)}
              >
                <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Event Description */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {event.description}
        </p>

        {/* Event Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm flex-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-foreground font-medium truncate">{new Date(event.date).toLocaleDateString()}</span>
          </div>
          {event.time && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="text-foreground font-medium truncate">{event.time}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
              <span className="text-foreground font-medium truncate">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span className="text-foreground font-medium truncate">
              {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Event Footer */}
        <div className="mt-auto pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs gap-1.5 rounded-full font-medium transition-all duration-200 bg-blue-500/10 text-blue-600 hover:bg-blue-500/25 hover:text-blue-700 border border-blue-500/20 hover:border-blue-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:hover:text-blue-300"
            onClick={() => handleViewParticipants(event._id, event.title)}
          >
            <Users className="h-3.5 w-3.5" />
            View Participants
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 animate-in fade-in slide-in- duration-500">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 bg-muted/60" />
            <Skeleton className="h-4 w-80 bg-muted/60" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg bg-muted/60" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in- duration-500" style={{ animationDelay: '100ms' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-4 sm:p-5 bg-card border border-border/50"
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

        {/* Section Title */}
        <div className="animate-in fade-in slide-in- duration-500" style={{ animationDelay: '200ms' }}>
          <Skeleton className="h-6 w-40 bg-muted/60" />
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-5 bg-card border border-border/50 space-y-4 animate-in fade-in slide-in- duration-500"
              style={{ animationDelay: `${300 + i * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4 bg-muted/60" />
                  <Skeleton className="h-6 w-20 rounded-full bg-muted/60" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg bg-muted/60" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full bg-muted/60" />
                <Skeleton className="h-3 w-4/5 bg-muted/60" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded bg-muted/60" />
                  <Skeleton className="h-4 w-24 bg-muted/60" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded bg-muted/60" />
                  <Skeleton className="h-4 w-16 bg-muted/60" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded bg-muted/60" />
                  <Skeleton className="h-4 w-20 bg-muted/60" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded bg-muted/60" />
                  <Skeleton className="h-4 w-28 bg-muted/60" />
                </div>
              </div>
              <Skeleton className="h-8 w-full rounded-lg bg-muted/60" />
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Events Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Create, manage, and track alumni events and gatherings.
          </p>
        </div>

        {/* Create Event Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 h-9 px-4 rounded-full font-medium transition-all duration-200 bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bento-card gradient-surface border-card-border/50" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-foreground">Create New Event</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Fill in the details below to create a new event for the alumni community.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateEvent} className="space-y-6 mt-4">
              {/* Event Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-foreground">
                  Event Title *
                </Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className={`border-card-border/50 focus:border-primary ${formErrors.title ? "border-destructive" : ""
                    }`}
                />
                {formErrors.title && (
                  <p className="text-sm text-destructive">{formErrors.title}</p>
                )}
              </div>

              {/* Event Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your event"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className={`min-h-[100px] border-card-border/50 focus:border-primary resize-none ${formErrors.description ? "border-destructive" : ""
                    }`}
                />
                {formErrors.description && (
                  <p className="text-sm text-destructive">{formErrors.description}</p>
                )}
              </div>

              {/* Date and Time Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-medium text-foreground">
                    Date *
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className={`border-card-border/50 focus:border-primary ${formErrors.date ? "border-destructive" : ""
                      }`}
                  />
                  {formErrors.date && (
                    <p className="text-sm text-destructive">{formErrors.date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-medium text-foreground">
                    Time
                  </Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange("time", e.target.value)}
                    className="border-card-border/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium text-foreground">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Enter event location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="border-card-border/50 focus:border-primary"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-card-border/20">
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
                      Create Event
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchEvents} variant="outline" size="sm" className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 animate-slide-up">
        <div className="stats-card-orange">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Total Events</p>
              <p className="stats-card-number">{totalEvents}</p>
            </div>
            <CalendarDays className="stats-card-icon" />
          </div>
        </div>

        <div className="stats-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Active Events</p>
              <p className="stats-card-number">{activeEventsCount}</p>
            </div>
            <Activity className="stats-card-icon" />
          </div>
        </div>

        <div className="stats-card-teal">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Total Participants</p>
              <p className="stats-card-number">{totalParticipants}</p>
            </div>
            <Users className="stats-card-icon" />
          </div>
        </div>

        <div className="stats-card-pink">
          <div className="flex items-center justify-between">
            <div>
              <p className="stats-card-label">Avg. Participants</p>
              <p className="stats-card-number">{averageParticipants}</p>
            </div>
            <TrendingUp className="stats-card-icon" />
          </div>
        </div>
      </div>

      {/* <div className="grid grid-cols-1 lg:grid-cols-4 gap-6"> */}
      {/* Calendar */}
      {/* <Card className="lg:col-span-1 bento-card gradient-surface border-card-border/50 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Event Calendar</CardTitle>
            <CardDescription>
              Select a date to view events
              {date && getEventsForDate(date).length > 0 && (
                <span className="block text-sm text-primary mt-1">
                  {getEventsForDate(date).length} event(s) on selected date
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-0 w-full"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center",
                row: "flex w-full mt-2",
                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md flex-1",
                day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-md mx-auto flex items-center justify-center",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
              }}
              components={{
                DayContent: ({ date: dayDate }) => dayContentRenderer(dayDate)
              }}
              modifiers={{
                hasEvents: (day) => hasEvents(day),
                hasActiveEvents: (day) => getEventsForDate(day).some(event => event.isactive),
                hasInactiveEvents: (day) => getEventsForDate(day).some(event => !event.isactive)
              }}
              modifiersClassNames={{
                hasEvents: "bg-primary/10 hover:bg-primary/20",
                hasActiveEvents: "text-primary",
                hasInactiveEvents: "text-muted-foreground"
              }}
            />
            
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary"></div>
                <span>Active Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
                <span>Inactive Events</span>
              </div>
            </div>
          </CardContent>
        </Card> */}

      {/* Active Events Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Active Events ({activeEventsList.length})
          </h2>
        </div>

        {activeEventsList.length === 0 ? (
          <Card className="border-card-border/50">
            <CardContent className="pt-12 pb-12 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active events available.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedActiveEvents.map((event, index) => (
                <EventCard key={event._id} event={event} index={index} />
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
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold text-foreground">
            Past Events ({pastEventsList.length})
          </h2>
        </div>

        {pastEventsList.length === 0 ? (
          <Card className="border-card-border/50">
            <CardContent className="pt-12 pb-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No past events to display.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedPastEvents.map((event, index) => (
                <EventCard key={event._id} event={event} index={index} />
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

      {/* Participants Dialog - Redesigned */}
      <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
        <DialogContent
          className="sm:max-w-[700px] max-w-[95vw] bento-card gradient-surface border-card-border/50"
          style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <DialogHeader className="pb-4 border-b border-card-border/20">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl from-primary/20 to-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  Event Participants
                </DialogTitle>
                <DialogDescription className="text-muted-foreground mt-1">
                  {selectedEventTitle} • {selectedEventParticipants.length} registered
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4">
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <p className="text-muted-foreground font-medium">Loading participants...</p>
                </div>
              </div>
            ) : selectedEventParticipants.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No participants yet</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">This event hasn't received any registrations. Share the event to get more participants.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedEventParticipants.map((participant, index) => (
                  <div
                    key={`participant-${participant._id}-${index}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-accent/30 border border-card-border/30 hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 group animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl from-primary/20 to-accent/50 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-background shadow-sm">
                        {participant.avatar ? (
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-primary">
                            {participant.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{participant.name}</h4>
                        <p className="text-sm text-muted-foreground">{participant.email}</p>
                        {participant.course && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {participant.course}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                      Registered
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loadingParticipants && (
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-card-border/20">
              <Button
                variant="outline"
                onClick={() => setIsParticipantsDialogOpen(false)}
                className="border-card-border/50"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bento-card gradient-surface border-card-border/50" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <DialogHeader className="pb-4 border-b border-card-border/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl from-primary/20 to-primary/10 flex items-center justify-center">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">Edit Event</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Update event details below
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleUpdateEvent} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-sm font-medium text-foreground">
                Event Title *
              </Label>
              <Input
                id="edit-title"
                placeholder="Enter event title"
                value={editFormData.title}
                onChange={(e) => handleEditInputChange("title", e.target.value)}
                className={`border-card-border/50 focus:border-primary ${editFormErrors.title ? "border-destructive" : ""}`}
              />
              {editFormErrors.title && <p className="text-sm text-destructive">{editFormErrors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium text-foreground">
                Description *
              </Label>
              <Textarea
                id="edit-description"
                placeholder="Describe your event"
                value={editFormData.description}
                onChange={(e) => handleEditInputChange("description", e.target.value)}
                className={`min-h-[100px] border-card-border/50 focus:border-primary resize-none ${editFormErrors.description ? "border-destructive" : ""}`}
              />
              {editFormErrors.description && <p className="text-sm text-destructive">{editFormErrors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date" className="text-sm font-medium text-foreground">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => handleEditInputChange("date", e.target.value)}
                  className={`border-card-border/50 focus:border-primary ${editFormErrors.date ? "border-destructive" : ""}`}
                />
                {editFormErrors.date && <p className="text-sm text-destructive">{editFormErrors.date}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time" className="text-sm font-medium text-foreground">Time</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editFormData.time}
                  onChange={(e) => handleEditInputChange("time", e.target.value)}
                  className="border-card-border/50 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location" className="text-sm font-medium text-foreground">Location</Label>
              <Input
                id="edit-location"
                placeholder="Enter event location"
                value={editFormData.location}
                onChange={(e) => handleEditInputChange("location", e.target.value)}
                className="border-card-border/50 focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-card-border/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isEditing}
                className="border-card-border/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isEditing}
                className="gradient-primary text-primary-foreground hover:shadow-purple"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Event
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


