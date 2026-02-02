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

import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { ChapterContentTypeEnum, ChapterFormData, ContentTypeEnum } from "@/types";
import { mediaService } from "@/services/mediaService";
import { toast } from "sonner";

interface ChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter?: ChapterFormData | null;
  onSubmit: (data: ChapterFormData) => Promise<void>;
  isLoading?: boolean;
  defaultProjectId?: string | null;
  parentContentType?: string;
}

const emptyForm: ChapterFormData = {
  title: "",
  content_type: ChapterContentTypeEnum.Audio,
  content_url: "",
  project_id: "",
  poster_url: "",
  platform: "",
  episode_number: undefined,
  season_number: undefined,
  description: "",
  thumbnail_url: "",
  rating: "",
  runtime_minutes: undefined,
  release_year: undefined,
  youtube_id: "",
};

export default function ChapterDialog({
  open,
  onOpenChange,
  chapter,
  onSubmit,
  isLoading = false,
  defaultProjectId,
  parentContentType,
}: ChapterDialogProps) {
  const [formData, setFormData] = useState<ChapterFormData>(emptyForm);
  const [isUploading, setIsUploading] = useState(false);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);

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

    // Clean up empty strings to undefined for technical fields
    const submissionData = { ...formData };
    if (!submissionData.content_url) delete submissionData.content_url;
    if (!submissionData.project_id) delete submissionData.project_id;
    if (!submissionData.poster_url) delete submissionData.poster_url;
    if (!submissionData.platform) delete submissionData.platform;
    if (!submissionData.description) delete submissionData.description;
    if (!submissionData.thumbnail_url) delete submissionData.thumbnail_url;
    if (!submissionData.rating) delete submissionData.rating;
    if (!submissionData.youtube_id) delete submissionData.youtube_id;

    await onSubmit(submissionData);
  };

  const isAudiobook = parentContentType === ContentTypeEnum.Audiobook;
  const isTvShow = parentContentType === ContentTypeEnum.TvShow;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{chapter ? "Edit Chapter" : "Add Chapter"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isAudiobook ? "Manage audiobook chapters." : isTvShow ? "Manage TV show episodes." : "Manage chapters."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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

            {isTvShow && (
              <>
                <div>
                  <Label htmlFor="season_number" className="font-medium">
                    Season Number
                  </Label>
                  <Input
                    id="season_number"
                    type="number"
                    value={formData.season_number ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, season_number: parseInt(e.target.value) || undefined }))
                    }
                    placeholder="1"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="episode_number" className="font-medium">
                    Episode Number
                  </Label>
                  <Input
                    id="episode_number"
                    type="number"
                    value={formData.episode_number ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, episode_number: parseInt(e.target.value) || undefined }))
                    }
                    placeholder="1"
                    className="mt-1.5"
                  />
                </div>
              </>
            )}

            {isAudiobook && (
              <div>
                <Label htmlFor="platform" className="font-medium">
                  Platform
                </Label>
                <Input
                  id="platform"
                  value={formData.platform ?? ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, platform: e.target.value }))
                  }
                  placeholder="e.g. Audible"
                  className="mt-1.5"
                />
              </div>
            )}

            {(isTvShow || isAudiobook) && (
              <div>
                <Label htmlFor="release_year" className="font-medium">
                  Release Year
                </Label>
                <Input
                  id="release_year"
                  type="number"
                  value={formData.release_year ?? ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, release_year: parseInt(e.target.value) || undefined }))
                  }
                  placeholder="2024"
                  className="mt-1.5"
                />
              </div>
            )}

            {isTvShow && (
              <>
                <div>
                  <Label htmlFor="runtime_minutes" className="font-medium">
                    Runtime (minutes)
                  </Label>
                  <Input
                    id="runtime_minutes"
                    type="number"
                    value={formData.runtime_minutes ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, runtime_minutes: parseInt(e.target.value) || undefined }))
                    }
                    placeholder="45"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="rating" className="font-medium">
                    Rating
                  </Label>
                  <Input
                    id="rating"
                    value={formData.rating ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, rating: e.target.value }))
                    }
                    placeholder="e.g. PG-13"
                    className="mt-1.5"
                  />
                </div>
              </>
            )}

            <div className={isTvShow ? "md:col-span-2" : ""}>
              <Label htmlFor="youtube_id" className="font-medium">
                {isTvShow ? "YouTube ID / Video ID" : "Online Video ID (Optional)"}
              </Label>
              <Input
                id="youtube_id"
                value={formData.youtube_id ?? ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, youtube_id: e.target.value }))
                }
                placeholder="e.g. dQw4w9WgXcQ"
                className="mt-1.5"
              />
            </div>

            {isTvShow && (
              <div className="md:col-span-2">
                <Label htmlFor="description" className="font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description ?? ""}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Describe the episode..."
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            )}

            {/* Content URL / Audio URL */}
            <div className="md:col-span-2">
              <Label htmlFor="content_url" className="font-medium">
                {isAudiobook ? "Audio URL" : "Content URL"} (optional)
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="content_url"
                  value={(formData.content_url ?? "") as string}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, content_url: e.target.value }))
                  }
                  placeholder="https://..."
                  className="flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    className="hidden"
                    id="chapter-file-upload"
                    accept={isAudiobook ? "audio/*" : "video/*,audio/*"}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setIsUploading(true);
                          const bucket = "Media";
                          const safeName = file.name.replace(/\s+/g, "_");
                          const folder = isAudiobook ? "Audio" : "Video";
                          const path = `${folder}/${parentContentType ?? "generic"}/${Date.now()}-${safeName}`;

                          const publicUrl = await mediaService.uploadFile(
                            file,
                            bucket,
                            path
                          );
                          setFormData((p) => ({ ...p, content_url: publicUrl }));
                          toast.success("File uploaded successfully!");
                        } catch (error: any) {
                          toast.error(`Upload failed: ${error.message}`);
                        } finally {
                          setIsUploading(false);
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => document.getElementById("chapter-file-upload")?.click()}
                    className="h-10 px-3 bg-slate-50 border-dashed"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Upload</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Thumbnail / Poster URL */}
            {(isTvShow || isAudiobook) && (
              <div className="md:col-span-2">
                <Label htmlFor="thumbnail_url" className="font-medium">
                  {isTvShow ? "Thumbnail URL" : "Poster URL"} (optional)
                </Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    id="thumbnail_url"
                    value={(isTvShow ? formData.thumbnail_url : formData.poster_url) ?? ""}
                    onChange={(e) =>
                      setFormData((p) =>
                        isTvShow
                          ? { ...p, thumbnail_url: e.target.value }
                          : { ...p, poster_url: e.target.value }
                      )
                    }
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <div className="relative">
                    <Input
                      type="file"
                      className="hidden"
                      id="thumbnail-file-upload"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsThumbnailUploading(true);
                            const bucket = "Media";
                            const safeName = file.name.replace(/\s+/g, "_");
                            const path = `Thumbnails/${parentContentType ?? "generic"}/${Date.now()}-${safeName}`;

                            const publicUrl = await mediaService.uploadFile(
                              file,
                              bucket,
                              path
                            );
                            setFormData((p) =>
                              isTvShow
                                ? { ...p, thumbnail_url: publicUrl }
                                : { ...p, poster_url: publicUrl }
                            );
                            toast.success("Image uploaded successfully!");
                          } catch (error: any) {
                            toast.error(`Upload failed: ${error.message}`);
                          } finally {
                            setIsThumbnailUploading(false);
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isThumbnailUploading}
                      onClick={() => document.getElementById("thumbnail-file-upload")?.click()}
                      className="h-10 px-3 bg-slate-50 border-dashed"
                    >
                      {isThumbnailUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Upload</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
    </Dialog >
  );
}
