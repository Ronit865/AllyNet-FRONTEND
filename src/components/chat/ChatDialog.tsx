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
import { toast } from "sonner";
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
        setMessages(prev => prev.map(m =>
          m._id === optimisticMessage._id
            ? { ...newMsg, delivered: true, deliveredAt: new Date().toISOString() }
            : m
        ));
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(m => m._id !== optimisticMessage._id));
      toast.error("Failed to send message", { description: error.response?.data?.message });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Immediately remove message from UI for instant feedback
    setMessages(prev => prev.filter(m => m._id !== messageId));

    toast("Success", { description: "Message deleted successfully" });

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
      <DialogContent className="w-[95vw] sm:w-[560px] max-w-[95vw] h-[85vh] max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
        {showConversationList ? (
          <>
            {/* ── List Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0">
              <MessagesSquare className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Messages</h2>
            </div>

            {/* ── Search ── */}
            <div className="px-4 py-2.5 border-b flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search conversations…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
              </div>
            </div>

            {/* ── Conversation list ── */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <MessagesSquare className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                <div>
                  {filteredConversations.map(conv => {
                    const isOnline = onlineUsers.has(conv.participant?._id);
                    return (
                      <button
                        key={conv._id}
                        onClick={() => handleSelectConversation(conv)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-100 border-b border-border/40 last:border-0"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={conv.participant?.avatar} />
                            <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                              {conv.participant?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <OnlineStatusIndicator online={isOnline} size="sm" position="bottom-right" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-sm font-medium truncate">{conv.participant?.name}</p>
                            {conv.lastMessage?.createdAt && (
                              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                                {getTimeAgo(conv.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            {/* ── Chat Header ── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 bg-card">
              <Button variant="ghost" size="icon" onClick={handleBackToList} className="h-8 w-8 flex-shrink-0 -ml-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={participant.avatar} />
                  <AvatarFallback className="bg-muted text-xs font-medium">
                    {participant.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <OnlineStatusIndicator online={isParticipantOnline} size="sm" position="bottom-right" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-none">{participant.name || 'Chat'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isParticipantOnline ? <span className="text-emerald-500 font-medium">Online</span> : 'Offline'}
                </p>
              </div>
            </div>

            {/* ── Messages ── */}
            <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <MessagesSquare className="w-10 h-10 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground">Start the conversation</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((message, index) => {
                    const isMe = message.sender._id === currentUser?._id;
                    const canDelete = isMe && canDeleteMessage(message.createdAt);
                    const isFirstInGroup = index === 0 || messages[index - 1]?.sender._id !== message.sender._id;
                    const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender._id !== message.sender._id;
                    const showAvatar = !isMe && isLastInGroup;

                    return (
                      <div
                        key={message._id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${
                          isFirstInGroup ? 'mt-3' : 'mt-0.5'
                        }`}
                      >
                        {/* Avatar placeholder for incoming */}
                        {!isMe && (
                          <div className="w-7 flex-shrink-0 mr-2 flex items-end">
                            {showAvatar ? (
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={message.sender.avatar} />
                                <AvatarFallback className="text-[9px] bg-muted">
                                  {message.sender.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                          </div>
                        )}

                        <div className={`flex items-end gap-1.5 max-w-[75%] group ${ isMe ? 'flex-row-reverse' : 'flex-row' }`}>
                          {/* Bubble */}
                          <div
                            className={`px-3 py-2 text-sm leading-relaxed shadow-xs ${
                              isMe
                                ? `bg-primary text-primary-foreground ${
                                    isFirstInGroup ? 'rounded-tl-2xl rounded-tr-lg' : 'rounded-tl-2xl rounded-tr-2xl'
                                  } ${ isLastInGroup ? 'rounded-bl-2xl rounded-br-md' : 'rounded-bl-2xl rounded-br-2xl' }`
                                : `bg-muted text-foreground ${
                                    isFirstInGroup ? 'rounded-tl-lg rounded-tr-2xl' : 'rounded-tl-2xl rounded-tr-2xl'
                                  } ${ isLastInGroup ? 'rounded-bl-md rounded-br-2xl' : 'rounded-bl-2xl rounded-br-2xl' }`
                            }`}
                          >
                            <p className="break-words">{message.content}</p>
                            {/* Meta row */}
                            <div className={`flex items-center gap-1 mt-1 ${ isMe ? 'justify-end' : 'justify-start' }`}>
                              <span className={`text-[10px] ${ isMe ? 'text-primary-foreground/60' : 'text-muted-foreground' }`}>
                                {getMessageTime(message.createdAt)}
                              </span>
                              {isMe && (
                                <span>
                                  {message.read ? (
                                    <CheckCheck className={`w-3 h-3 ${ message.readAt ? 'text-sky-300' : 'text-primary-foreground/60' }`} />
                                  ) : message.delivered ? (
                                    <CheckCheck className="w-3 h-3 text-primary-foreground/60" />
                                  ) : (
                                    <Check className="w-3 h-3 text-primary-foreground/50" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Delete menu — only my messages */}
                          {isMe && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMessage(message._id)}
                                  disabled={!canDelete}
                                  className="text-destructive focus:text-destructive text-sm cursor-pointer"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  {canDelete ? 'Delete' : 'Expired'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {typingUsers.size > 0 && (
                    <div className="flex items-end gap-2 mt-3">
                      <div className="w-6 h-6 flex-shrink-0" />
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1 items-center">
                        {[0, 150, 300].map(delay => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-typing-dot"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* ── Input footer ── */}
            <div className="px-4 py-3 border-t bg-card flex-shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Message…"
                  value={newMessage}
                  onChange={handleMessageInputChange}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  disabled={!conversationId}
                  className="flex-1 h-9 text-sm bg-muted/50 border-transparent focus:bg-background focus:border-border"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || !conversationId}
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
