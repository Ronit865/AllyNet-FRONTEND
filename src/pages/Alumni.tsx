import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, MapPin, Briefcase, Calendar, Loader2, MessageCircle, UserPlus, UserCheck, Users, GraduationCap, Mail, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InfoTag } from "@/components/ui/InfoTag";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService, userService, connectionService, handleApiError } from "@/services/ApiServices";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { UserProfileDialog } from "@/components/profile/UserProfileDialog";

// Define the User interface to match your backend model
interface User {
  _id: string;
  name: string;
  email: string;
  graduationYear?: string | number;
  course?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  isVerified?: boolean;
  company?: string;
  position?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Alumni() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [connectionStatuses, setConnectionStatuses] = useState<{ [key: string]: any }>({});
  const [loadingConnections, setLoadingConnections] = useState<{ [key: string]: boolean }>({});
  const { userType } = useAuth();
  const navigate = useNavigate();

  // Fetch alumni data using React Query
  const {
    data: alumniResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["public-alumni", userType],
    queryFn: async () => {
      try {
        const response = userType === 'admin'
          ? await adminService.getAllUsers()
          : await userService.getAllUsers();
        return response;
      } catch (error: any) {
        const apiError = handleApiError(error);
        throw new Error(apiError.message);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Handle error
  useEffect(() => {
    if (error) {
      toast.error("Failed to load alumni data", { description: error.message });
    }
  }, [error]);

  // Extract users from the API response
  const getAllUsersFromResponse = (response: any): User[] => {
    if (Array.isArray(response)) return response;
    if (response?.data) {
      if (Array.isArray(response.data)) return response.data;
      if (response.data?.users && Array.isArray(response.data.users)) return response.data.users;
      if (response.data?.data && Array.isArray(response.data.data)) return response.data.data;
    }
    if (response?.users && Array.isArray(response.users)) return response.users;
    return [];
  };

  const allUsers: User[] = getAllUsersFromResponse(alumniResponse);
  const currentUserId = localStorage.getItem('userId');

  const alumniData: User[] = allUsers.filter(user => {
    if (!user || !user.name || !user.email) return false;
    if (currentUserId && user._id === currentUserId) return false;
    const userRole = user.role?.toLowerCase();
    return userRole === "alumni" || userRole === "alumnus";
  });

  const graduationYears = [...new Set(
    alumniData
      .map(person => {
        const year = person.graduationYear;
        if (year === null || year === undefined) return null;
        const yearStr = String(year);
        return yearStr.trim() !== "" ? yearStr : null;
      })
      .filter(year => year !== null)
  )].sort().reverse();

  const courses = [...new Set(
    alumniData
      .map(person => person.course ? String(person.course).trim() : null)
      .filter(course => course !== null)
  )].sort();

  const filteredAlumni = alumniData.filter(person => {
    const matchesSearch = person.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === "all" || String(person.graduationYear) === selectedYear;
    const matchesIndustry = selectedIndustry === "all" || person.course === selectedIndustry;
    return matchesSearch && matchesYear && matchesIndustry;
  });

  useEffect(() => {
    const fetchConnectionStatuses = async () => {
      for (const person of filteredAlumni) {
        try {
          const response = await connectionService.getConnectionStatus(person._id);
          if (response.success && response.data) {
            setConnectionStatuses(prev => ({
              ...prev,
              [person._id]: response.data
            }));
          }
        } catch (error) {
          console.error(`Failed to fetch connection status for ${person._id}:`, error);
        }
      }
    };
    if (filteredAlumni.length > 0) fetchConnectionStatuses();
  }, [filteredAlumni.length]);

  const handleConnect = async (userId: string) => {
    try {
      setLoadingConnections(prev => ({ ...prev, [userId]: true }));
      const response = await connectionService.sendConnectionRequest(userId);
      if (response.success) {
        toast.success("Connection request sent!", { description: "Your request has been sent successfully." });
        setConnectionStatuses(prev => ({ ...prev, [userId]: { status: 'pending', isRequester: true } }));
      }
    } catch (error: any) {
      toast.error("Failed to send connection request", { description: error.message });
    } finally {
      setLoadingConnections(prev => ({ ...prev, [userId]: false }));
    }
  };

  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const handleMessage = (userId: string) => {
    setSelectedUserId(userId);
    setChatDialogOpen(true);
  };

  const handleAvatarClick = (userId: string) => {
    setSelectedProfileId(userId);
    setProfileDialogOpen(true);
  };

  const AlumniCardsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-[300px] rounded-3xl" />
      ))}
    </div>
  );

  if (error && !alumniResponse) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-destructive">Failed to load alumni data</p>
        <Button onClick={() => refetch()} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Alumni Directory</h1>
          <p className="text-muted-foreground">Connect with {alumniData.length}+ verified alumni</p>
        </div>
        <Button onClick={() => navigate('/connections')} className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/30 font-semibold shadow-sm transition-all active:scale-95" variant="outline">
          <Users className="w-4 h-4" /> My Connections
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search by name, course, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <div className="flex gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Graduation Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {graduationYears.map(year => <SelectItem key={year} value={year}>Class of {year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
            <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder="Course" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(course => <SelectItem key={course} value={course}>{course}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">Showing {filteredAlumni.length} results</div>

      {isLoading ? (
        <AlumniCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredAlumni.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No verified alumni found</p>
              <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedYear("all"); setSelectedIndustry("all"); }}>Clear Filters</Button>
            </div>
          ) : (
            filteredAlumni.map((person) => (
              <Card key={person._id} className="group relative flex flex-col items-center bg-card hover:bg-muted/30 border border-border/40 shadow-sm hover:shadow-lg transition-colors duration-100 rounded-[24px] p-5 h-full overflow-hidden">

                {/* Avatar Section */}
                <div className="relative mb-3 cursor-pointer" onClick={() => handleAvatarClick(person._id)}>
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ring-4 ring-background shadow-sm transition-transform group-hover:scale-105 duration-300">
                    <AvatarImage src={person.avatar} className="object-cover" />
                    <AvatarFallback className="text-xl font-bold from-primary/10 to-primary/30 text-primary rounded-2xl">
                      {person.name?.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {person.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-background p-1 rounded-full">
                      <UserCheck className="w-4 h-4 text-green-500 fill-current" />
                    </div>
                  )}
                </div>

                {/* Name & Badge */}
                <div className="text-center mb-1 w-full px-1">
                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <h3 className="text-lg font-bold text-foreground truncate max-w-[180px]" title={person.name}>
                      {person.name}
                    </h3>
                  </div>

                  {/* Position / Headline */}
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 line-clamp-2 h-9 sm:h-10 flex items-center justify-center text-center leading-tight">
                    {person.position && person.company
                      ? `${person.position} at ${person.company}`
                      : person.position || person.course || "Alumnus"}
                  </p>
                </div>

                {/* Stats / Info Row */}
                <div className="flex items-center justify-center w-full gap-3 my-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full">
                    <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{person.graduationYear || 'N/A'}</span>
                  </div>
                  {(person.location || person.email) && (
                    <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full max-w-[140px]">
                      {person.location ? <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> : <Mail className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="truncate">{person.location || 'Email'}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="w-full mt-auto">
                  {connectionStatuses[person._id]?.status === 'accepted' ? (
                    <Button
                      onClick={() => handleMessage(person._id)}
                      className="w-full rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30 h-10 text-sm font-bold shadow-none border border-blue-200/50 dark:border-blue-500/20"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  ) : connectionStatuses[person._id]?.status === 'pending' ? (
                    <Button disabled className="w-full rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 h-10 text-sm font-bold opacity-100 border border-orange-200/50 dark:border-orange-500/20">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Requested
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleConnect(person._id)}
                      disabled={loadingConnections[person._id]}
                      className="w-full rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:hover:bg-green-500/30 h-10 text-sm font-bold shadow-sm transition-all active:scale-95 border border-green-200/50 dark:border-green-500/20"
                    >
                      {loadingConnections[person._id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Connect +
                        </>
                      )}
                    </Button>
                  )}
                </div>

              </Card>
            ))
          )}
        </div>
      )}

      {/* Chat Dialog */}
      <ChatDialog
        open={chatDialogOpen}
        onOpenChange={setChatDialogOpen}
        userId={selectedUserId || undefined}
      />

      {/* User Profile Dialog */}
      <UserProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={selectedProfileId}
        onMessageClick={(userId) => {
          setSelectedUserId(userId);
          setChatDialogOpen(true);
        }}
      />
    </div>
  );
}
