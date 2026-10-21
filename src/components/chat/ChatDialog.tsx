import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Send, MoreVertical, Loader2, Trash2, ArrowLeft, Search, MessagesSquare, Check, CheckCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OnlineStatusIndicator } from "@/components/ui/online-status-indicator";
import { messageService, userService } from "@/services/ApiServices";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { containsInappropriateContent } from "@/lib/contentFilter";
import { formatDistanceToNow } from "date-fns";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  conversationId?: string;
  participantName?: string;
  participantAvatar?: string;
}

interface Message {
  _id: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
  delivered?: boolean;
  deliveredAt?: string;
}

interface Conversation {
  _id: string;
  participant: {
    _id: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

export function ChatDialog({
  open,
  onOpenChange,
  userId,
  conversationId: initialConversationId,
  participantName,
  participantAvatar
}: ChatDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [participant, setParticipant] = useState({ name: participantName, avatar: participantAvatar, _id: userId });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConversationList, setShowConversationList] = useState(!initialConversationId && !userId);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { socket, onlineUsers } = useSocket();
  const isParticipantOnline = useOnlineStatus(participant._id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Robust scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    // Attempt 1: Standard scrollIntoView on the end marker (most reliable)
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Scroll to bottom whenever messages change
  useLayoutEffect(() => {
    if (messages.length > 0) {
      // Immediate scroll
      scrollToBottom('auto');

      // Retry after a frame to ensure layout is settled
      requestAnimationFrame(() => {
        scrollToBottom('auto');
      });

      // Safety fallback for image loading or complex renders
      const timeoutId = setTimeout(() => {
        scrollToBottom('auto');
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, conversationId]);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await userService.getCurrentUser();
        const userData = response?.data?.data || response?.data || response;
        setCurrentUser(userData);
      } catch (error) {
        // Error fetching current user
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch conversations when dialog opens without specific conversation
  useEffect(() => {
    if (open && !initialConversationId && !userId) {
      setShowConversationList(true);
      fetchConversations();
    } else if (open && (initialConversationId || userId)) {
      setShowConversationList(false);
    }
  }, [open, initialConversationId, userId]);

  // Create or get conversation when dialog opens
  useEffect(() => {
    if (open && userId && !initialConversationId) {
      createConversation();
    } else if (open && initialConversationId) {
      setConversationId(initialConversationId);
      setParticipant({ name: participantName, avatar: participantAvatar });
      fetchMessagesForConversation(initialConversationId);
    }
  }, [open, userId, initialConversationId]);

  // Real-time message listener
  useEffect(() => {
    if (!socket || !conversationId || !open) return;

    const handleNewMessage = (message: Message) => {
      if (message.conversation?.toString() === conversationId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, { ...message, delivered: true }];
        });
        
        // Mark as read if dialog is open
        messageService.markMessagesAsRead(conversationId);
      }
    };

    const handleMessageRead = (data: { conversationId: string; messageIds: string[]; readAt: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => 
          data.messageIds.includes(m._id) 
            ? { ...m, read: true, readAt: data.readAt }
            : m
        ));
      }
    };

    const handleMessageDelivered = (data: { conversationId: string; messageId: string; deliveredAt: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => 
          m._id === data.messageId 
            ? { ...m, delivered: true, deliveredAt: data.deliveredAt }
            : m
        ));
      }
    };

