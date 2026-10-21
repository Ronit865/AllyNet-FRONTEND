import { useState, useEffect } from "react";
import { MessageCircle, MoreHorizontal, Trash2, Edit2, CornerDownRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VoteButtons } from "./VoteButtons";
import { communicationService } from "@/services/ApiServices";
import { toast } from 'sonner';
import { containsInappropriateContent } from "@/lib/contentFilter";

interface CommentCardProps {
  comment: any;
  postId: string;
  onUpdate: () => void;
  depth?: number;
}

export function CommentCard({ comment, postId, onUpdate, depth = 0 }: CommentCardProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const userId = localStorage.getItem('userId');

  // Auto-load replies on mount
  useEffect(() => {
    if (depth < 3 && !repliesLoaded) {
      fetchReplies();
    }
  }, []);

  const fetchReplies = async () => {
    if (repliesLoaded) return;

    try {
      setLoadingReplies(true);
      const response = await communicationService.getCommentReplies(comment._id);

      if (response.success && response.data) {
        setReplies(response.data.replies || []);
        setRepliesLoaded(true);
      }
    } catch (error) {
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) return;

    // Check for inappropriate content
    if (containsInappropriateContent(replyText)) {
      toast({
        title: "Inappropriate Content Detected",
        description: "Your reply contains offensive language. Please remove inappropriate words and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await communicationService.createComment({
        content: replyText,
        postId,
        parentCommentId: comment._id,
      });

      if (response.success) {
        toast({
          title: "Reply posted!",
          description: "Your reply has been added.",
        });
        setReplyText("");
        setShowReplyBox(false);

        // Refresh replies
        const repliesResponse = await communicationService.getCommentReplies(comment._id);
        if (repliesResponse.success && repliesResponse.data) {
          setReplies(repliesResponse.data.replies || []);
          setRepliesLoaded(true);
        }

        onUpdate();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post reply",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editText.trim() || editText === comment.content) {
      setIsEditing(false);
      return;
    }

    // Check for inappropriate content
    if (containsInappropriateContent(editText)) {
      toast({
        title: "Inappropriate Content Detected",
        description: "Your comment contains offensive language. Please remove inappropriate words and try again.",
        variant: "destructive",
      });
      return;
    }

    // Immediately update UI and close edit mode
    const originalContent = comment.content;
    comment.content = editText;
    setIsEditing(false);

    toast({
      title: "Comment updated",
      description: "Your comment has been updated.",
    });

    // Call API in background
    try {
      await communicationService.updateComment(comment._id, {
        content: editText
      });
      onUpdate();
    } catch (error: any) {
      // Revert on error
      comment.content = originalContent;
      setEditText(originalContent);
      onUpdate();
      toast({
        title: "Error",
        description: error.message || "Failed to update comment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    // Immediately update UI for instant feedback
    onUpdate();

    toast({
      title: "Comment deleted",
      description: "Your comment has been removed.",
    });

    // Call API in background
    try {
      await communicationService.deleteComment(comment._id);
    } catch (error: any) {
      // Error deleting comment - refresh to restore
      onUpdate();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const canDeleteComment = (): boolean => {
    const commentTime = new Date(comment.createdAt).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (now - commentTime) <= twentyFourHours;
  };

  const isAuthor = comment.author?._id === userId;
  const canDelete = isAuthor && canDeleteComment();

  const maxDepth = 5;
  const shouldShowReplyButton = depth < maxDepth;

  return (
    <div className="group animate-in fade-in slide-in- duration-300">
      <div className="flex gap-3 py-1">
        {/* Vote Section - Vertical */}
        <div className="flex-shrink-0 pt-1">
          <VoteButtons
            commentId={comment._id}
            initialUpvotes={comment.upvotes || 0}
            initialDownvotes={comment.downvotes || 0}
            upvotedBy={comment.upvotedBy || []}
            downvotedBy={comment.downvotedBy || []}
            onUpdate={onUpdate}
            compact
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0 mt-0.5">
              <Avatar className="w-8 h-8 border border-border/40">
                <AvatarImage src={comment.author?.avatar} className="object-cover" />
                <AvatarFallback className=" from-primary/10 to-primary/20 text-primary text-xs font-semibold">
                  {getUserInitials(comment.author?.name || 'User')}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full shadow-sm"></div>
            </div>

            <div className="flex-1 min-w-0 bg-muted/10 p-3 rounded-2xl rounded-tl-sm border border-border/20 hover:border-border/40 transition-colors">
              {/* Comment Header */}
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="text-sm font-semibold text-foreground/90 hover:text-primary transition-colors cursor-pointer">
                  {comment.author?.name || 'Anonymous'}
                </span>
                {comment.author?.currentPosition && (
                  <>
                    <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {comment.author.currentPosition}
                    </span>
                  </>
                )}
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(comment.createdAt)}
                </span>
              </div>

              {/* Comment Content */}
              {isEditing ? (
                <div className="space-y-3 my-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[80px] bg-background border-border/60 focus:border-primary text-sm rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleEdit} className="h-7 text-xs rounded-full px-3">
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditText(comment.content);
                      }}
                      className="h-7 text-xs rounded-full px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80 font-normal mb-2">
                  {comment.content}
                </p>
              )}

              {/* Comment Actions */}
              <div className="flex items-center gap-1 mt-1">
                {shouldShowReplyButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReplyBox(!showReplyBox)}
                    className={`h-6 px-2 text-xs font-medium rounded-full ${showReplyBox ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
                  >
                    <CornerDownRight className="w-3 h-3 mr-1.5" />
                    Reply
                  </Button>
                )}

                {isAuthor && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32 rounded-xl">
                      <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs">
                        <Edit2 className="mr-2 h-3 w-3" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={!canDelete}
                        className="text-xs text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        {canDelete ? 'Delete' : 'Expired'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Reply Box */}
          {showReplyBox && (
            <div className="mt-3 ml-11 bg-muted/20 rounded-2xl p-3 border border-border/40 animate-in slide-in- duration-200">
              <Textarea
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[80px] mb-3 bg-background text-sm rounded-xl border-border/50 focus:border-primary/50"
                disabled={isSubmitting}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReplyBox(false);
                    setReplyText("");
                  }}
                  className="h-8 text-xs rounded-full px-3"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim() || isSubmitting}
                  className="h-8 text-xs rounded-full px-4"
                >
                  {isSubmitting ? "Posting..." : "Reply"}
                </Button>
              </div>
            </div>
          )}

          {/* Nested Replies with vertical line */}
          {repliesLoaded && replies.length > 0 && (
            <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/10 hover:border-primary/30 transition-colors space-y-4">
              {replies.map((reply) => (
                <CommentCard
                  key={reply._id}
                  comment={reply}
                  postId={postId}
                  onUpdate={() => {
                    fetchReplies();
                    onUpdate();
                  }}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {loadingReplies && (
            <div className="mt-2 ml-12 text-xs text-muted-foreground animate-pulse">
              Loading replies...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
