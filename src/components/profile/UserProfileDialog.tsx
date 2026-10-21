import { useState, useEffect } from "react";
import { X, Mail, Briefcase, GraduationCap, Calendar, MapPin, Building2, MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { userService, connectionService } from "@/services/ApiServices";
import { useAuth } from "@/context/AuthContext";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onMessageClick?: (userId: string) => void;
}

export function UserProfileDialog({ open, onOpenChange, userId, onMessageClick }: UserProfileDialogProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [isRequester, setIsRequester] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
      fetchConnectionStatus();
    }
  }, [open, userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await userService.getUserById(userId);
      setUser(response?.data || null);
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    if (!userId) return;

    try {
      const response = await connectionService.getConnectionStatus(userId);
      if (response?.data) {
        setConnectionStatus(response.data.status);
        setIsRequester(response.data.isRequester || false);
        setConnectionId(response.data.connectionId || null);
      }
    } catch (error) {
      console.error("Failed to fetch connection status:", error);
    }
  };

  const handleConnect = async () => {
    if (!userId) return;

    try {
      setActionLoading(true);
      await connectionService.sendConnectionRequest(userId);
      setConnectionStatus('pending');
      toast({
        title: "Connection request sent!",
        description: "Your request has been sent successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send connection request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptConnection = async () => {
    if (!connectionId) return;

    try {
      setActionLoading(true);
      await connectionService.acceptConnectionRequest(connectionId);
      setConnectionStatus('accepted');
      toast({
        title: "Connection accepted!",
        description: "You are now connected.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to accept connection",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = () => {
    if (userId && onMessageClick) {
      onMessageClick(userId);
      onOpenChange(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const isOwnProfile = currentUser?._id === userId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <h2 className="text-xl font-semibold">Profile</h2>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left space-y-3">
                <div>
                  <h3 className="text-2xl font-bold">{user.name}</h3>
                  {user.currentPosition && (
                    <p className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 mt-1">
                      <Briefcase className="w-4 h-4" />
                      {user.currentPosition}
                      {user.company && ` at ${user.company}`}
                    </p>
                  )}
                </div>

                {!isOwnProfile && (
                  <div className="flex gap-2 justify-center sm:justify-start">
                    {connectionStatus === 'none' && (
                      <Button onClick={handleConnect} disabled={actionLoading} className="gap-2 bg-green-500/10 text-green-600 hover:bg-green-500/20 shadow-none border-0 font-semibold">
                        <UserPlus className="w-4 h-4" />
                        Connect
                      </Button>
                    )}
                    {connectionStatus === 'pending' && (
                      <Button variant="outline" disabled className="gap-2 bg-orange-500/10 text-orange-600 border-orange-200/50 font-semibold opacity-100">
                        {isRequester ? 'Request Sent' : 'Request Pending'}
                      </Button>
                    )}
                    {connectionStatus === 'pending' && !isRequester && (
                      <Button onClick={handleAcceptConnection} disabled={actionLoading} className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0 font-semibold">
                        <UserCheck className="w-4 h-4" />
                        Accept
                      </Button>
                    )}
                    {connectionStatus === 'accepted' && (
                      <Badge variant="secondary" className="gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0">
                        <UserCheck className="w-4 h-4" />
                        Connected
                      </Badge>
                    )}
                    <Button variant="outline" onClick={handleMessage} className="gap-2 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200/50 font-semibold shadow-none">
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Details Section */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Information</h4>

              <div className="grid gap-4 sm:grid-cols-2">
                {user.email && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="bg-blue-500/10 text-blue-600 p-2.5 rounded-xl">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email</p>
                      <p className="font-medium text-sm truncate max-w-[200px]" title={user.email}>{user.email}</p>
                    </div>
                  </div>
                )}

                {user.course && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="bg-blue-500/10 text-blue-600 p-2.5 rounded-xl">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Course</p>
                      <p className="font-medium text-sm">{user.course}</p>
                    </div>
                  </div>
                )}

                {user.graduationYear && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="bg-teal-500/10 text-teal-600 p-2.5 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Graduation Year</p>
                      <p className="font-medium text-sm">{user.graduationYear}</p>
                    </div>
                  </div>
                )}

                {user.currentPosition && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="bg-orange-500/10 text-orange-600 p-2.5 rounded-xl">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current Position</p>
                      <p className="font-medium text-sm">{user.currentPosition}</p>
                    </div>
                  </div>
                )}

                {user.company && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="bg-pink-500/10 text-pink-600 p-2.5 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Company</p>
                      <p className="font-medium text-sm">{user.company}</p>
                    </div>
                  </div>
                )}

                {user.location && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="bg-indigo-500/10 text-indigo-600 p-2.5 rounded-xl">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Location</p>
                      <p className="font-medium text-sm">{user.location}</p>
                    </div>
                  </div>
                )}

                {user.phone && (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="bg-green-500/10 text-green-600 p-2.5 rounded-xl">
                      <Mail className="w-5 h-5" /> {/* Phone icon was missing, using Mail temporarily or replace if Phone icon available */}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Phone</p>
                      <p className="font-medium text-sm">{user.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">User not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


