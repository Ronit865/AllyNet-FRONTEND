import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { communicationService } from "@/services/ApiServices";
import { toast } from 'sonner';

interface VoteButtonsProps {
  postId?: string;
  commentId?: string;
  initialUpvotes: number;
  initialDownvotes: number;
  upvotedBy: string[];
  downvotedBy: string[];
  onUpdate?: () => void;
  compact?: boolean;
}

export function VoteButtons({
  postId,
  commentId,
  initialUpvotes,
  initialDownvotes,
  upvotedBy,
  downvotedBy,
  onUpdate,
  compact = false
}: VoteButtonsProps) {
  const userId = localStorage.getItem('userId');
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(
    upvotedBy?.includes(userId || '') ? 'up' :
    downvotedBy?.includes(userId || '') ? 'down' : null
  );
  const [voteCount, setVoteCount] = useState(initialUpvotes - initialDownvotes);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting) return;
    
    try {
      setIsVoting(true);
      
      // Optimistic update
      let newVoteCount = voteCount;
      let newVote: 'up' | 'down' | null = voteType;

      // Remove previous vote
      if (currentVote === 'up') newVoteCount--;
      if (currentVote === 'down') newVoteCount++;
      
      // Apply new vote or remove if same
      if (currentVote === voteType) {
        newVote = null;
      } else {
        if (voteType === 'up') newVoteCount++;
        if (voteType === 'down') newVoteCount--;
      }

      setCurrentVote(newVote);
      setVoteCount(newVoteCount);

      // API call
      if (postId) {
        if (voteType === 'up') {
          await communicationService.upvotePost(postId);
        } else {
          await communicationService.downvotePost(postId);
        }
      } else if (commentId) {
        if (voteType === 'up') {
          await communicationService.upvoteComment(commentId);
        } else {
          await communicationService.downvoteComment(commentId);
        }
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      // Revert on error
      setCurrentVote(currentVote);
      setVoteCount(voteCount);
      
      toast({
        title: "Error",
        description: error.message || "Failed to vote",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col items-center gap-0.5 min-w-[28px]">
        <Button
          variant="ghost"
          size="sm"
          className={`p-0.5 h-6 w-6 rounded-md transition-all ${
            currentVote === 'up' 
              ? 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20' 
              : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/5'
          }`}
          onClick={() => handleVote('up')}
          disabled={isVoting}
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
        
        <span className={`text-xs font-bold py-0.5 px-1 rounded ${
          voteCount > 0 
            ? 'text-orange-500' 
            : voteCount < 0 
              ? 'text-blue-500' 
              : 'text-muted-foreground'
        }`}>
          {voteCount > 0 ? '+' : ''}{voteCount}
        </span>
        
        <Button
          variant="ghost"
          size="sm"
          className={`p-0.5 h-6 w-6 rounded-md transition-all ${
            currentVote === 'down' 
              ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20' 
              : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5'
          }`}
          onClick={() => handleVote('down')}
          disabled={isVoting}
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-2 from-muted/50 to-muted/30 border-r border-border min-w-[48px]">
      <Button
        variant="ghost"
        size="sm"
        className={`p-1.5 h-auto rounded-lg transition-all hover:scale-110 ${
          currentVote === 'up' 
            ? 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20 shadow-sm' 
            : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/5'
        }`}
        onClick={() => handleVote('up')}
        disabled={isVoting}
      >
        <ArrowUp className="w-5 h-5" />
      </Button>
      
      <span className={`text-sm font-bold py-2 ${
        voteCount > 0 
          ? 'text-orange-500' 
          : voteCount < 0 
            ? 'text-blue-500' 
            : 'text-muted-foreground'
      }`}>
        {voteCount > 0 ? '+' : ''}{voteCount}
      </span>
      
      <Button
        variant="ghost"
        size="sm"
        className={`p-1.5 h-auto rounded-lg transition-all hover:scale-110 ${
          currentVote === 'down' 
            ? 'text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 shadow-sm' 
            : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-500/5'
        }`}
        onClick={() => handleVote('down')}
        disabled={isVoting}
      >
        <ArrowDown className="w-5 h-5" />
      </Button>
    </div>
  );
}