    const handleTypingIndicator = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId && data.userId !== currentUser?._id) {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          if (data.isTyping) {
            updated.add(data.userId);
          } else {
            updated.delete(data.userId);
          }
          return updated;
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleMessageRead);
    socket.on('message:delivered', handleMessageDelivered);
    socket.on('typing:indicator', handleTypingIndicator);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleMessageRead);
      socket.off('message:delivered', handleMessageDelivered);
      socket.off('typing:indicator', handleTypingIndicator);
    };
  }, [socket, conversationId, open, currentUser]);

  const fetchConversations = async () => {
    try {
      if (conversations.length === 0) setLoading(true); // Only show loader if no cache
      const response = await messageService.getUserConversations();
      const conversationsData = response?.data || [];
      setConversations(Array.isArray(conversationsData) ? conversationsData : []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async () => {
    try {
      setLoading(true);
      const response = await messageService.getOrCreateConversation(userId!);
      const conv = response?.data;
      if (conv) {
        setConversationId(conv._id);
        const otherParticipant = conv.participants?.find((p: any) => p._id !== currentUser?._id);
        setParticipant({
          name: otherParticipant?.name || participantName,
          avatar: otherParticipant?.avatar || participantAvatar,
          _id: otherParticipant?._id || userId
        });
        await fetchMessagesForConversation(conv._id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to create conversation"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessagesForConversation = async (convId: string) => {
    try {
      // Don't modify loading state if we already have messages for this conversation (optimistic switch)
      // But here we are switching conversations, so we usually want a loader or clear previous.
      // To feel "fast", we can clear immediately.
      setLoading(true);
      const response = await messageService.getConversationMessages(convId, { limit: 50 });
      const messagesData = response?.data?.messages || response?.data || [];
      const newMessages = Array.isArray(messagesData) ? messagesData : [];
      setMessages(newMessages);
      await messageService.markMessagesAsRead(convId);
      // Scroll handled by useEffect
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch messages"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setConversationId(conv._id);
    setParticipant({
      name: conv.participant?.name,
      avatar: conv.participant?.avatar,
      _id: conv.participant?._id
    });
    setShowConversationList(false);
    fetchMessagesForConversation(conv._id);
  };

  const handleBackToList = () => {
    setShowConversationList(true);
    setMessages([]);
    setConversationId(undefined);
    fetchConversations();
  };

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!socket || !conversationId) return;

    // Emit typing start
    if (value.trim()) {
      socket.emit('typing:start', { conversationId });

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set timeout to stop typing after 2s of inactivity
      const timeout = setTimeout(() => {
        socket.emit('typing:stop', { conversationId });
      }, 2000);

      setTypingTimeout(timeout);
    } else {
      // Empty input, stop typing immediately
      socket.emit('typing:stop', { conversationId });
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    // Stop typing indicator
    if (socket && typingTimeout) {
      socket.emit('typing:stop', { conversationId });
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    if (containsInappropriateContent(newMessage)) {
      toast({
        variant: "destructive",
        title: "Inappropriate Content Detected",
        description: "Your message contains offensive language. Please remove inappropriate words and try again."
      });
      return;
    }

    // Create optimistic message for instant UI update
    const optimisticMessage: Message = {
      _id: `temp_${Date.now()}`,
      content: newMessage.trim(),
      sender: {
        _id: currentUser?._id || '',
        name: currentUser?.name || 'You',
        avatar: currentUser?.avatar || ''
      },
      createdAt: new Date().toISOString(),
      read: false,
      delivered: false
    };

    // Immediately update UI
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    // Scroll handled by useEffect

    // Send to API in background
    try {
      const response = await messageService.sendMessage(conversationId, optimisticMessage.content);
      const newMsg = response?.data;
      if (newMsg) {
        // Replace optimistic message with real one and mark as delivered
        setMessages(prev => prev.map(m => 
          m._id === optimisticMessage._id 
            ? { ...newMsg, delivered: true, deliveredAt: new Date().toISOString() }
            : m
        ));
      }
    } catch (error: any) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to send message"
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Immediately remove message from UI for instant feedback
    setMessages(prev => prev.filter(m => m._id !== messageId));

    toast({
      title: "Success",
      description: "Message deleted successfully"
    });

    // Call API in background
    try {
      await messageService.deleteMessage(messageId);
    } catch (error: any) {
      // Error deleting message - refresh to restore
      // Optionally refresh messages if failed
      if (conversationId) {
        fetchMessagesForConversation(conversationId);
      }
    }
  };

  const canDeleteMessage = (messageDate: string): boolean => {
    const messageTime = new Date(messageDate).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (now - messageTime) <= twentyFourHours;
  };

  const getMessageTime = (date: string) => {
    try {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return date;
    }
  };

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return date;
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-[90vw] max-w-[95vw] sm:max-w-[80vw] md:max-w-[600px] h-[85vh] sm:h-[80vh] max-h-[85vh] sm:max-h-[80vh] p-0 flex flex-col backdrop-blur-sm border-border/50 shadow-2xl">
        {showConversationList ? (
          <>
            {/* Conversations List Header */}
            <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
              <DialogTitle className="text-base sm:text-lg font-semibold">Personal Messages</DialogTitle>
            </DialogHeader>

            {/* Search */}
            <div className="px-4 sm:px-6 py-2 sm:py-3 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 sm:h-10 text-sm"
                />
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-full py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <MessagesSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => {
                    const isOnline = onlineUsers.has(conv.participant?._id);
                    return (
                      <div
                        key={conv._id}
                        onClick={() => handleSelectConversation(conv)}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-accent cursor-pointer transition-colors active:bg-accent/80"
                      >
                        <div className="relative">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                            <AvatarImage src={conv.participant?.avatar} />
                            <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm sm:text-base">
                              {conv.participant?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <OnlineStatusIndicator online={isOnline} size="sm" position="bottom-right" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate text-sm sm:text-base">{conv.participant?.name}</p>
                              {isOnline && (
                                <span className="text-[10px] text-green-500 font-medium">•</span>
                              )}
                            </div>
                            {conv.lastMessage?.createdAt && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                                {getTimeAgo(conv.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {conv.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Chat Header */}
            <DialogHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBackToList}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="relative">
                  <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary font-medium text-sm">
                      {participant.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineStatusIndicator online={isParticipantOnline} size="sm" position="bottom-right" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-semibold truncate">{participant.name || 'Chat'}</DialogTitle>
                  {isParticipantOnline && (
                    <p className="text-xs text-green-500">Online</p>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 px-3 sm:px-6 py-3 sm:py-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm text-center px-4">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {messages.map((message, index) => {
                    const isMe = message.sender._id === currentUser?._id;
                    const canDelete = isMe && canDeleteMessage(message.createdAt);
                    const showAvatar = !isMe && (index === messages.length - 1 || messages[index + 1]?.sender._id !== message.sender._id);
                    const isFirstInGroup = index === 0 || messages[index - 1]?.sender._id !== message.sender._id;
                    const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender._id !== message.sender._id;

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"} will-change-transform animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%] group ${isMe ? "flex-row" : "flex-row-reverse"}`}>
                          <div className="relative">
                            <div 
                              className={`rounded-2xl px-3 sm:px-4 py-2 shadow-sm ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                                  : "bg-muted rounded-tl-sm"
                              } ${
                                isFirstInGroup ? (isMe ? "rounded-tr-2xl" : "rounded-tl-2xl") : ""
                              } ${
                                isLastInGroup ? (isMe ? "rounded-br-2xl" : "rounded-bl-2xl") : ""
                              }`}
                            >
                              <p className="text-sm break-words leading-relaxed">{message.content}</p>
                              <div className="flex items-center gap-1 justify-end mt-1">
                                <p className={`text-[10px] sm:text-xs ${
                                  isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                                }`}>
                                  {getMessageTime(message.createdAt)}
                                </p>
                                {isMe && (
                                  <span className="flex items-center">
                                    {message.read ? (
                                      <CheckCheck className={`w-3.5 h-3.5 ${
                                        message.readAt ? "text-blue-400" : "text-primary-foreground/70"
                                      }`} />
                                    ) : message.delivered ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/70" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-primary-foreground/70" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isMe && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 sm:transition-opacity h-6 w-6 mb-1 touch-manipulation"
                                >
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMessage(message._id)}
                                  disabled={!canDelete}
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {canDelete ? "Delete message" : "Delete (expired)"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {!isMe && showAvatar && (
                            <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
                              <AvatarImage src={message.sender.avatar} />
                              <AvatarFallback className="bg-primary/20 text-primary text-[10px] sm:text-xs">
                                {message.sender.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {!isMe && !showAvatar && (
                            <div className="w-6 sm:w-8" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {typingUsers.size > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <div className="flex items-center gap-1 px-3 py-2 bg-muted rounded-full w-fit">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">typing...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-t flex-shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleMessageInputChange}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={!conversationId}
                  className="flex-1 h-9 sm:h-10 text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !conversationId}
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
