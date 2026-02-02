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
import { Loader2 } from "lucide-react";
import { FooterFormData } from "@/types";

interface FooterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: FooterFormData | null;
  onSubmit: (data: FooterFormData) => Promise<void>;
  isLoading?: boolean;
}

const emptyForm: FooterFormData = {
  title: "",
  url: "",
  icon_url: "",
};

export default function FooterDialog({
  open,
  onOpenChange,
  footer,
  onSubmit,
  isLoading = false,
}: FooterDialogProps) {
  const [formData, setFormData] = useState<FooterFormData>(emptyForm);

  useEffect(() => {
    if (open) {
      if (footer) {
        setFormData({
          ...emptyForm,
          ...footer,
        });
      } else {
        setFormData(emptyForm);
      }
    }
  }, [open, footer]);

  const handleChange = (
    field: keyof FooterFormData,
    value: string | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {footer ? "Edit Footer Link" : "Add Footer Link"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manage social links and connect links shown in the footer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="font-medium">
              Title *
            </Label>
            <Input
              id="title"
              value={formData.title ?? ""}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Instagram"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="url" className="font-medium">
              URL
            </Label>
            <Input
              id="url"
              type="text"
              value={formData.url ?? ""}
              onChange={(e) => handleChange("url", e.target.value)}
              placeholder="https://... (optional)"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="icon_url" className="font-medium">
              Icon URL
            </Label>
            <Input
              id="icon_url"
              type="text"
              value={formData.icon_url ?? ""}
              onChange={(e) => handleChange("icon_url", e.target.value)}
              placeholder="https://... (optional)"
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
              {footer ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
