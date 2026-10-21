import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2, Edit, Flag, Share } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { communicationService } from "@/services/ApiServices";
import { toast } from 'sonner';
import { CommentCard } from "@/components/communication/CommentCard";
import { VoteButtons } from "@/components/communication/VoteButtons";
import { containsInappropriateContent } from "@/lib/contentFilter";
import { useAuth } from "@/context/AuthContext";

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, admin } = useAuth(); // Get current user context

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [sortBy, setSortBy] = useState<'top' | 'new'>('top');

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId, sortBy]);

  const fetchPost = async () => {
    try {
      const response = await communicationService.getPostById(postId!);
      if (response.success && response.data) {
        setPost(response.data);
        setIsSaved(response.data.savedBy?.includes(localStorage.getItem('userId')) || false);
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to fetch post" });
    }
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await communicationService.getPostComments(postId!, {
        sortBy,
        limit: 100
      });

      if (response.success && response.data) {
        setComments(response.data.comments || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;

    // Check for inappropriate content
    if (containsInappropriateContent(commentText)) {
      toast.error("Inappropriate Content Detected", { description: "Your comment contains offensive language. Please remove inappropriate words and try again." });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await communicationService.createComment({
        content: commentText,
        postId: postId!,
      });

      if (response.success) {
        toast.success("Comment posted!", { description: "Your comment has been added." });
        setCommentText("");
        fetchComments();
        fetchPost();
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to post comment" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const postUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author?.name || 'Anonymous'}`,
          text: post.content.substring(0, 100),
          url: postUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(postUrl);
        toast("Link copied to clipboard");
      }
    } else {
      await navigator.clipboard.writeText(postUrl);
      toast("Link copied to clipboard");
    }
  };

  const handleSave = async () => {
    try {
      const response = await communicationService.toggleSavePost(postId!);

      if (response.success) {
        setIsSaved(response.data.isSaved);
        toast({
          title: response.data.isSaved ? "Post saved" : "Post unsaved",
          description: response.data.isSaved
            ? "You can find this post in your saved items"
            : "Post removed from saved items",
        });
      }
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to save post" });
    }
  };

  const handleReport = () => {
    toast("Report submitted", { description: "Thank you for letting us know." });
  };

  const handleDelete = async () => {
    // Implement delete logic if needed or redirect
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await communicationService.deletePost(post._id);
      toast("Post deleted");
      navigate(-1);
    } catch (error: any) {
      toast.error("Error", { description: error.message || "Failed to delete" });
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

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background/50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground text-sm">Loading post...</p>
        </div>
      </div>
    );
  }

  // Safe to calculate isAuthor here
  const isAuthor = post.author?._id === (user?._id || admin?._id);
  const currentUser = user || admin;

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="w-full">
        {/* Header - Fixed/Sticky improved */}
        <div className="sticky top-0 z-50 bg-background/95 border-b border-border/40 transition-all duration-200 supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3 max-w-5xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 rounded-full hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" onClick={handleShare} className="rounded-full hover:bg-muted">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Post Content */}
        <div className="flex max-w-5xl mx-auto mt-4 sm:mt-6 px-4">
          {/* Vote Section - Left Side - Sticky */}
          <div className="hidden md:block w-12 pt-2 pr-4 flex-shrink-0 relative">
            <div className="sticky top-20">
              <VoteButtons
                postId={post._id}
                initialUpvotes={post.upvotes}
                initialDownvotes={post.downvotes}
                upvotedBy={post.upvotedBy}
                downvotedBy={post.downvotedBy}
                onUpdate={fetchPost}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
            <Card className="rounded-3xl border-border/60 from-card to-muted/20 overflow-hidden shadow-sm">
              <div className="p-4 sm:p-6">
                {/* Post Header */}
                <div className="flex items-start gap-4 mb-4 sm:mb-6">
                  {/* Mobile Vote Buttons */}
                  <div className="md:hidden">
                    <VoteButtons
                      postId={post._id}
                      initialUpvotes={post.upvotes}
                      initialDownvotes={post.downvotes}
                      upvotedBy={post.upvotedBy}
                      downvotedBy={post.downvotedBy}
                      onUpdate={fetchPost}
                      compact
                    />
                  </div>

                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-background ring-2 ring-border/50 shadow-sm">
                      <AvatarImage src={post.author?.avatar} className="object-cover" />
                      <AvatarFallback className=" from-primary/10 to-primary/20 text-primary font-semibold">
                        {getUserInitials(post.author?.name || 'User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full shadow-sm"></div>
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-base hover:text-primary transition-colors cursor-pointer">
                        {post.author?.name || 'Anonymous'}
                      </span>
                      {post.author?.role === 'admin' && (
                        <Badge variant="default" className="text-[10px] h-5 rounded-full px-2">Admin</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{post.author?.role || 'Alumni'}</span>
                      {post.author?.currentPosition && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{post.author.currentPosition}</span>
                          {post.author?.company && <span className="hidden sm:inline">at {post.author.company}</span>}
                        </>
                      )}
                      <span>•</span>
                      <span>{formatTimestamp(post.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="hidden sm:inline-flex bg-background/50 rounded-full px-3">
                      {post.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      className={`rounded-full h-8 w-8 p-0 hover:bg-yellow-500/10 ${isSaved ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 hover:bg-muted">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        {isAuthor ? (
                          <>
                            <DropdownMenuItem onClick={() => {
                              toast("Edit not implemented in detail view", { description: "Please edit from the feed." });
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={handleDelete}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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

                {/* Mobile Category Badge */}
                <div className="sm:hidden mb-4">
                  <Badge variant="outline" className="bg-background/50 rounded-full px-3">
                    {post.category}
                  </Badge>
                </div>

                {/* Post Content */}
                <div className="prose prose-sm sm:prose-base max-w-none mb-6">
                  <p className="leading-relaxed whitespace-pre-wrap text-foreground/90">
                    {post.content}
                  </p>
                </div>

                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className="mb-6 rounded-2xl overflow-hidden bg-muted/30 border border-border/40">
                    {post.images.length === 1 ? (
                      <img
                        src={post.images[0]}
                        alt="Post image"
                        className="w-full h-auto max-h-[600px] object-contain bg-black/5 dark:bg-black/20"
                      />
                    ) : (
                      <div className={`grid gap-0.5 ${post.images.length === 2 ? 'grid-cols-2' :
                        post.images.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2'
                        }`}>
                        {post.images.map((image: string, index: number) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Post image ${index + 1}`}
                            className="w-full h-64 sm:h-80 object-cover hover:scale-[1.02] transition-transform duration-300"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Separator className="bg-border/50 mb-4" />

                {/* Post Actions */}
                <div className="flex items-center gap-3 sm:gap-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-full px-4 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                    onClick={() => {
                      document.querySelector('.comments-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {post.commentsCount || 0} <span className="hidden sm:inline">Comments</span>
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 rounded-full px-4 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Share</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Comments Section */}
            <Card className="comments-section rounded-3xl border-border/60 from-card to-muted/10 shadow-sm overflow-hidden text-left">
              <div className="p-4 sm:p-6">
                {/* Comment Input */}
                <div className="mb-8">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="relative flex-shrink-0 hidden sm:block">
                      <Avatar className="w-10 h-10 border border-border/50">
                        <AvatarImage src={currentUser?.avatar} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {getUserInitials(currentUser?.name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <Textarea
                          placeholder="What are your thoughts?"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="min-h-[100px] resize-none border-border/60 bg-muted/30 focus:bg-background focus:border-primary/50 rounded-2xl p-4 text-sm sm:text-base transition-all shadow-inner"
                          disabled={isSubmitting}
                        />
                        <div className="absolute bottom-3 right-3 flex gap-2">
                          {commentText && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCommentText("")}
                              disabled={isSubmitting}
                              className="h-8 rounded-full text-xs hover:bg-destructive/10 hover:text-destructive"
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={handleCommentSubmit}
                            disabled={!commentText.trim() || isSubmitting}
                            className="h-8 rounded-full px-4 text-xs font-medium shadow-sm"
                          >
                            {isSubmitting ? "Posting..." : "Comment"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sort and Count */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-lg">
                      <MessageCircle className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold">
                      {comments.length} <span className="text-muted-foreground font-normal">Comments</span>
                    </span>
                  </div>
                  <div className="flex items-center bg-muted/30 p-1 rounded-lg border border-border/30">
                    <Button
                      variant={sortBy === 'top' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSortBy('top')}
                      className={`h-7 px-3 text-xs rounded-md ${sortBy === 'top' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Top
                    </Button>
                    <Button
                      variant={sortBy === 'new' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setSortBy('new')}
                      className={`h-7 px-3 text-xs rounded-md ${sortBy === 'new' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      New
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading comments...</p>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                      <MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground">No comments yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Be the first to share your thoughts on this discussion!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {comments.map((comment, index) => (
                        <div key={comment._id} className={index > 0 ? 'pt-6 border-t border-border/40' : ''}>
                          <CommentCard
                            comment={comment}
                            postId={postId!}
                            onUpdate={fetchComments}
                            depth={0}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}


