import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Content, ContentTypeEnum, Flag, ProjectFormData } from "@/types";
import { createBucketPath } from "@/helpers";
import { Projects,Contents } from "@/api";
import ChapterDialog from "@/components/ChapterDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import ChaptersSection from "@/components/ChaptersSection";
import PairingsSection from "@/components/PairingsSection";
import { PairingSourceEnum } from "@/types";

interface MediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media?: ProjectFormData | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  allowedFields?: string[];
}

const projectsAPI = Projects as Required<typeof Projects>;
const chaptersAPI = Contents as Required<typeof Contents>;

export default function MediaDialog({
  open,
  onOpenChange,
  media,
  onSubmit,
  isLoading = false,
  allowedFields,
}: MediaDialogProps) {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(
    {} as ProjectFormData
  );
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const queryClient = useQueryClient();

  // Chapters UI state (only relevant for Audiobooks)
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Content | null>(null);
  const [deleteChapterDialogOpen, setDeleteChapterDialogOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Content | null>(null);

  const projectId = (media as any)?.id as string | undefined;
  const showChapters =
    (formData as any)?.content_type === ContentTypeEnum.Audiobook ||
    (formData as any)?.content_type === "AudioBook" ||
    (formData as any)?.content_type === ContentTypeEnum.TvShow ||
    (formData as any)?.content_type === "TvShow" ||
    (formData as any)?.content_type === "tv_show";

  const {
    data: chapters = [],
    isLoading: chaptersLoading,
    error: chaptersError,
  } = useQuery<Content[]>({
    queryKey: ["chapters-by-project", projectId],
    enabled: open && !!projectId && showChapters,
    queryFn: async () => {
      const response = await chaptersAPI.get({
        eq: [
          { key: "project_id" as any, value: projectId },
          { key: "is_deleted" as any, value: false },
        ],
        sort: "created_at",
        sortBy: "asc",
      });

      if (response.flag !== Flag.Success || !response.data) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;

        throw new Error(
          supabaseError?.message ||
          response.error?.message ||
          "Failed to fetch chapters"
        );
      }


      const rows = Array.isArray(response.data)
        ? (response.data as any[])
        : ([response.data].filter(Boolean) as any[]);

      // Hide deleted chapters if the schema supports soft-delete
      return rows.filter(
        (r) => !("is_deleted" in r) || r.is_deleted !== true
      ) as Content[];
    },
  });


  const createChapterMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await chaptersAPI.createOne(data);
      if (res.flag !== Flag.Success || !res.data) {
        const supabaseError = res.error?.output as
          | { message?: string }
          | undefined;
        throw new Error(
          supabaseError?.message ||
          res.error?.message ||
          "Failed to create chapter"
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapters-by-project", projectId],
      });
      setChapterDialogOpen(false);
      setSelectedChapter(null);
      toast.success("Chapter saved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await chaptersAPI.updateOneByID(id, data);
      if (res.flag !== Flag.Success || !res.data) {
        const supabaseError = res.error?.output as
          | { message?: string }
          | undefined;
        throw new Error(
          supabaseError?.message ||
          res.error?.message ||
          "Failed to update chapter"
        );
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapters-by-project", projectId],
      });
      setChapterDialogOpen(false);
      setSelectedChapter(null);
      toast.success("Chapter updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete, so it goes to Archive (if you later expose it there)
      const res = await chaptersAPI.toogleSoftDeleteOneByID(id, true);
      if (res.flag !== Flag.Success && res.flag !== Flag.UnknownOrSuccess) {
        const supabaseError = res.error?.output as
          | { message?: string }
          | undefined;
        throw new Error(
          supabaseError?.message ||
          res.error?.message ||
          "Failed to delete chapter"
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chapters-by-project", projectId],
      });
      setDeleteChapterDialogOpen(false);
      setChapterToDelete(null);
      toast.success("Moved chapter to archive.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Fetch projects to get field structure
  useEffect(() => {
    const fetchFields = async () => {
      try {
        setIsLoadingFields(true);
        const response = await projectsAPI.get({ eq: [], limit: 1 });

        if (
          (response.flag === Flag.Success ||
            response.flag === Flag.UnknownOrSuccess) &&
          response.data
        ) {
          const projects = Array.isArray(response.data)
            ? response.data
            : [response.data];

          if (projects.length > 0) {
            const fields = Object.keys(projects[0])
              .filter(
                (key) => !["id", "created_at", "updated_at"].includes(key)
              )
              .filter((key) =>
                allowedFields ? allowedFields.includes(key) : true
              );
            setAvailableFields(fields);

            // Initialize form data
            if (media) {
              // Edit mode - populate with existing data
              const result: Record<string, any> = {};
              Object.entries(media).forEach(([key, value]) => {
                if (allowedFields && !allowedFields.includes(key)) return;
                if (key === "genres" && Array.isArray(value)) {
                  result["commaSeperatedGenres"] = value.join(", ");
                } else {
                  result[key] =
                    value === null || value === undefined ? "" : value;
                }
              });
              setFormData(result as ProjectFormData);
            } else {
              // Add mode - initialize empty fields
              const base: Record<string, any> = {};
              fields.forEach((key) => {
                const sampleValue = (projects[0] as any)[key];

                if (typeof sampleValue === "boolean" || key.startsWith("in_")) {
                  base[key] = false;
                } else if (key === "genres") {
                  base["commaSeperatedGenres"] = "";
                } else {
                  base[key] = "";
                }
              });
              setFormData(base as ProjectFormData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching fields:", error);
        toast.error("Failed to load form fields");
      } finally {
        setIsLoadingFields(false);
      }
    };

    if (open) {
      fetchFields();
    }
  }, [open, media]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const isReadCase = [ContentTypeEnum.Audiobook as any].includes(formData.content_type as any);

    const requiredFields = [
      "title",
      "content_type",
      "status",
      "poster_url",
      "notes",
      "platform",
      "release_year",
      ...(isReadCase ? ["audio_url"] : ["preview_url"])
    ];

    const missingFields = requiredFields.filter(field => {
      if (availableFields.includes(field) || ["content_type", "status", "audio_url", "preview_url"].includes(field)) {
        const value = (formData as any)[field];
        return value === undefined || value === null || value === "";
      }
      return false;
    });

    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map(f => f.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()));
      toast.error(
        `Please fill in all required fields: ${fieldLabels.join(", ")}`
      );
      return;
    }

    // Prepare data for submission
    const submitData: Record<string, any> = {};

    // Only include fields that have actual values
    Object.entries(formData).forEach(([key, value]) => {
      // Skip internal fields
      if (["id", "created_at", "updated_at"].includes(key)) {
        return;
      }

      // Handle different value types
      if (value === "" || value === undefined) {
        submitData[key] = null;
      } else if (
        [
          "release_year",
          "runtime_minutes",
          "order_index",
          "total_episodes",
          "episode_runtime_minutes",
        ].includes(key)
      ) {
        // Convert numeric strings to integers
        submitData[key] = value ? parseInt(String(value)) : null;
      } else if (typeof value === "boolean") {
        submitData[key] = value;
      } else {
        submitData[key] = value;
      }
    });

    await onSubmit(submitData);
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const openAddChapter = () => {
    setSelectedChapter(null);
    setChapterDialogOpen(true);
  };

  const openEditChapter = (c: Content) => {
    setSelectedChapter(c);
    setChapterDialogOpen(true);
  };

  const openDeleteChapter = (c: Content) => {
    setChapterToDelete(c);
    setDeleteChapterDialogOpen(true);
  };

  const submitChapter = async (data: any) => {
    const payload = {
      ...data,
      project_id: projectId,
    };

    if (selectedChapter?.id) {
      await updateChapterMutation.mutateAsync({
        id: selectedChapter.id,
        data: payload,
      });
    } else {
      await createChapterMutation.mutateAsync(payload);
    }
  };


  const renderField = (key: string, value: any) => {
    const isReadCase = formData.content_type === ContentTypeEnum.Audiobook;

    const requiredFields = [
      "title",
      "content_type",
      "status",
      "poster_url",
      "notes",
      "platform",
      "release_year",
      ...(isReadCase ? ["audio_url"] : ["preview_url"])
    ];
    const isRequired = requiredFields.includes(key);

    const label = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    // Special: Content Type Select
    if (key === "content_type") {
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">
            {label} {isRequired ? "*" : ""}
          </Label>
          <Select
            value={value || ""}
            onValueChange={(v) => handleChange(key as keyof ProjectFormData, v)}
          >
            <SelectTrigger className="mt-1.5 capitalize">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ContentTypeEnum.Film}>Film</SelectItem>
              <SelectItem value={ContentTypeEnum.TvShow}>TV Show</SelectItem>
              <SelectItem value={ContentTypeEnum.Song}>Song</SelectItem>
              <SelectItem value={ContentTypeEnum.Audiobook}>
                Audiobook
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Special: Status Select
    if (key === "status") {
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">
            {label} {isRequired ? "*" : ""}
          </Label>
          <Select
            value={value || ""}
            onValueChange={(v) => handleChange(key as keyof ProjectFormData, v)}
          >
            <SelectTrigger className="mt-1.5 capitalize">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="released">Released</SelectItem>
              <SelectItem value="coming_soon">Coming Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Special: Release Status Select (e.g. none / new_release)
    if (key === "release_status") {
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">
            Release Status
          </Label>
          <Select
            value={value ?? "none"}
            onValueChange={(v) => handleChange(key as keyof ProjectFormData, v)}
          >
            <SelectTrigger className="mt-1.5 capitalize">
              <SelectValue placeholder="Select release status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="new_release">New Release</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Special: Boolean / Checkbox
    if (
      key.startsWith("in_") ||
      key === "featured" ||
      key === "is_downloadable"
    ) {
      return (
        <div
          key={key}
          className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/30"
        >
          <Checkbox
            id={key}
            checked={!!value}
            onCheckedChange={(checked: boolean) =>
              handleChange(key as keyof ProjectFormData, checked)
            }
          />
          <Label htmlFor={key} className="font-bold cursor-pointer text-sm">
            {label}
          </Label>
        </div>
      );
    }

    // Special: Genres (comma-separated)
    if (key === "commaSeperatedGenres") {
      return (
        <div key={key} className="col-span-2">
          <Label htmlFor={key} className="font-medium">
            Genres (comma-separated)
          </Label>
          <Input
            id={key}
            type="text"
            value={value || ""}
            onChange={(e) =>
              handleChange(key as keyof ProjectFormData, e.target.value)
            }
            placeholder="e.g., Action, Drama, Comedy"
            className="mt-1.5"
          />
        </div>
      );
    }

    // Skip genres array field (we use commaSeperatedGenres instead)
    if (key === "genres") {
      return null;
    }

    // Default: Input (Numeric or Text)
    const isNumeric = [
      "release_year",
      "runtime_minutes",
      "order_index",
      "total_episodes",
      "episode_runtime_minutes",
      "order",
    ].includes(key);

    const isFullWidth = [
      "title",
      "notes",
      "poster_url",
      "preview_url",
      "platform_url",
      "slug",
      "synopsis",
      "external_url",
      "audio_url",
      "audio_preview_url",
    ].includes(key);

    return (
      <div key={key} className={isFullWidth ? "col-span-2" : ""}>
        <Label htmlFor={key} className="font-medium">
          {label} {isRequired ? "*" : ""}
        </Label>

        {/* Special handling for image/video/audio URLs to allow uploads */}
        {key === "poster_url" ||
          key === "preview_url" ||
          key === "audio_url" ||
          key === "audio_preview_url" ? (
          <div className="mt-1.5 flex gap-2">
            <Input
              id={key}
              type="text"
              value={value ?? ""}
              onChange={(e) =>
                handleChange(key as keyof ProjectFormData, e.target.value)
              }
              placeholder={`Enter or upload ${label.toLowerCase()}`}
              className="flex-1"
            />
            <div className="relative">
              <Input
                type="file"
                className="hidden"
                id={`file-${key}`}
                accept={
                  key === "poster_url"
                    ? "image/*"
                    : key === "preview_url"
                      ? "video/*,image/*"
                      : "audio/*"
                }
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      setIsUploading(key);
                      const bucket = "Media";
                      const safeName = file.name.replace(/\s+/g, "_");
                      const path =
                        key === "audio_url" || key === "audio_preview_url"
                          ? `Audio/${formData.content_type ?? "generic"
                          }/${Date.now()}-${safeName}`
                          : createBucketPath(
                            `${Date.now()}-${safeName}`,
                            formData.content_type!
                          );
                      const publicUrl = await mediaService.uploadFile(
                        file,
                        bucket,
                        path
                      );
                      handleChange(key as keyof ProjectFormData, publicUrl);
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
                {isUploading === key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Upload</span>
              </Button>
            </div>
          </div>
        ) : (
          <Input
            id={key}
            type={isNumeric ? "number" : "text"}
            value={value ?? ""}
            onChange={(e) =>
              handleChange(key as keyof ProjectFormData, e.target.value)
            }
            placeholder={`Enter ${label.toLowerCase()}`}
            required={isRequired}
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

        {isLoadingFields ? (
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="ml-2 text-sm text-slate-500">
              Loading form fields...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-2 gap-5">
              {availableFields
                .filter(
                  (k) =>
                    !k.startsWith("in_") &&
                    k !== "featured" &&
                    k !== "is_downloadable" &&
                    k !== "genres"
                )
                .map((key) => renderField(key, (formData as any)[key]))}

              <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t mt-2">
                {availableFields
                  .filter(
                    (k) =>
                      k.startsWith("in_") ||
                      k === "featured" ||
                      k === "is_downloadable"
                  )
                  .map((key) => renderField(key, (formData as any)[key]))}
              </div>
            </div>

            {/* Chapters section (for Audiobooks & TV Shows) */}
            {showChapters && (
              <ChaptersSection
                projectId={projectId}
                chapters={chapters}
                chaptersLoading={chaptersLoading}
                chaptersError={chaptersError as Error | null}
                onAddChapter={openAddChapter}
                onEditChapter={openEditChapter}
                onDeleteChapter={openDeleteChapter}
                parentContentType={formData.content_type}
              />
            )}


            {/* Pairings section */}
            {projectId && (
              <PairingsSection
                sourceId={projectId}
                sourceRef={formData.content_type as unknown as PairingSourceEnum}
              />
            )}


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

            <ChapterDialog
              open={chapterDialogOpen}
              onOpenChange={(v) => {
                setChapterDialogOpen(v);
                if (!v) setSelectedChapter(null);
              }}
              chapter={selectedChapter as any}
              onSubmit={submitChapter}
              isLoading={
                createChapterMutation.isPending ||
                updateChapterMutation.isPending
              }
              defaultProjectId={projectId ?? null}
              parentContentType={formData.content_type}
            />

            <DeleteConfirmationDialog
              open={deleteChapterDialogOpen}
              onOpenChange={(v) => {
                setDeleteChapterDialogOpen(v);
                if (!v) setChapterToDelete(null);
              }}
              onConfirm={async () => {
                if (chapterToDelete?.id) {
                  await deleteChapterMutation.mutateAsync(chapterToDelete.id);
                }
              }}
              itemName={chapterToDelete?.title}
              isDeleting={deleteChapterMutation.isPending}
              title="Move chapter to archive?"
              description={
                chapterToDelete?.title
                  ? `Are you sure you want to move "${chapterToDelete.title}" to the bin? You’ll be able to permanently delete it later from the Archive.`
                  : "Are you sure you want to move this chapter to the bin?"
              }
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
