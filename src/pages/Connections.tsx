import { useState, useEffect } from "react";
import { UserPlus, UserCheck, UserX, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { connectionService } from "@/services/ApiServices";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useNavigate } from "react-router-dom";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { UserProfileDialog } from "@/components/profile/UserProfileDialog";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";

export default function Connections() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [myConnections, setMyConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const { confirm, Dialog: ConfirmDialogEl } = useConfirm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, connectionsRes] = await Promise.all([
        connectionService.getPendingRequests(),
        connectionService.getConnections({ status: 'accepted' })
      ]);

      // Backend returns ApiResponse: { statusCode, data, message, success }
      setPendingRequests(pendingRes?.data || []);
      setMyConnections(connectionsRes?.data || []);
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to fetch connections" });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (connectionId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [connectionId]: true }));
      await connectionService.acceptConnectionRequest(connectionId);

      toast.success("Connection accepted!", { description: "You are now connected." });
      fetchData();
    } catch (error: any) {
      toast.error("Failed to accept connection", { description: error.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleReject = async (connectionId: string) => {
    const ok = await confirm({
      title: "Decline Request?",
      description: "Decline this connection request? The sender won't be notified.",
      confirmText: "Decline",
      variant: "warning",
    });
    if (!ok) return;
    try {
      setActionLoading(prev => ({ ...prev, [connectionId]: true }));
      await connectionService.rejectConnectionRequest(connectionId);
      toast.success("Request declined");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to decline request", { description: error.message });
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
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

  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  // Data-only skeleton - static UI renders immediately
  const ConnectionsSkeleton = () => (
    <div className="rounded-2xl bg-card border border-border/50 p-4 sm:p-6">
      <div className="space-y-2 mb-4 sm:mb-6">
        <Skeleton className="h-5 sm:h-6 w-36 sm:w-48" />
        <Skeleton className="h-3 sm:h-4 w-48 sm:w-64" />
      </div>
      <div className="space-y-3 sm:space-y-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 border border-border/50 rounded-lg animate-in fade-in slide-in-from-right-2 duration-300"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
              <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32" />
              <Skeleton className="h-2.5 sm:h-3 w-36 sm:w-48" />
              <Skeleton className="h-2.5 sm:h-3 w-28 sm:w-40" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton className="h-8 sm:h-9 w-20 sm:w-24 rounded-lg" />
              <Skeleton className="h-8 sm:h-9 w-20 sm:w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header - Always visible */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text mb-1 sm:mb-2">Connections</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your alumni network connections
        </p>
      </div>

      {/* Show skeleton or tabs content */}
      {loading ? (
        <ConnectionsSkeleton />
      ) : (
        <Tabs defaultValue="requests" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="requests" className="gap-1 sm:gap-2 text-xs sm:text-sm relative">
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Requests</span>
              {pendingRequests.length > 0 && (
                <Badge className="ml-1 px-1.5 min-w-[18px] h-4 sm:h-5 text-[10px] sm:text-xs" variant="destructive">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>My Connections</span>
            </TabsTrigger>
          </TabsList>

          {/* Pending Requests */}
          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Connection Requests
                </CardTitle>
                <CardDescription>
                  {pendingRequests.length === 0
                    ? "No pending requests"
                    : `${pendingRequests.length} ${pendingRequests.length === 1 ? 'person wants' : 'people want'} to connect with you`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending connection requests</p>
                    <Button
                      variant="outline"
                      className="mt-4 border-blue-500/50 text-blue-600 hover:bg-blue-500 hover:text-white"
                      onClick={() => navigate('/alumni')}
                    >
                      Browse Alumni
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div
                        key={request._id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="relative cursor-pointer" onClick={() => handleAvatarClick(request.requester?._id)}>
                          <Avatar className="w-12 h-12 hover:ring-4 ring-primary/20 transition-all">
                            <AvatarImage src={request.requester?.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {getUserInitials(request.requester?.name || 'User')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold">{request.requester?.name || 'Anonymous'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {request.requester?.currentPosition || 'Alumni'}
                            {request.requester?.graduationYear && ` • Class of ${request.requester.graduationYear}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{request.requester?.email}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAccept(request._id)}
                            disabled={actionLoading[request._id]}
                            className="gap-2 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/25 hover:text-green-700 border border-green-500/20 hover:border-green-500/40 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/30 dark:hover:text-green-300"
                          >
                            <UserCheck className="w-4 h-4" />
                            {actionLoading[request._id] ? "..." : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(request._id)}
                            disabled={actionLoading[request._id]}
                            className="gap-2 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/25 hover:text-red-700 border border-red-500/20 hover:border-red-500/40 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-red-500/15 dark:text-red-400 dark:hover:bg-red-500/30 dark:hover:text-red-300"
                          >
                            <UserX className="w-4 h-4" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Connections */}
          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  My Connections
                </CardTitle>
                <CardDescription>
                  {myConnections.length === 0
                    ? "No connections yet"
                    : `${myConnections.length} ${myConnections.length === 1 ? 'connection' : 'connections'}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {myConnections.length === 0 ? (
                  <div className="text-center py-12">
                    <UserCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No connections yet</p>
                    <Button
                      variant="outline"
                      className="mt-4 border-blue-500/50 text-blue-600 hover:bg-blue-500 hover:text-white"
                      onClick={() => navigate('/alumni')}
                    >
                      Browse Alumni
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myConnections.map((connection) => (
                      <div
                        key={connection._id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="relative cursor-pointer" onClick={() => handleAvatarClick(connection.user?._id)}>
                          <Avatar className="w-12 h-12 hover:ring-4 ring-primary/20 transition-all">
                            <AvatarImage src={connection.user?.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {getUserInitials(connection.user?.name || 'User')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{connection.user?.name || 'Anonymous'}</h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {connection.user?.currentPosition || 'Alumni'}
                          </p>
                          {connection.user?.graduationYear && (
                            <p className="text-xs text-muted-foreground">
                              Class of {connection.user.graduationYear}
                            </p>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-4 mt-2 gap-2 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500/25 hover:text-blue-700 border border-blue-500/20 hover:border-blue-500/40 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:hover:text-blue-300"
                            onClick={() => handleMessage(connection.user._id)}
                          >
                            <Mail className="w-3 h-3" />
                            Message
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
      {ConfirmDialogEl}
    </div>
  );
}



