import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { ChapterContentTypeEnum, ChapterFormData } from "@/types";

interface ChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter?: ChapterFormData | null;
  onSubmit: (data: ChapterFormData) => Promise<void>;
  isLoading?: boolean;
  defaultProjectId?: string | null;
}

const emptyForm: ChapterFormData = {
  title: "",
  content_type: ChapterContentTypeEnum.Audio,
  content_url: "",
  project_id: "",
};

export default function ChapterDialog({
  open,
  onOpenChange,
  chapter,
  onSubmit,
  isLoading = false,
  defaultProjectId,
}: ChapterDialogProps) {
  const [formData, setFormData] = useState<ChapterFormData>(emptyForm);

  useEffect(() => {
    if (!open) return;
    if (chapter) {
      setFormData({
        ...emptyForm,
        ...chapter,
      });
      return;
    }
    setFormData({
      ...emptyForm,
      project_id: defaultProjectId ?? "",
    });
  }, [open, chapter, defaultProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    await onSubmit({
      ...formData,
      // omit empty optional strings
      content_url: formData.content_url || undefined,
      project_id: formData.project_id || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{chapter ? "Edit Chapter" : "Add Chapter"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage audiobook chapters (audio files).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="font-medium">
              Title *
            </Label>
            <Input
              id="title"
              value={(formData.title ?? "") as string}
              onChange={(e) =>
                setFormData((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="e.g. Chapter 1"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="content_type" className="font-medium">
              Content Type
            </Label>
            <Select
              value={
                (formData.content_type ??
                  ChapterContentTypeEnum.Audio) as string
              }
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, content_type: v as any }))
              }
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ChapterContentTypeEnum.Audio}>
                  Audio
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="project_id" className="font-medium">
              Audiobook ID (optional)
            </Label>
            <Input
              id="project_id"
              value={(formData.project_id ?? "") as string}
              onChange={(e) =>
                setFormData((p) => ({ ...p, project_id: e.target.value }))
              }
              placeholder="projects.id"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="content_url" className="font-medium">
              Audio URL (optional)
            </Label>
            <Input
              id="content_url"
              value={(formData.content_url ?? "") as string}
              onChange={(e) =>
                setFormData((p) => ({ ...p, content_url: e.target.value }))
              }
              placeholder="https://..."
              className="mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {chapter ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
