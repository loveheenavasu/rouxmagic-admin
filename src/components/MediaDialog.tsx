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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload } from "lucide-react";
import { mediaService } from "@/services/mediaService";
import { toast } from "sonner";
import { Content, ContentTypeEnum, Flag, ProjectFormData, FilterTypeEnum } from "@/types";
import { createBucketPath } from "@/helpers";
import { Projects, Contents } from "@/api";
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
  defaultValues?: Partial<ProjectFormData>;
  assignmentPage?: string;
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
  defaultValues,
  assignmentPage,
}: MediaDialogProps) {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(
    {} as ProjectFormData
  );
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  // Row Assignment Mode state
  const [addMode, setAddMode] = useState<"standard" | "row">("standard");
  // Renamed local state to avoid conflict with prop
  const [localAssignmentPage, setLocalAssignmentPage] = useState<string>(assignmentPage || "home");
  const [targetRowId, setTargetRowId] = useState<string>("");

  const queryClient = useQueryClient();

  // MERGE-based apply: adds this row's flags without clearing others
  const applyRowTemplate = (row: any) => {
    if (!row) return;

    const { filter_type, filter_value, label } = row;
    setFormData(prev => {
      const next = { ...prev };
      // Ensure status is an array
      let currentStatuses = Array.isArray(next.status) ? [...next.status] : (next.status ? [next.status] : []);

      const addStatus = (s: string) => {
        if (s && !currentStatuses.includes(s as any)) currentStatuses.push(s as any);
      };

      // Update content_type (Single selection)
      if (filter_type === FilterTypeEnum.ContentType) {
        next.content_type = filter_value as any;
      } else if (filter_type === FilterTypeEnum.Audiobook) {
        next.content_type = ContentTypeEnum.Audiobook as any;
      } else if (filter_type === FilterTypeEnum.Song) {
        next.content_type = ContentTypeEnum.Song as any;
      } else if (filter_type === FilterTypeEnum.Flag) {
        // Special case: 'Coming Soon' should update status array
        if (label.toLowerCase().includes('coming soon')) {
          addStatus('coming_soon');
          next.in_coming_soon = true;
        } else {
          // If it's not a boolean flag, we don't have a place for multiple custom labels 
          // if content_type is a string. We'll set it as content_type for now.
          next.content_type = label as any;
        }
      } else if (filter_type === FilterTypeEnum.Status) {
        addStatus(filter_value);
        if (filter_value === 'coming_soon') next.in_coming_soon = true;
      }

      next.status = currentStatuses as any;

      if (filter_type === FilterTypeEnum.Flag) {
        const norm = (val: string) => val.toLowerCase().trim();
        const matchedField = availableFields.find(f => {
          const nf = norm(f);
          const nv = norm(filter_value);
          const nvUnder = nv.replace(/\s+/g, '_');
          return nf === nv || nf === nvUnder || nf === `in_${nvUnder}`;
        });

        if (matchedField) {
          (next as any)[matchedField] = true;
        }
      }

      return next;
    });
  };

  // REMOVE: unsets only this row's specific flag/status
  const removeRowTemplate = (row: any) => {
    if (!row) return;
    const { filter_type, filter_value } = row;
    setFormData(prev => {
      const next = { ...prev };
      let currentStatuses = Array.isArray(next.status) ? [...next.status] : (next.status ? [next.status] : []);

      const removeType = () => {
        next.content_type = "" as any;
      };

      const removeStatus = (s: string) => {
        currentStatuses = currentStatuses.filter(existing => String(existing).toLowerCase() !== String(s).toLowerCase());
      };

      if (filter_type === FilterTypeEnum.Flag) {
        const norm = (val: string) => val.toLowerCase().trim();
        const matchedField = availableFields.find(f => {
          const nf = norm(f);
          const nv = norm(filter_value);
          const nvUnder = nv.replace(/\s+/g, '_');
          return nf === nv || nf === nvUnder || nf === `in_${nvUnder}`;
        });

        if (matchedField) {
          (next as any)[matchedField] = false;
        }

        // Special case for 'Coming Soon' Flag
        if ((row.label || '').toLowerCase().includes('coming soon')) {
          removeStatus('coming_soon');
          next.in_coming_soon = false;
        }
      }

      if (filter_type === FilterTypeEnum.Status) {
        removeStatus(filter_value);
        if (filter_value === 'coming_soon') next.in_coming_soon = false;
      }

      if (filter_type === FilterTypeEnum.ContentType || filter_type === FilterTypeEnum.Audiobook || filter_type === FilterTypeEnum.Song) {
        removeType();
      }

      // Remove the label from content_type for non-Status rows, 
      // EXCEPT 'Coming Soon' which lives in status.
      if (row.label && filter_type !== FilterTypeEnum.Status && !row.label.toLowerCase().includes('coming soon')) {
        if (next.content_type === row.label) {
          removeType();
        }
      }

      next.status = currentStatuses as any;
      return next;
    });
  };

  // Chapters UI state (only relevant for Audiobooks)
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Content | null>(null);
  const [deleteChapterDialogOpen, setDeleteChapterDialogOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Content | null>(null);

  const projectId = (media as any)?.id as string | undefined;
  const showChapters = (() => {
    const types = Array.isArray(formData.content_type) ? formData.content_type : (formData.content_type ? [formData.content_type] : []);
    const norm = (t: any) => String(t || "").toLowerCase();
    return types.some(t =>
      norm(t) === "audiobook" ||
      norm(t) === "tv show" ||
      norm(t) === "tvshow" ||
      norm(t) === "tv_show"
    );
  })();

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

  // Fetch ALL content_rows to get all filter_values (not just content_type)
  const { data: contentRowFilters = [] } = useQuery({
    queryKey: ["content-row-filters", "all"],
    queryFn: async () => {
      const { ContentRows } = await import(
        "@/api/integrations/supabase/content_rows/content_rows"
      );
      // Fetch ALL active content_rows
      const resp = await (ContentRows as any).get({
        eq: [{ key: "is_active", value: true }], // Only fetch active rows
        sort: "order_index",
        sortBy: "asc",
      });

      if (resp.flag !== Flag.Success && resp.flag !== Flag.UnknownOrSuccess) {
        console.error("Failed to fetch content row filters:", resp.error);
        return [];
      }

      const rows = Array.isArray(resp.data)
        ? resp.data
        : resp.data
          ? [resp.data].filter(Boolean)
          : [];

      return rows.filter((r: any) =>
        r.label?.toLowerCase() !== 'my list' &&
        !['mylist', 'my_list', 'my list'].includes(r.page?.toLowerCase())
      );
    },
    enabled: open, // Only fetch when dialog is open
    staleTime: 0,
  });

  // Calculate matched rows based on current formData
  const matchedRows = (contentRowFilters as any[]).filter((row) => {
    if (!formData) return false;
    const { filter_type, filter_value, label } = row;

    // Normalize helper
    const norm = (val: any) => String(val || "").toLowerCase().trim();
    const hasType = (t: string) => {
      return norm(formData.content_type) === norm(t);
    };
    const hasStatus = (s: string) => {
      const statuses = Array.isArray((formData as any).status) ? (formData as any).status : [(formData as any).status];
      return statuses.some((existing: any) => norm(existing) === norm(s));
    };

    if (filter_type === FilterTypeEnum.ContentType) {
      return hasType(filter_value);
    }

    if (filter_type === FilterTypeEnum.Status) {
      if (hasStatus(filter_value)) return true;
      if (hasType(label)) return true;
      return false;
    }

    if (filter_type === FilterTypeEnum.Audiobook) {
      return hasType(ContentTypeEnum.Audiobook) || hasType("audiobook");
    }

    if (filter_type === FilterTypeEnum.Song) {
      return hasType(ContentTypeEnum.Song) || hasType("song");
    }

    if (filter_type === FilterTypeEnum.Flag) {
      // 1. Check direct database flag
      const keyMatches = Object.keys(formData).find(k =>
        norm(k) === norm(filter_value) ||
        norm(k) === `in_${norm(filter_value).replace(/\s+/g, '_')}`
      );
      if (keyMatches && !!(formData as any)[keyMatches]) return true;

      // 2. Special case for 'Coming Soon'
      if ((label || '').toLowerCase().includes('coming soon')) {
        return hasStatus('coming_soon');
      }

      // 3. Check if label is in content_type
      if (hasType(label)) return true;

      return false;
    }

    return false;
  });

  // Auto-select row if editing and not set
  useEffect(() => {
    if (open && matchedRows.length > 0 && !targetRowId) {
      // Prefer a row that matches the current page assignment if possible
      const preferred = matchedRows.find(r => r.page === localAssignmentPage) || matchedRows[0];
      if (preferred) {
        setTargetRowId(preferred.id);
        // If we are in "row" mode, this visually selects it.
        // If we are in "standard" mode, it just sets the state ready for toggle.
      }
    }
  }, [open, matchedRows.length, localAssignmentPage]);



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
            const KNOWN_FLAGS: string[] = ["in_hero_carousel", "in_theaters"];
            const MANDATORY_EXTRA_FIELDS: string[] = ["genres", "vibe_tags"];
            const ALL_POSSIBLE_FIELDS: string[] = [
              "title", "status", "platform", "platform_url", "notes", "poster_url",
              "order_index", "content_type", "platform_name", "poster_preview_url",
              "preview_url", "order", "slug", "synopsis", "release_year",
              "runtime_minutes", "external_url", "cta_label", "venue_type",
              "venue_name", "city", "country", "start_date", "end_date",
              "ticket_url", "creators", "writers", "directors", "stars",
              "rating", "total_episodes", "audio_url", "audio_path",
              "release_status", "release_date", "youtube_id", "audio_preview_url"
            ];

            const fields = Array.from(new Set([
              ...Object.keys(projects[0]),
              ...KNOWN_FLAGS,
              ...MANDATORY_EXTRA_FIELDS,
              ...ALL_POSSIBLE_FIELDS
            ]))
              .filter(
                (key) => !["id", "created_at", "updated_at", "ownership", "episode_runtime_minutes", "screening_status", "deleted_at", "is_deleted", "play_behavior"].includes(key)
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

                const arrayFields = ["creators", "cast", "directors", "producers", "writers", "tags", "stars", "writer", "director", "star", "status", "genres", "vibe_tags"];
                if (arrayFields.includes(key)) {
                  let arr = value;
                  if (typeof arr === 'string' && arr.startsWith('[') && arr.endsWith(']')) {
                    try { arr = JSON.parse(arr); } catch (e) { arr = [arr]; }
                  }
                  result[key] = Array.isArray(arr) ? arr : (arr ? [arr] : []);
                }
                else {
                  result[key] =
                    value === null || value === undefined ? "" : value;
                }
              });

              // Sync in_coming_soon flag and status array
              const currentStatuses = Array.isArray(result.status) ? [...result.status] : (result.status ? [result.status] : []);
              if (result.in_coming_soon === true && !currentStatuses.includes("coming_soon")) {
                currentStatuses.push("coming_soon");
              }
              if (currentStatuses.includes("coming_soon")) {
                result.in_coming_soon = true;
              }
              result.status = currentStatuses;

              setFormData(result as ProjectFormData);
            } else {
              // Add mode - initialize empty fields
              const base: Record<string, any> = {};
              fields.forEach((key) => {

                const arrayFields = ["genres", "status", "vibe_tags"];
                if (arrayFields.includes(key)) {
                  base[key] = [];
                } else if (key === "content_type") {
                  base[key] = "";
                } else {
                  base[key] = "";
                }
              });

              // Apply default values if provided
              if (defaultValues) {
                Object.assign(base, defaultValues);
              }

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
      // Skip internal fields and play_behavior
      if (["id", "created_at", "updated_at", "play_behavior", "commaSeperatedGenres"].includes(key)) {
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
      } else {
        // Handle other possible array fields
        const arrayFields = ["creators", "cast", "directors", "producers", "writers", "tags", "stars", "writer", "director", "star", "status", "genres", "vibe_tags"];
        if (arrayFields.includes(key)) {
          if (Array.isArray(value)) {
            // Keep as array for backend if backend supports it, otherwise join
            submitData[key] = value.filter(Boolean);
          } else if (typeof value === 'string') {
            const items = value.split(/[,\n]/).map((v) => {
              const trimmed = v.trim();
              if (["genres", "vibe_tags"].includes(key) && trimmed) {
                return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
              }
              return trimmed;
            }).filter(Boolean);

            // Deduplicate
            submitData[key] = Array.from(new Set(items));
          } else {
            submitData[key] = value;
          }
        } else {
          submitData[key] = value;
        }
      }
    });


    console.log("Submitting data to database:", submitData);
    await onSubmit(submitData);
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Sync status -> in_coming_soon flag
      if (field === "status") {
        const statuses = Array.isArray(value) ? value : (value ? [value] : []);
        const norm = (v: any) => String(v || "").toLowerCase().trim();
        const IsComingSoon = statuses.some(s => norm(s) === "coming_soon");
        (next as any).in_coming_soon = IsComingSoon;
      }

      // If 'Song' is selected in content_type, ensure it is set as primary type
      if (field === "content_type") {
        // Any auto-logic for content types can go here
      }

      return next;
    });
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
    const isReadCase = (() => {
      const types = Array.isArray(formData.content_type) ? formData.content_type : (formData.content_type ? [formData.content_type] : []);
      return types.some(t => String(t).toLowerCase() === "audiobook");
    })();

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
      const standardTypes = [
        { value: ContentTypeEnum.Film, label: "Film" },
        { value: ContentTypeEnum.TvShow, label: "TV Show" },
        { value: ContentTypeEnum.Song, label: "Song" },
        { value: ContentTypeEnum.Audiobook, label: "Audiobook" },
      ];

      const knownStatuses = ['coming soon', 'released', 'draft', 'archived', 'scheduled'];
      const knownFlags = ['now playing', 'coming soon', 'latest releases', 'hero carousel', 'featured', 'new release', 'trending', 'my list', 'mylist'];

      const customTypes = (contentRowFilters as any[])
        .map(r => r.label)
        .filter(l => {
          if (!l) return false;
          const low = l.toLowerCase();
          const isStandardType = [
            ContentTypeEnum.Film,
            ContentTypeEnum.TvShow,
            ContentTypeEnum.Song,
            ContentTypeEnum.Audiobook
          ].some(t => t.toLowerCase() === low);
          const isKnown = knownStatuses.includes(low) || knownFlags.some(f => low.includes(f));
          return !isStandardType && !isKnown;
        });

      const allOptions = [
        ...standardTypes,
        ...Array.from(new Set(customTypes)).map(ct => ({ value: ct, label: ct }))
      ];

      const parseArray = (val: any): string[] => {
        if (Array.isArray(val)) return val.map(String);
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed.map(String) : [val];
            } catch (e) {
              return [val];
            }
          }
          if (val.includes(",")) return val.split(",").map(v => v.trim()).filter(Boolean);
          return val ? [val] : [];
        }
        return val ? [String(val)] : [];
      };

      const currentTypes = parseArray(value);

      const toggleType = (t: string) => {
        const next = currentTypes.includes(t)
          ? currentTypes.filter(existing => existing !== t)
          : [...currentTypes, t];
        handleChange(key as keyof ProjectFormData, next);
      };

      return (
        <div key={key} className="col-span-2 space-y-2">
          <Label className="font-medium">
            {label} {isRequired ? "*" : ""}
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {currentTypes.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No types selected</span>
            ) : (
              currentTypes.map((t: string) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100 cursor-pointer transition-colors"
                  onClick={() => toggleType(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)} <span className="ml-1 opacity-60">×</span>
                </Badge>
              ))
            )}
          </div>
          <Select
            value=""
            onValueChange={toggleType}
          >
            <SelectTrigger className="capitalize">
              <SelectValue placeholder="Add another type..." />
            </SelectTrigger>
            <SelectContent>
              {allOptions.map((type) => (
                <SelectItem key={type.value} value={type.value} disabled={currentTypes.includes(type.value)}>
                  {type.label} {currentTypes.includes(type.value) ? "✓" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400 italic">Click a badge above to remove it. Multiple types allow assignment to multiple rows.</p>
        </div>
      );
    }

    // Special: Status Select
    if (key === "status") {
      const standardStatuses = [
        { value: "released", label: "Released" },
        { value: "coming_soon", label: "Coming Soon" },
      ];

      const parseArray = (val: any): string[] => {
        if (Array.isArray(val)) return val.map(String);
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? parsed.map(String) : [val];
            } catch (e) {
              return [val];
            }
          }
          if (val.includes(",")) return val.split(",").map(v => v.trim()).filter(Boolean);
          return val ? [val] : [];
        }
        return val ? [String(val)] : [];
      };

      const currentStatuses = parseArray(value);

      const toggleStatus = (s: string) => {
        const next = currentStatuses.includes(s)
          ? currentStatuses.filter((existing: string) => existing !== s)
          : [...currentStatuses, s];
        handleChange(key as keyof ProjectFormData, next);
      };

      return (
        <div key={key} className="col-span-2 space-y-2">
          <Label className="font-medium">
            {label} {isRequired ? "*" : ""}
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {currentStatuses.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No statuses selected</span>
            ) : (
              currentStatuses.map((s: string) => (
                <Badge
                  key={s}
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100 cursor-pointer transition-colors capitalize"
                  onClick={() => toggleStatus(s)}
                >
                  {(() => {
                    const sNorm = s.replace(/_/g, " ");
                    return sNorm.charAt(0).toUpperCase() + sNorm.slice(1);
                  })()} <span className="ml-1 opacity-60">×</span>
                </Badge>
              ))
            )}
          </div>
          <Select
            value=""
            onValueChange={toggleStatus}
          >
            <SelectTrigger className="capitalize">
              <SelectValue placeholder="Add another status..." />
            </SelectTrigger>
            <SelectContent>
              {standardStatuses.map((stat) => (
                <SelectItem key={stat.value} value={stat.value} disabled={currentStatuses.includes(stat.value)}>
                  {stat.label} {currentStatuses.includes(stat.value) ? "✓" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400 italic">Click a badge above to remove it. Multiple statuses allow an item to be in both 'Released' and 'Coming Soon'.</p>
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


    // Unified Field Guide for simple help text
    const fieldGuide: Record<string, { description: string; example?: string }> = {
      title: { description: "Name of the content as seen in the catalog." },
      content_type: { description: "Classification for routing and playback." },
      status: { description: "Release status: 'released' is live, 'coming_soon' shows teaser." },
      poster_url: { description: "Primary display image URL." },
      preview_url: { description: "Teaser video or thumbnail URL." },
      notes: { description: "Internal notes or brief summary." },
      platform: { description: "Where is this available? (YouTube, Netflix, etc.)" },
      platform_url: { description: "Direct link to the content platform." },
      release_year: { description: "Year of original release (YYYY)." },
      runtime_minutes: { description: "Total duration in minutes." },
      ownership: { description: "Numeric identifier for licensing/ownership." },
      creators: { description: "Authors or creators. Enter names separated by commas.", example: "John Doe, Jane Smith" },
      stars: { description: "Main stars or lead performers. Enter names separated by commas.", example: "Star One, Star Two" },
      directors: { description: "Directors. Enter names separated by commas." },
      writers: { description: "Writers. Enter names separated by commas." },
      genres: { description: "Genres for filtering. Enter comma-separated.", example: "Action, Drama" },
      vibe_tags: { description: "Vibe tags for mood/aesthetic. Enter comma-separated.", example: "Chill, Dark, Uplifting" },
      flavor_tags: { description: "Flavor tags for recipes. Enter comma-separated.", example: "Spicy, Sweet, Savory" },
      order_index: { description: "Listing priority (lower is higher)." },
      audio_url: { description: "Direct audio file link." },
      audio_preview_url: { description: "Link to audio clip for preview." },
      slug: { description: "URL-friendly name. Auto-generated if empty." },
      synopsis: { description: "Brief overview or plot summary." },
      venue_name: { description: "Name of the event venue or location." },
      city: { description: "City where the event or production is located." },
      country: { description: "Country of origin or event location." },
      ticket_url: { description: "Direct link for purchasing tickets." }
    };

    const isDate = key.endsWith("_at") || key.includes("date") || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value));
    const knownArrayFields = ["creators", "cast", "directors", "producers", "writers", "tags", "stars", "writer", "director", "star", "status", "genres", "vibe_tags", "flavor_tags"];
    const isArrayField = knownArrayFields.includes(key);
    const fieldInfo = fieldGuide[key];

    // Special: Date Fields
    if (isDate) {
      const dateValue = value && typeof value === 'string' ? value.split('T')[0] : "";
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">
            {label} {isRequired ? "*" : ""}
          </Label>
          <Input
            id={key}
            type="date"
            value={dateValue}
            onChange={(e) => handleChange(key as keyof ProjectFormData, e.target.value)}
            className="mt-1.5"
            required={isRequired}
          />
          <p className="mt-1 text-[10px] text-slate-400 italic">Format: YYYY-MM-DD</p>
        </div>
      );
    }

    // Special: Array fields
    if (isArrayField) {
      const getDisplayValue = (val: any) => {
        if (Array.isArray(val)) return val.join(", ");
        if (typeof val === 'string' && val.trim().startsWith("[") && val.trim().endsWith("]")) {
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) ? parsed.join(", ") : val;
          } catch (e) {
            return val;
          }
        }
        return val || "";
      };

      const displayValue = getDisplayValue(value);
      return (
        <div key={key} className="col-span-2">
          <Label htmlFor={key} className="font-medium">
            {label} <span className="text-[10px] text-slate-400 font-normal ml-1">(Array)</span>
          </Label>
          <Textarea
            id={key}
            value={displayValue}
            onChange={(e) => {
              handleChange(key as keyof ProjectFormData, e.target.value);
            }}
            placeholder={fieldInfo?.example ? `e.g., ${fieldInfo.example}` : `Enter values separated by commas or new lines`}
            className="mt-1.5 min-h-[80px]"
          />
          <div className="mt-1">
            <p className="text-[10px] text-slate-500">{fieldInfo?.description || "Enter multiple values separated by commas or press Enter for new lines."}</p>
            {fieldInfo?.example && <p className="text-[9px] text-slate-400 italic">Example: {fieldInfo.example}</p>}
          </div>
        </div>
      );
    }

    const isNumeric = [
      "release_year",
      "runtime_minutes",
      "order_index",
      "total_episodes",
      "episode_runtime_minutes",
      "order",
      "ownership",
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
      "ticket_url",
      "poster_preview_url",
    ].includes(key);

    return (
      <div key={key} className={isFullWidth ? "col-span-2" : ""}>
        <Label htmlFor={key} className="font-medium">
          {label} {isRequired ? "*" : ""}
        </Label>

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
                      // Safely determine primary type for folder structure
                      let primaryType = "generic";
                      if (formData.content_type) {
                        if (Array.isArray(formData.content_type)) {
                          primaryType = String(formData.content_type[0] || "generic");
                        } else {
                          primaryType = String(formData.content_type);
                        }
                      }
                      // Sanitize type for folder name (remove brackets, quotes if any remain)
                      primaryType = primaryType.replace(/[\[\]"]/g, "");

                      const path =
                        key === "audio_url" || key === "audio_preview_url"
                          ? `Audio/${primaryType}/${Date.now()}-${safeName}`
                          : createBucketPath(`${Date.now()}-${safeName}`, primaryType as any);
                      const publicUrl = await mediaService.uploadFile(file, bucket, path);
                      handleChange(key as keyof ProjectFormData, publicUrl);
                      toast.success(`${label} uploaded!`);
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
        ) : key === "synopsis" || key === "notes" ? (
          <Textarea
            id={key}
            value={value ?? ""}
            onChange={(e) => handleChange(key as keyof ProjectFormData, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            required={isRequired}
            className="mt-1.5 min-h-[100px]"
          />
        ) : (
          <Input
            id={key}
            type={isNumeric ? "number" : "text"}
            value={value ?? ""}
            onChange={(e) => handleChange(key as keyof ProjectFormData, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            required={isRequired}
            className="mt-1.5"
          />
        )}
        {(fieldInfo?.description || isNumeric) && (
          <p className="mt-1 text-[10px] text-slate-500 leading-tight">
            {fieldInfo?.description || (isNumeric ? "Numeric value only." : "")}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none">
        <div className="p-6 border-b sticky top-0 bg-white z-10 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {media ? "Edit Content" : "Add New Content"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Universal Dynamic Form - All fields detected from database
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!media && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <Button
                  type="button"
                  variant={addMode === "standard" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAddMode("standard")}
                  className={addMode === "standard" ? "bg-white text-slate-900 shadow-sm hover:bg-white h-7 px-3 text-xs font-semibold" : "text-slate-500 hover:text-slate-700 h-7 px-3 text-xs font-medium"}
                >
                  Standard Form
                </Button>
                <Button
                  type="button"
                  variant={addMode === "row" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAddMode("row")}
                  className={addMode === "row" ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 h-7 px-3 text-xs font-semibold" : "text-slate-500 hover:text-slate-700 h-7 px-3 text-xs font-medium"}
                >
                  Add to Row
                </Button>
              </div>

              {addMode === "row" && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <Select value={localAssignmentPage} onValueChange={setLocalAssignmentPage}>
                    <SelectTrigger className="h-9 w-[100px] text-xs capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="watch">Watch</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={targetRowId} onValueChange={(id) => {
                    setTargetRowId(id);
                    const row = (contentRowFilters as any[]).find(r => r.id === id);
                    if (row) applyRowTemplate(row);
                  }}>
                    <SelectTrigger className="h-9 w-[180px] text-xs font-medium">
                      <SelectValue placeholder="Choose Row..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(contentRowFilters as any[])
                        .filter(r => r.page === localAssignmentPage)
                        .map(row => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row Visibility Panel — grouped by page */}
        {addMode === "standard" && (() => {
          // Group all rows by page
          const pageOrder = ['home', 'watch', 'read'];
          const grouped: Record<string, any[]> = {};
          (contentRowFilters as any[])
            .forEach(row => {
              const pg = row.page || 'other';
              if (!grouped[pg]) grouped[pg] = [];
              grouped[pg].push(row);
            });
          const pages = [...pageOrder.filter(p => grouped[p]), ...Object.keys(grouped).filter(p => !pageOrder.includes(p))];

          const pageColors: Record<string, string> = {
            home: 'bg-violet-100 text-violet-700',
            watch: 'bg-blue-100 text-blue-700',
            read: 'bg-emerald-100 text-emerald-700',
          };

          return (
            <div className="px-6 py-4 bg-slate-50 border-b space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  Row Visibility
                </h3>
                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                  {matchedRows.length} active
                </span>
              </div>

              {/* Per-page groups */}
              {pages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No active rows configured yet.</p>
              ) : (
                <div className="space-y-3">
                  {pages.map(pg => (
                    <div key={pg}>
                      {/* Page label */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${pageColors[pg] || 'bg-slate-100 text-slate-500'}`}>
                          {pg}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      {/* Row checkboxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {(grouped[pg] || []).map((row: any) => {
                          const isMatched = matchedRows.some(r => r.id === row.id);
                          return (
                            <label
                              key={row.id}
                              className={`
                                flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer
                                transition-all duration-150 select-none
                                ${isMatched
                                  ? 'bg-indigo-50 border-indigo-300 shadow-sm shadow-indigo-100'
                                  : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isMatched}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    applyRowTemplate(row);
                                    toast.success(`Added to "${row.label}"`);
                                  } else {
                                    removeRowTemplate(row);
                                    toast.info(`Removed from "${row.label}"`);
                                  }
                                }}
                                className="accent-indigo-600 w-3.5 h-3.5 flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold truncate ${isMatched ? 'text-indigo-700' : 'text-slate-700'
                                  }`}>
                                  {row.label}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {row.filter_type} · {row.filter_value}
                                </p>
                              </div>
                              {isMatched && (
                                <span className="text-indigo-500 text-[10px] font-bold flex-shrink-0">✓ ON</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })()}

        {isLoadingFields ? (
          <div className="p-6 flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="ml-2 text-sm text-slate-500">
              Loading form fields...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            {addMode === "row" && !targetRowId && !media ? (
              <div className="py-24 text-center space-y-5 animate-in fade-in zoom-in duration-300">
                <div className="bg-indigo-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto rotate-3">
                  <div className="bg-indigo-100 w-12 h-12 rounded-2xl flex items-center justify-center animate-bounce duration-1000">
                    <Upload className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">Assign to Content Row</h3>
                  <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                    Select a row template above. We'll pre-fill the specific flags and types automatically.
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-200" />
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5">
                {availableFields
                  .filter((key) => {
                    // Internal/Legacy field filtering
                    if (key.startsWith("in_") || key === "featured" || key === "is_downloadable") return false;

                    // Tag visibility is primarily controlled by availableFields (which respects allowedFields)
                    // We just need to make sure we don't return false for them here unless we really want them hidden.
                    if (['flavor_tags', 'vibe_tags', 'genres'].includes(key)) return true;

                    return true;
                  })
                  .map((key) => renderField(key, (formData as any)[key]))}

                {/* Checkboxes Area */}
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t mt-4 bg-slate-50/50 p-4 rounded-xl">
                  <h4 className="col-span-full text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Additional Options
                  </h4>

                  {["in_hero_carousel", "in_theaters"].map((key) =>
                    renderField(key, (formData as any)[key])
                  )}
                </div>

              </div>
            )}

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
                parentContentType={Array.isArray(formData.content_type) ? formData.content_type[0] : formData.content_type}
              />
            )}


            {/* Pairings section */}
            {projectId && (
              <PairingsSection
                sourceId={projectId}
                sourceRef={(Array.isArray(formData.content_type) ? formData.content_type[0] : formData.content_type) as unknown as PairingSourceEnum}
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
              parentContentType={Array.isArray(formData.content_type) ? formData.content_type[0] : formData.content_type}
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
