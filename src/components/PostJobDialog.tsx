import { useState, useEffect } from "react";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobService } from "@/services/ApiServices";

interface PostJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  jobData?: {
    id?: string;
    title?: string;
    description?: string;
    location?: string;
    company?: string;
    jobType?: string;
    category?: string;
    experienceRequired?: string;
    salary?: number;
  };
}

export default function PostJobDialog({ open, onOpenChange, onSuccess, jobData }: PostJobDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    company: "",
    jobType: "Full-time",
    category: "",
    experienceRequired: "",
    salary: "",
  });

  useEffect(() => {
    if (jobData) {
      setFormData({
        title: jobData.title || "",
        description: jobData.description || "",
        location: jobData.location || "",
        company: jobData.company || "",
        jobType: jobData.jobType || "Full-time",
        category: jobData.category || "",
        experienceRequired: jobData.experienceRequired || "",
        salary: jobData.salary ? String(jobData.salary) : "",
      });
    }
  }, [jobData, open]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      company: "",
      jobType: "Full-time",
      category: "",
      experienceRequired: "",
      salary: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.location || !formData.company || !formData.category || !formData.experienceRequired || !formData.salary) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const jobDataToSubmit = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        company: formData.company,
        jobType: formData.jobType,
        category: formData.category,
        experienceRequired: formData.experienceRequired,
        salary: Number(formData.salary),
      };

      let response;
      if (jobData?.id) {
        response = await jobService.updateJob(jobData.id, jobDataToSubmit);
      } else {
        response = await jobService.addJob(jobDataToSubmit);
      }

      if (response.success) {
        toast({
          title: "Success",
          description: jobData ? "Job updated successfully!" : "Job posted successfully!",
          variant: "success",
        });
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to post job",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {jobData ? "Edit Job" : "Post a Job"}
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to {jobData ? "update" : "create"} your job posting
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Senior Software Engineer"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              placeholder="e.g. Tech Corp"
              value={formData.company}
              onChange={(e) => handleInputChange("company", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Job description..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              placeholder="e.g. San Francisco, CA"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobType">Job Type *</Label>
            <Select
              value={formData.jobType}
              onValueChange={(value) => handleInputChange("jobType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              placeholder="e.g. Software Engineering"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experienceRequired">Experience Required *</Label>
            <Input
              id="experienceRequired"
              placeholder="e.g. 4+"
              value={formData.experienceRequired}
              onChange={(e) => handleInputChange("experienceRequired", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary">Salary *</Label>
            <Input
              id="salary"
              type="number"
              placeholder="e.g. 456"
              value={formData.salary}
              onChange={(e) => handleInputChange("salary", e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (jobData ? "Updating..." : "Posting...") : (jobData ? "Update Job" : "Post Job")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
