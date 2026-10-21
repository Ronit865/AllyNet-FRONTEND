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
  Mail,
  GraduationCap,
  Calendar,
  Briefcase,
  Building,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  email: string;
  graduationYear?: string;
  course?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  isVerified?: boolean;
  position?: string;
  company?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

interface AlumniCardProps {
  alumni: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  index?: number;
}

const InfoRow = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | undefined;
}) => (
  <div className="flex items-start gap-2.5">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      <p className="text-sm font-medium text-foreground truncate leading-snug">
        {value || "-"}
      </p>
    </div>
  </div>
);

const getRoleBadge = (role: string) => {
  const roleStyles = {
    admin: "bg-destructive/15 text-destructive border-destructive/30",
    alumni: "bg-primary/15 text-primary border-primary/30",
    student: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    faculty: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  };

  const colorClass = roleStyles[role?.toLowerCase() as keyof typeof roleStyles] || 
    "bg-muted text-muted-foreground border-muted";

  return (
    <Badge variant="outline" className={`${colorClass} text-[10px] px-2 py-0.5 font-medium`}>
      {role || "User"}
    </Badge>
  );
};

export function AlumniCard({ alumni, onEdit, onDelete, index = 0 }: AlumniCardProps) {
  const initials = alumni.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "UN";

  const position = (alumni as any).position || (alumni as any).jobTitle;
  const company = (alumni as any).company || (alumni as any).organization;
  const location = (alumni as any).location || (alumni as any).city;
  
  const titleText = position && company 
    ? `${position} at ${company}` 
    : position || company || "-";

  return (
    <div 
      className="group relative bg-card border border-border/50 rounded-2xl p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-colors duration-100 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header Section */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="h-12 w-12 ring-2 ring-primary/20 flex-shrink-0">
          <AvatarImage src={alumni.avatar} alt={alumni.name} />
          <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
                {alumni.name || "Unknown"}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Briefcase className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">
                  {titleText}
                </p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(alumni)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(alumni)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Badges */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {getRoleBadge(alumni.role || "")}
            {alumni.isVerified ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0.5">
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px] px-2 py-0.5">
                Pending
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50 mb-3" />

      {/* Information Section */}
      <div className="space-y-2.5">
        <InfoRow icon={Mail} label="Email" value={alumni.email} />
        <InfoRow icon={GraduationCap} label="Course" value={alumni.course} />
        <InfoRow icon={Calendar} label="Graduation Year" value={alumni.graduationYear} />
        <InfoRow icon={Briefcase} label="Current Position" value={position} />
        <InfoRow icon={Building} label="Company" value={company} />
        <InfoRow icon={MapPin} label="Location" value={location} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => window.location.href = `mailto:${alumni.email}`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Message
        </Button>
        <Button 
          size="sm" 
          className="flex-1 h-8 text-xs gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
          onClick={() => onEdit(alumni)}
        >
          <Edit className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
    </div>
  );
}
