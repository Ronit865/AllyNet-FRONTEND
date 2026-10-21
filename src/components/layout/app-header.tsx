import { Search, Bell, User, LogOut, MessagesSquare, Calendar, Heart, UserPlus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { authService, notificationService, messageService } from "@/services/ApiServices";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { ChatDialog } from "@/components/chat/ChatDialog";

export function AppHeader() {
  const { user, admin, logout, userType, isLoading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  // Fetch notifications and conversations
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Only fetch connection request notifications for navbar
        const response = await notificationService.getNotifications({
          page: 1,
          limit: 10,
          type: 'connection'
        });
        
        if (response.success && response.data) {
          setNotifications(response.data.notifications || []);
          setUnreadCount(response.data.unreadCount || 0);
        }
      } catch (error) {
        // Failed to fetch notifications
      }
    };

    const fetchRecentConversations = async () => {
      try {
        const response = await messageService.getUserConversations();
        const conversations = response?.data || [];
        const conversationsArray = Array.isArray(conversations) ? conversations : [];
        setRecentConversations(conversationsArray.slice(0, 5));
        
        // Count conversations with unread messages
        const unreadCount = conversationsArray.filter((conv: any) => {
          const lastMessage = conv.lastMessage;
          const currentUserId = localStorage.getItem('userId');
          // Check if last message exists, is not from current user, and is unread
          return lastMessage && 
                 lastMessage.sender !== currentUserId && 
                 !lastMessage.read;
        }).length;
        setUnreadChatsCount(unreadCount);
      } catch (error) {
        // Failed to fetch conversations
      }
    };

    if (isInitialized && (user || admin)) {
      // Only fetch notifications and conversations for non-admin users
      if (userType !== 'admin') {
        fetchNotifications();
        fetchRecentConversations();
        
        // Poll for new notifications every 30 seconds
        const interval = setInterval(() => {
          fetchNotifications();
          fetchRecentConversations();
        }, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [isInitialized, user, admin, userType]);

  // Handle notification click
  const handleNotificationClick = async (notification: any) => {
    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification._id);
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      setNotificationsOpen(false);
      
      // Redirect to connections page for connection-type notifications
      if (notification.type === 'connection') {
        navigate('/connections');
      } else if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      // Failed to mark notification as read
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return timestamp;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'upvote':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'event':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'connection':
        return <UserPlus className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
        variant: "info",
      });
      navigate('/auth/login');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive",
      });
      logout();
      navigate('/auth/login');
    }
  };

  // Get current user data (either user or admin)
  const currentUser = user || admin;
  const displayName = currentUser?.name || 'Guest';
  const displayEmail = currentUser?.email || 'No email';
  const avatarSrc = currentUser?.avatar || '';
  const avatarFallback = displayName && displayName !== 'Guest' 
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) 
    : 'U';

  // Show loading state only if not initialized AND we don't have any user data
  if (!isInitialized && !currentUser) {
    return (
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-l-0">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-l-0">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden h-9 w-9" />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          {/* Personal Messages Button - Hidden for Admin */}
          {userType !== 'admin' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => {
                setSelectedConversation(null);
                setChatDialogOpen(true);
              }}
            >
              <MessagesSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadChatsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-[10px] sm:text-xs text-primary-foreground font-medium">
                    {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
                  </span>
                </span>
              )}
            </Button>
          )}

          {/* Notifications Dropdown - Hidden for Admin */}
          {userType !== 'admin' && (
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs text-primary-foreground font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <ScrollArea className="h-[400px]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    <div className="p-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                            !notification.read ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTimestamp(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {notifications.length > 0 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      className="w-full text-sm"
                      onClick={handleMarkAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
                <div className="relative">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-primary/20">
                    <AvatarImage src={avatarSrc} alt="Profile" />
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium text-xs sm:text-sm">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-background rounded-full"></div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {displayEmail}
                  </p>
                  {userType === 'admin' && (
                    <p className="text-xs leading-none text-primary font-medium">
                      Administrator
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate(userType === 'admin' ? '/admin/settings' : '/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Chat Dialog Popup - Hidden for Admin */}
      {userType !== 'admin' && (
        <ChatDialog 
          open={chatDialogOpen} 
          onOpenChange={setChatDialogOpen}
          conversationId={selectedConversation?._id}
          participantName={selectedConversation?.participant?.name}
          participantAvatar={selectedConversation?.participant?.avatar}
        />
      )}
    </header>
  );
}
