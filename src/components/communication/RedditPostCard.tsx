import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Share, Bookmark, MoreHorizontal, Trash2, Edit, Flag, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoteButtons } from "./VoteButtons";
import { communicationService } from "@/services/ApiServices";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface RedditPostProps {
  post: any;
  onUpdate?: () => void;
}

export function RedditPostCard({ post, onUpdate }: RedditPostProps) {
  const navigate = useNavigate();
  const { confirm: confirmAction, Dialog: ConfirmDialogEl } = useConfirm();
  const [isSaved, setIsSaved] = useState(post.savedBy?.includes(localStorage.getItem('userId')) || false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [isEditing, setIsEditing] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="menuitem"]')
    ) {
      return;
    }
    navigate(`/communications/post/${post._id}`);
  };

  const handleSave = async () => {
    // Immediately update UI for instant feedback
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    toast.success(newSavedState ? "Post saved" : "Removed from saved");

    try {
      await communicationService.toggleSavePost(post._id);
    } catch (error: any) {
      setIsSaved(!newSavedState);
      toast.error("Failed to save post", { description: error.message });
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: "Delete post?",
      description: "This post will be permanently removed. This cannot be undone.",
      confirmText: "Delete post",
      variant: "danger",
    });
    if (!ok) return;
    if (onUpdate) onUpdate();
    toast.success("Post deleted");
    try {
      await communicationService.deletePost(post._id);
    } catch {
      if (onUpdate) onUpdate();
    }
  };

  const handleReport = () => {
    setReportReason("");
    setReportDescription("");
    setReportDialogOpen(true);
  };

  const submitReport = async () => {
    if (!reportReason) {
      toast.error("Please select a reason");
      return;
    }

    setIsReporting(true);
    try {
      await communicationService.reportPost(post._id, {
        reason: reportReason,
        description: reportDescription
      });
      toast.success("Post reported", { description: "We'll review this post." });
      setReportDialogOpen(false);
    } catch (error: any) {
      if (error.response?.data?.message?.includes("already reported")) {
        toast.error("Already reported", { description: "You have already reported this post." });
      } else {
        toast.error("Failed to report", { description: error.message });
      }
    } finally {
      setIsReporting(false);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/communications/post/${post._id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author?.name || 'Anonymous'}`,
          text: post.content.substring(0, 100),
          url: postUrl,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to clipboard
        await navigator.clipboard.writeText(postUrl);
        toast.success("Link copied");
      }
    } else {
      await navigator.clipboard.writeText(postUrl);
      toast.success("Link copied");
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error("Post content cannot be empty");
      return;
    }

    setIsEditing(true);
    try {
      await communicationService.updatePost(post._id, { content: editContent });
      toast.success("Post updated");
      setEditDialogOpen(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast.error("Failed to update post", { description: error.message });
    } finally {
      setIsEditing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString();
  };

  const getUserInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const canDeletePost = (): boolean => {
    // Users can delete their posts anytime now
    return true;
  };

  const isAuthor = post.author?._id === localStorage.getItem('userId');
  const canDelete = isAuthor && canDeletePost();


  return (
    <Card
      className="group relative overflow-hidden rounded-3xl border border-border/60 from-card to-muted/20 p-0 transition-colors duration-100 hover:shadow-lg hover:border-primary/20 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="absolute inset-0 from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex gap-0 relative">
        {/* Vote Section */}
        <VoteButtons
          postId={post._id}
          initialUpvotes={post.upvotes}
          initialDownvotes={post.downvotes}
          upvotedBy={post.upvotedBy || []}
          downvotedBy={post.downvotedBy || []}
          onUpdate={onUpdate}
        />

        {/* Content Section */}
        <div className="flex-1 p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-background ring-2 ring-border/50">
                  <AvatarImage src={post.author?.avatar} className="object-cover" />
                  <AvatarFallback className=" from-primary/10 to-primary/20 text-primary font-semibold text-xs sm:text-sm">
                    {getUserInitials(post.author?.name || 'User')}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full shadow-sm"></div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm hover:text-primary transition-colors">
                    {post.author?.name || 'Anonymous'}
                  </span>
                  {post.author?.graduationYear && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-secondary/50">
                      '{post.author.graduationYear.toString().slice(-2)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{post.author?.role || 'Alumni'}</span>
                  <span>•</span>
                  <span>{formatTimestamp(post.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] px-2 py-0.5 h-6 bg-background/50">
                {post.category}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-muted">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  {isAuthor ? (
                    <>
                      <DropdownMenuItem onClick={() => { setEditContent(post.content); setEditDialogOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={!canDelete}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {canDelete ? 'Delete' : 'Delete (expired)'}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={handleReport}>
                        <Flag className="mr-2 h-4 w-4" />
                        Report
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShare}>
                        <Share className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Message Content */}
          <div className="mb-4 pl-1">
            <div className="sm:hidden mb-2">
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-6 bg-background/50">
                {post.category}
              </Badge>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-foreground/90 whitespace-pre-wrap font-normal">{post.content}</p>

            {/* Images */}
            {post.images && post.images.length > 0 && (
              <div className={`mt-3 grid gap-2 rounded-xl overflow-hidden ${post.images.length === 1 ? 'grid-cols-1' :
                post.images.length === 2 ? 'grid-cols-2' :
                  'grid-cols-3'
                }`}>
                {post.images.map((image: string, index: number) => (
                  <img
                    key={index}
                    src={image}
                    alt={`Post image ${index + 1}`}
                    className="w-full h-auto rounded-lg border object-cover max-h-96 hover:scale-[1.02] transition-transform duration-300"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 pl-1">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/communications/post/${post._id}`);
              }}
              variant="ghost"
              size="sm"
              className="gap-2 h-8 rounded-full px-3 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">{post.commentsCount || 0}</span>
              <span className="hidden sm:inline text-xs">comments</span>
            </Button>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              variant="ghost"
              size="sm"
              className="gap-2 h-8 rounded-full px-3 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
            >
              <Share className="w-4 h-4" />
              <span className="text-xs font-medium">Share</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 h-8 rounded-full px-3 hover:bg-yellow-500/10 transition-colors ${isSaved ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
                }`}
              onClick={handleSave}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              <span className="text-xs font-medium">{isSaved ? 'Saved' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>Make changes to your post below.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-[120px] rounded-xl border-muted-foreground/20 focus:border-primary"
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={handleEdit} disabled={isEditing}>
              {isEditing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>Help us understand why you're reporting this post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                  <SelectItem value="misinformation">Misinformation</SelectItem>
                  <SelectItem value="abuse">Abuse</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Details (Optional)</Label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Provide more context about why you're reporting this post..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitReport} disabled={isReporting || !reportReason} variant="destructive">
              {isReporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      {ConfirmDialogEl}
    </Card>
  );
}