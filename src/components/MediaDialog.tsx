import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload } from "lucide-react";
import { mediaService } from "@/services/mediaService";
import { toast } from "sonner";
import { ContentTypeEnum, ProjectFormData, ProjectStatusEnum } from "@/types";
import { createBucketPath } from "@/helpers/constants/supabase";

interface MediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media?: ProjectFormData | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export default function MediaDialog({
  open,
  onOpenChange,
  media,
  onSubmit,
  isLoading = false,
}: MediaDialogProps) {
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const defaultBase: ProjectFormData = {
    title: "",
    //@ts-ignore
    content_type: "",
    //@ts-ignore
    status: "",
    commaSeperatedGenres: "",
    poster_url: "",
    preview_url: "",
    platform: "",
    platform_url: "",
    notes: "",
    in_now_playing: false,
    in_coming_soon: false,
    in_latest_releases: false,
  };

  const [formData, setFormData] = useState<ProjectFormData>(defaultBase);

  useEffect(() => {
    if (media) {

      const contentTypeMap: Record<string, ContentTypeEnum> = {
        'film': ContentTypeEnum.Film,
        'tvShow': ContentTypeEnum.TvShow,
        'song': ContentTypeEnum.Song,
        'audiobook': ContentTypeEnum.Audiobook,
      };
      
      const statusMap: Record<string, ProjectStatusEnum> = {
        'released': ProjectStatusEnum.Released,
        'coming_soon': ProjectStatusEnum.ComingSoon,
        // 'watched': ProjectStatusEnum.Watched,
        // 'inProgress': ProjectStatusEnum.InProgress,
        // 'inProduction': ProjectStatusEnum.InProduction,
      };
      
      // Merge media data with base to ensure any missing fields are initialized
      setFormData({
        ...defaultBase,
        title: media.title,
        content_type: contentTypeMap[media.content_type!] ?? ContentTypeEnum.Film,
        status: statusMap[media.status!] ?? ProjectStatusEnum.ComingSoon,
        poster_url: media.poster_url ?? undefined,
        preview_url: media.preview_url ?? undefined,
        release_year: media.release_year ?? undefined,
        runtime_minutes: media.runtime_minutes ?? undefined,
        notes: media.notes ?? undefined,
        platform: media.platform ?? undefined,
        platform_url: media.platform_url ?? undefined,
        in_now_playing: media.in_now_playing,
        in_coming_soon: media.in_coming_soon,
        in_latest_releases: media.in_latest_releases,
        order_index: media.order_index ?? undefined,
      });
    } else if (open) {
      setFormData(defaultBase);
    }
  }, [media, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data for submission
    const submitData: Record<string, any> = { ...formData };
    
    // Convert numeric strings back to integers
    const numFields = ["release_year", "runtime_minutes", "order_index"];
    numFields.forEach(field => {
      if (submitData[field]) {
        submitData[field] = parseInt(submitData[field]);
      } else {
        submitData[field] = null;
      }
    });

    // Handle nulls for optional strings (but keep genres as array)
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === "" && !["id", "created_at", "updated_at"].includes(key)) {
        submitData[key] = null;
      }
    });

    // Clean up internal fields that shouldn't be sent to update
    delete submitData.id;
    delete submitData.created_at;
    delete submitData.updated_at;

    await onSubmit(submitData);
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderField = (key: keyof ProjectFormData, value: any) => {
    // Skip administrative fields
    if (["id", "created_at", "updated_at"].includes(key)) return null;

    const label = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    // Special: Content Type Select
    if (key === "content_type") {
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">{label} *</Label>
          <Select value={value} onValueChange={(v) => handleChange(key, v)}>
            <SelectTrigger className="mt-1.5 capitalize">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ContentTypeEnum.Film}>Film</SelectItem>
              <SelectItem value={ContentTypeEnum.TvShow}>TV Show</SelectItem>
              <SelectItem value={ContentTypeEnum.Song}>Song</SelectItem>
              <SelectItem value={ContentTypeEnum.Audiobook}>Audiobook</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Special: Status Select
    if (key === "status") {
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">{label} *</Label>
          <Select value={value} onValueChange={(v) => handleChange(key, v)}>
            <SelectTrigger className="mt-1.5 capitalize">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="coming_soon">Coming Soon</SelectItem>
              {/* <SelectItem value="watched">Watched</SelectItem>
              <SelectItem value="inProgress">In Progress</SelectItem>
              <SelectItem value="inProduction">In Production</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Special: Boolean / Checkbox
    if (key.startsWith("in_") || typeof value === "boolean") {
      return (
        <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/30">
          <Checkbox 
            id={key}
            checked={!!value}
            onCheckedChange={(checked: boolean) => handleChange(key as keyof ProjectFormData, checked)}
          />
          <Label htmlFor={key} className="font-bold cursor-pointer text-sm">{label}</Label>
        </div>
      );
    }

    // Special: Genres (Array of strings - display as comma-separated)
    if (key === "commaSeperatedGenres") {
      return (
        <div key={key} className="col-span-2">
          <Label htmlFor={key} className="font-medium">Comma Seperated Genres</Label>
          <Input
            id={key}
            type="text"
            value={formData.commaSeperatedGenres}
            onChange={(e) => setFormData(curr=>({...curr, commaSeperatedGenres:e.target.value}))}
            placeholder="Enter genres separated by commas (e.g., Action, Drama, Comedy)"
            className="mt-1.5"
          />
        </div>
      );
    }

    // Default: Input (Numeric or Text)
    const isNumeric = ["release_year", "runtime_minutes", "order_index"].includes(key);
    const isFullWidth = ["title", "notes", "poster_url", "preview_url", "platform_url"].includes(key);

    return (
      <div key={key} className={isFullWidth ? "col-span-2" : ""}>
        <Label htmlFor={key} className="font-medium">
          {label} {key === "title" ? "*" : ""}
        </Label>
        
        {/* Special handling for image/video URLs to allow uploads */}
        {(key === "poster_url" || key === "preview_url") ? (
          <div className="mt-1.5 flex gap-2">
            <Input
              id={key}
              type="text"
              value={value ?? ""}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={`Enter or upload ${label.toLowerCase()}`}
              className="flex-1"
            />
            <div className="relative">
              <Input
                type="file"
                className="hidden"
                id={`file-${key}`}
                accept={key === "poster_url" ? "image/*" : "video/*,image/*"}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      setIsUploading(key);
                      const bucket = "Media"; 
                      const path = createBucketPath(`${Date.now()}-${file.name.replace(/\s+/g, "_")}`, formData.content_type!);
                      const publicUrl = await mediaService.uploadFile(file, bucket, path);
                      handleChange(key, publicUrl);
                      toast.success(`${label} uploaded successfully!`);
                    } catch (error: any) {
                      toast.error(`Upload failed: ${error.message}`);
                    } finally {
                      setIsUploading(null);
                    }
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                disabled={isUploading === key}
                onClick={() => document.getElementById(`file-${key}`)?.click()}
                className="h-10 px-3 bg-slate-50 border-dashed"
              >
                {isUploading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Upload</span>
              </Button>
            </div>
          </div>
        ) : (
          <Input
            id={key}
            type={isNumeric ? "number" : "text"}
            value={value ?? ""}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            required={key === "title"}
            className="mt-1.5"
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {media ? "Edit Content" : "Add New Content"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Universal Dynamic Form - All fields detected from database
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-5">
            {Object.keys(formData)
              .filter(k => !k.startsWith('in_') && typeof (formData as Record<string, any>)[k] !== 'boolean')
              .map((key) => renderField(key as keyof ProjectFormData, (formData as any)[key]))}
            
            <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t mt-2">
              {Object.keys(formData)
                .filter(k => k.startsWith('in_') || typeof (formData as Record<string, any>)[k] === 'boolean')
                .map(key => renderField(key as keyof ProjectFormData, (formData as Record<string, any>)[key]))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pb-2 pt-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-6 h-11 rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="px-8 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {media ? "Update Content" : "Save Content"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
