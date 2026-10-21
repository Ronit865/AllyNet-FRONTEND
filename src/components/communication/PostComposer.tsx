import { useState, useRef } from "react";
import { Send, ImageIcon, BarChart3, Link2, Bold, Italic, Code, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { communicationService } from "@/services/ApiServices";
import { containsInappropriateContent } from "@/lib/contentFilter";

const categories = [
  "General",
  "Mentorship",
  "Events",
  "Research",
  "Jobs",
  "Alumni Stories"
];

interface PostComposerProps {
  onPostCreated?: () => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > 5) {
      toast.error("Max 5 images per post");
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim() || !selectedCategory) {
      toast.error("Please fill in content and select a category");
      return;
    }

    if (containsInappropriateContent(content)) {
      toast.error("Inappropriate content detected", { description: "Please remove offensive language and try again." });
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('content', content);
      formData.append('category', selectedCategory);

      // Append images
      images.forEach((image) => {
        formData.append('images', image);
      });

      const response = await communicationService.createPost(formData);

      if (response.success) {
        toast.success("Post published!");
        setContent(""); setSelectedCategory(""); setImages([]); setImagePreviews([]);
        if (onPostCreated) onPostCreated();
      }
    } catch (error: any) {
      toast.error("Failed to post", { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden surface-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <Avatar className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-background ring-2 ring-border/50">
              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-semibold text-xs sm:text-base">
                AD
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-background rounded-full shadow-sm"></div>
          </div>

          <div className="flex-1 space-y-3 sm:space-y-4">
            {/* Category Selection */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-muted-foreground">Post to:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px] sm:w-40 h-8 text-xs sm:text-sm rounded-full border-border/60 bg-background/50 focus:ring-primary/20">
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category} className="rounded-lg cursor-pointer">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Input */}
            <div className="space-y-3">
              <Textarea
                placeholder="What's on your mind? Share something with the alumni community..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] sm:min-h-[120px] resize-none border-border/60 bg-background/50 focus:bg-background focus:border-primary/50 text-sm sm:text-base rounded-2xl transition-all duration-200"
                disabled={isSubmitting}
              />

              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-16 sm:h-20 object-cover rounded-xl border border-border/50"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formatting Tools */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 pt-1">
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <Button variant="ghost" size="sm" className="p-1.5 sm:p-2 h-8 w-8 rounded-full hover:bg-muted" disabled>
                    <Bold className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1.5 sm:p-2 h-8 w-8 rounded-full hover:bg-muted" disabled>
                    <Italic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1.5 sm:p-2 h-8 w-8 rounded-full hover:bg-muted" disabled>
                    <Code className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isSubmitting || images.length >= 5}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1.5 sm:p-2 h-8 w-8 rounded-full hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || images.length >= 5}
                  >
                    <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1.5 sm:p-2 h-8 w-8 rounded-full hover:bg-muted" disabled>
                    <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="p-1.5 sm:p-2 h-8 w-8 rounded-full hover:bg-muted" disabled>
                    <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                  <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap font-medium">
                    {content.length}/5000
                  </span>
                  <Button
                    onClick={handleSubmit}
                    disabled={!content.trim() || !selectedCategory || isSubmitting}
                    size="sm"
                    className="gap-2 px-6 h-9 text-sm rounded-full bg-primary hover:bg-primary/90 shadow-sm transition-all hover:shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}