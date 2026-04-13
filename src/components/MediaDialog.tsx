import { useState, useEffect, useRef, useMemo } from "react";
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
import { smartParse } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload } from "lucide-react";
import { mediaService } from "@/services/mediaService";
import { toast } from "sonner";
import {
  Content,
  ContentTypeEnum,
  Flag,
  ProjectFormData,
  FilterTypeEnum,
} from "@/types";
import { createBucketPath } from "@/helpers";
import { Projects, Contents, Plans } from "@/api";
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
  selectedShelfId?: string;
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
  selectedShelfId: _selectedShelfId,
}: MediaDialogProps) {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(
    {} as ProjectFormData,
  );
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [arrayFieldNames, setArrayFieldNames] = useState<string[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);

  // Row Assignment Mode state
  const [addMode, setAddMode] = useState<"standard" | "row">("standard");
  // Renamed local state to avoid conflict with prop
  const [localAssignmentPage, setLocalAssignmentPage] = useState<string>(
    assignmentPage || "home",
  );
  const [targetRowId, setTargetRowId] = useState<string>("");

  const queryClient = useQueryClient();
  const userHasModifiedFormRef = useRef(false);
  const requestedMediaIdRef = useRef<string | null>(null);
  const savedFormDataCacheRef = useRef<Record<string, ProjectFormData>>({});

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      userHasModifiedFormRef.current = false;
      setTargetRowId("");
    }
  }, [open]);

  // Sync formData from media immediately when opening (edit mode) — shows correct Row Visibility without waiting for fetch
  useEffect(() => {
    if (!open || !media || userHasModifiedFormRef.current) return;
    const mediaId = (media as any)?.id;
    if (!mediaId) return;

    if (savedFormDataCacheRef.current[mediaId]) {
      setFormData(savedFormDataCacheRef.current[mediaId]);
      return;
    }

    const result: Record<string, any> = {};
    const arrayFields = [
      "creators",
      "cast",
      "directors",
      "producers",
      "writers",
      "tags",
      "stars",
      "writer",
      "director",
      "star",
      "status",
      "genres",
      "vibe_tags",
      "flavor_tags",
      "content_type",
    ];
    Object.entries(media).forEach(([key, value]) => {
      if (allowedFields && !allowedFields.includes(key)) return;
      if (key === "row_type") {
        result[key] = value ?? "";
        return;
      }
      if (typeof value === "boolean") {
        result[key] = value;
        return;
      }
      if (arrayFields.includes(key) || Array.isArray(value)) {
        result[key] = smartParse(value);
      } else {
        const parsedValues = smartParse(value);
        const val = parsedValues.join(", ");
        result[key] =
          val === "" && (value === null || value === undefined) ? "" : val;
      }
    });
    const currentStatuses = Array.isArray(result.status)
      ? [...result.status]
      : result.status
        ? [result.status]
        : [];
    if (
      result.in_coming_soon === true &&
      !currentStatuses.includes("coming_soon")
    )
      currentStatuses.push("coming_soon");
    if (currentStatuses.includes("coming_soon")) result.in_coming_soon = true;
    result.status = currentStatuses;
    setFormData(result as ProjectFormData);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-init when open or media id changes
  }, [open, (media as any)?.id]);

  // MERGE-based apply: adds this row's flags without clearing others
  const applyRowTemplate = (row: any) => {
    if (!row) return;
    userHasModifiedFormRef.current = true;
    const { filter_type, filter_value, label } = row;
    setFormData((prev) => {
      const next = { ...prev };
      // Ensure status is an array
      let currentStatuses = Array.isArray(next.status)
        ? [...next.status]
        : next.status
          ? [next.status]
          : [];

      const addStatus = (s: string) => {
        if (s && !currentStatuses.includes(s as any))
          currentStatuses.push(s as any);
      };

      // Update content_type (Single/Multiple selection)
      const addType = (t: string) => {
        if (!t) return;
        let currentTypes = Array.isArray(next.content_type)
          ? [...next.content_type]
          : next.content_type
            ? [next.content_type]
            : [];
        if (!currentTypes.includes(t as any)) currentTypes.push(t as any);
        next.content_type = currentTypes as any;
      };

      if (filter_type === FilterTypeEnum.ContentType) {
        const vals = (filter_value || "")
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
        if (vals.length > 1) vals.forEach((v: string) => addType(v));
        else addType(filter_value);
      } else if (filter_type === FilterTypeEnum.Audiobook) {
        addType(ContentTypeEnum.Audiobook);
      } else if (filter_type === FilterTypeEnum.Song) {
        addType(ContentTypeEnum.Song);
      } else if (filter_type === FilterTypeEnum.Listen) {
        const vals = (filter_value || "")
          .split(",")
          .map((v: string) => v.trim());
        vals.forEach((v: string) => {
          if (v.toLowerCase().includes("song")) addType(ContentTypeEnum.Song);
          if (v.toLowerCase().includes("audiobook"))
            addType(ContentTypeEnum.Audiobook);
        });
        if (vals.length === 0) addType(ContentTypeEnum.Song);
      } else if (filter_type === FilterTypeEnum.Flag) {
        // Special case: 'Coming Soon' should update status array
        if (label.toLowerCase().includes("coming soon")) {
          addStatus("coming_soon");
          next.in_coming_soon = true;
        } else {
          // If it's not a boolean flag, add the label to content_type array
          addType(label);
        }
      } else if (filter_type === FilterTypeEnum.Status) {
        addStatus(filter_value);
        if (filter_value === "coming_soon") next.in_coming_soon = true;
      }

      // --- GLOBAL: Tag row_type for any custom row ---
      const knownFlagsInApply = [
        "in_now_playing",
        "in_coming_soon",
        "in_latest_releases",
        "in_hero_carousel",
        "featured",
        "is_downloadable",
      ];
      const filterValueNormApply = (row.filter_value || "")
        .toLowerCase()
        .trim();
      const isKnownFlagArr =
        filter_type === FilterTypeEnum.Flag &&
        knownFlagsInApply.includes(filterValueNormApply);

      if (!isKnownFlagArr) {
        const rowTypeValue =
          row.row_type || label.trim().toLowerCase().replace(/\s+/g, "_");
        const currentVal = String((next as any).row_type || "");
        const parts = currentVal
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        if (!parts.includes(rowTypeValue)) {
          parts.push(rowTypeValue);
          (next as any).row_type = parts.join(", ");
        }
      }

      next.status = currentStatuses as any;

      if (filter_type === FilterTypeEnum.Flag) {
        const norm = (val: string) => val.toLowerCase().trim();
        const matchedField = availableFields.find((f) => {
          const nf = norm(f);
          const nv = norm(filter_value);
          const nvUnder = nv.replace(/\s+/g, "_");
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
    userHasModifiedFormRef.current = true;
    const { filter_type, filter_value } = row;
    setFormData((prev) => {
      const next = { ...prev };
      let currentStatuses = Array.isArray(next.status)
        ? [...next.status]
        : next.status
          ? [next.status]
          : [];

      const removeType = (t?: string) => {
        if (!t) {
          next.content_type = "" as any;
        } else {
          let currentTypes = Array.isArray(next.content_type)
            ? [...next.content_type]
            : next.content_type
              ? [next.content_type]
              : [];
          currentTypes = currentTypes.filter(
            (existing) =>
              String(existing).toLowerCase() !== String(t).toLowerCase(),
          );
          next.content_type = currentTypes as any;
        }
      };

      const removeStatus = (s: string) => {
        currentStatuses = currentStatuses.filter(
          (existing) =>
            String(existing).toLowerCase() !== String(s).toLowerCase(),
        );
      };

      if (filter_type === FilterTypeEnum.Flag) {
        const norm = (val: string) => val.toLowerCase().trim();
        const matchedField = availableFields.find((f) => {
          const nf = norm(f);
          const nv = norm(filter_value);
          const nvUnder = nv.replace(/\s+/g, "_");
          return nf === nv || nf === nvUnder || nf === `in_${nvUnder}`;
        });

        if (matchedField) {
          (next as any)[matchedField] = false;
        }

        // Special case for 'Coming Soon' Flag
        if ((row.label || "").toLowerCase().includes("coming soon")) {
          removeStatus("coming_soon");
          next.in_coming_soon = false;
        }
      }

      // --- GLOBAL: Clear row_type if it was set by this row ---
      const knownFlagsRem = [
        "in_now_playing",
        "in_coming_soon",
        "in_latest_releases",
        "in_hero_carousel",
        "featured",
        "is_downloadable",
      ];
      const filterValueNormRem = (filter_value || "").toLowerCase().trim();
      const isKnownFlagRem =
        filter_type === FilterTypeEnum.Flag &&
        knownFlagsRem.includes(filterValueNormRem);

      if (!isKnownFlagRem) {
        const rowTypeValue =
          row.row_type ||
          (row.label || "").trim().toLowerCase().replace(/\s+/g, "_");
        const currentVal = String((next as any).row_type || "");
        const parts = currentVal
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        const nextParts = parts.filter((p) => p !== rowTypeValue);
        (next as any).row_type =
          nextParts.length > 0 ? nextParts.join(", ") : "";
      }

      if (filter_type === FilterTypeEnum.Status) {
        removeStatus(filter_value);
        if (filter_value === "coming_soon") next.in_coming_soon = false;
      }

      const isListenRow =
        filter_type === FilterTypeEnum.Listen ||
        (row.page || "").toLowerCase() === "listen" ||
        (row.label || "").toLowerCase().includes("listen");
      if (isListenRow) {
        removeType(ContentTypeEnum.Song);
        removeType(ContentTypeEnum.Audiobook);
      } else if (filter_type === FilterTypeEnum.ContentType) {
        const vals = (filter_value || "")
          .split(",")
          .map((v: string) => v.trim())
          .filter(Boolean);
        if (vals.length > 1) vals.forEach((v: string) => removeType(v));
        else removeType(filter_value);
      } else if (filter_type === FilterTypeEnum.Audiobook) {
        removeType(ContentTypeEnum.Audiobook);
      } else if (filter_type === FilterTypeEnum.Song) {
        removeType(ContentTypeEnum.Song);
      }

      // Remove the label from content_type for non-Status rows,
      // EXCEPT 'Coming Soon' which lives in status.
      if (
        row.label &&
        filter_type !== FilterTypeEnum.Status &&
        !row.label.toLowerCase().includes("coming soon")
      ) {
        removeType(row.label);
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
    const types = Array.isArray(formData.content_type)
      ? formData.content_type
      : formData.content_type
        ? [formData.content_type]
        : [];
    const norm = (t: any) => String(t || "").toLowerCase();
    return types.some(
      (t) =>
        norm(t) === "audiobook" ||
        norm(t) === "tv show" ||
        norm(t) === "tvshow" ||
        norm(t) === "tv_show",
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
            "Failed to fetch chapters",
        );
      }

      const rows = Array.isArray(response.data)
        ? (response.data as any[])
        : ([response.data].filter(Boolean) as any[]);

      // Hide deleted chapters if the schema supports soft-delete
      return rows.filter(
        (r) => !("is_deleted" in r) || r.is_deleted !== true,
      ) as Content[];
    },
  });

  // Fetch ALL content_rows (same approach as ContentRows page — no is_active filter to avoid empty results)
  const { data: contentRowFilters = [], isLoading: isLoadingRowFilters } =
    useQuery({
      queryKey: ["content-row-filters", "all"],
      queryFn: async () => {
        const { ContentRows } =
          await import("@/api/integrations/supabase/content_rows/content_rows");
        const resp = await (ContentRows as any).get({
          eq: [],
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

        return rows
          .filter((r: any) => !r.is_deleted)
          .filter(
            (r: any) =>
              r.label?.toLowerCase() !== "my list" &&
              !["mylist", "my_list", "my list"].includes(r.page?.toLowerCase()),
          );
      },
      enabled: open,
      staleTime: 30_000,
    });

  // Fetch available plans for selection
  const { data: plans = [] } = useQuery({
    queryKey: ["available-plans"],
    queryFn: async () => {
      const resp = await (Plans as any).get({
        eq: [],
        sort: "name",
        sortBy: "asc",
      });

      if (resp.flag !== Flag.Success && resp.flag !== Flag.UnknownOrSuccess) {
        console.error("Failed to fetch plans:", resp.error);
        return [];
      }

      return Array.isArray(resp.data)
        ? resp.data
        : resp.data
          ? [resp.data].filter(Boolean)
          : [];
    },
    enabled: open,
    staleTime: 300_000, // Plans don't change often
  });

  // Calculate matched rows based on current formData. Memoized to prevent flicker from recalculation.
  const matchedRows = useMemo(
    () =>
      (contentRowFilters as any[]).filter((row) => {
        if (!formData) return false;
        const { filter_type, filter_value, label } = row;

        const norm = (val: any) =>
          String(val || "")
            .toLowerCase()
            .trim();

        // Coming Soon row: match when Status includes "coming_soon" or in_coming_soon is true
        const isComingSoonRow =
          (label || "").toLowerCase().includes("coming soon") ||
          norm(filter_value) === "coming_soon" ||
          norm(filter_value) === "in_coming_soon";
        if (isComingSoonRow) {
          const statuses = Array.isArray((formData as any).status)
            ? (formData as any).status
            : [(formData as any).status];
          if (statuses.some((s: any) => norm(s) === "coming_soon")) return true;
          if (!!(formData as any).in_coming_soon) return true;
          return false;
        }

        // Listen row: match when Song or Audiobook in content_type.
        const isListenRow =
          (filter_type === FilterTypeEnum.Audiobook ||
            filter_type === FilterTypeEnum.Song ||
            norm(filter_value).includes("audiobook") ||
            norm(filter_value).includes("song")) &&
          ((row.page || "").toLowerCase() === "listen" ||
            (label || "").toLowerCase().includes("listen"));
        if (isListenRow) {
          const types = Array.isArray((formData as any).content_type)
            ? (formData as any).content_type
            : (formData as any).content_type
              ? [(formData as any).content_type]
              : [];
          return types.some(
            (t: any) => norm(t) === "audiobook" || norm(t) === "song",
          );
        }

        // Project's explicitly-assigned row_type values (populated by applyRowTemplate)
        const projectRowTypes = String((formData as any).row_type || "")
          .split(",")
          .map((p: string) => norm(p.trim()))
          .filter(Boolean);

        // This row's own identifier
        const rowTypeValue = norm(
          row.row_type || label.trim().toLowerCase().replace(/\s+/g, "_"),
        );

        // Known boolean columns on projects table
        const knownFlags = [
          "in_now_playing",
          "in_coming_soon",
          "in_latest_releases",
          "in_hero_carousel",
          "featured",
          "is_downloadable",
        ];
        const isKnownFlag =
          filter_type === FilterTypeEnum.Flag &&
          knownFlags.includes(norm(filter_value).replace(/\s+/g, "_"));

        // Status rows: check project's status array directly
        if (filter_type === FilterTypeEnum.Status) {
          const statuses = Array.isArray((formData as any).status)
            ? (formData as any).status
            : [(formData as any).status];
          return statuses.some((s: any) => norm(s) === norm(filter_value));
        }

        // Known flag rows: check the actual boolean column on the project
        if (isKnownFlag) {
          const toKey = (v: string) => norm(v).replace(/\s+/g, "_");
          const filterKey = toKey(filter_value);
          const keyMatch = Object.keys(formData).find(
            (k: string) => toKey(k) === filterKey,
          );
          if (keyMatch && !!(formData as any)[keyMatch]) return true;

          // Special case: 'Coming Soon' flag also syncs to status array
          if ((label || "").toLowerCase().includes("coming soon")) {
            const statuses = Array.isArray((formData as any).status)
              ? (formData as any).status
              : [(formData as any).status];
            return statuses.some((s: any) => norm(s) === "coming_soon");
          }

          return false;
        }

        // For all other rows (content_type, Audiobook, Song, custom flag rows):
        // ONLY check if this row's identifier is explicitly in the project's row_type field.
        // This prevents false positives like all "content_type · Film" rows lighting up
        // just because a project has Film as its content_type.
        return rowTypeValue ? projectRowTypes.includes(rowTypeValue) : false;
      }),
    [formData, contentRowFilters],
  );

  // Auto-select row if editing and not set
  useEffect(() => {
    if (open && matchedRows.length > 0 && !targetRowId) {
      const preferred =
        matchedRows.find((r) => r.page === localAssignmentPage) ||
        matchedRows[0];
      if (preferred) {
        setTargetRowId(preferred.id);
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
            "Failed to create chapter",
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
            "Failed to update chapter",
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
            "Failed to delete chapter",
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
    if (!open) return;
    userHasModifiedFormRef.current = false;
    requestedMediaIdRef.current = (media as any)?.id ?? null;
    const mediaIdForFetch = (media as any)?.id ?? null;

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
            const sample = projects[0] as Record<string, any>;
            const dbArrayFields = Object.entries(sample)
              .filter(([, v]) => Array.isArray(v))
              .map(([k]) => k);
            const STATIC_ARRAY_FIELDS = [
              "creators",
              "cast",
              "directors",
              "producers",
              "writers",
              "tags",
              "stars",
              "writer",
              "director",
              "star",
              "status",
              "genres",
              "vibe_tags",
              "flavor_tags",
              "content_type",
            ];
            const allArrayFields = Array.from(
              new Set([...STATIC_ARRAY_FIELDS, ...dbArrayFields]),
            );
            const KNOWN_FLAGS: string[] = [
              "in_hero_carousel",
              "in_theaters",
              "in_now_playing",
              "in_coming_soon",
              "in_latest_releases",
              "featured",
              "is_downloadable",
            ];
            const MANDATORY_EXTRA_FIELDS: string[] = ["genres", "vibe_tags"];
            const ALL_POSSIBLE_FIELDS: string[] = [
              "title",
              "status",
              "platform",
              "platform_url",
              "notes",
              "poster_url",
              "order_index",
              "content_type",
              "platform_name",
              "poster_preview_url",
              "preview_url",
              "order",
              "slug",
              "synopsis",
              "release_year",
              "runtime_minutes",
              "external_url",
              "cta_label",
              "venue_type",
              "venue_name",
              "city",
              "country",
              "start_date",
              "end_date",
              "ticket_url",
              "creators",
              "writers",
              "directors",
              "stars",
              "rating",
              "total_episodes",
              "audio_url",
              "audio_path",
              "release_status",
              "release_date",
              "youtube_id",
              "audio_preview_url",
              "row_type",
            ];

            const fields = Array.from(
              new Set([
                ...Object.keys(projects[0]),
                ...KNOWN_FLAGS,
                ...MANDATORY_EXTRA_FIELDS,
                ...ALL_POSSIBLE_FIELDS,
              ]),
            )
              .filter(
                (key) =>
                  ![
                    "id",
                    "created_at",
                    "updated_at",
                    "ownership",
                    "episode_runtime_minutes",
                    "screening_status",
                    "deleted_at",
                    "is_deleted",
                    "play_behavior",
                    "required_plan",
                  ].includes(key),
              )
              .filter((key) =>
                allowedFields ? allowedFields.includes(key) : true,
              );
            setAvailableFields(fields);
            setArrayFieldNames(allArrayFields);

            // Initialize form data
            if (media) {
              // Edit mode - populate with existing data
              const result: Record<string, any> = {};
              Object.entries(media).forEach(([key, value]) => {
                if (allowedFields && !allowedFields.includes(key)) return;

                // row_type is a plain comma-separated string — never smartParse it
                if (key === "row_type") {
                  result[key] = value ?? "";
                  return;
                }
                // Preserve booleans (e.g. in_now_playing, in_hero_carousel) — smartParse converts false to "false" which is truthy
                if (typeof value === "boolean") {
                  result[key] = value;
                  return;
                }

                const arrayFields = arrayFieldNames.length
                  ? arrayFieldNames
                  : [
                      "creators",
                      "cast",
                      "directors",
                      "producers",
                      "writers",
                      "tags",
                      "stars",
                      "writer",
                      "director",
                      "star",
                      "status",
                      "genres",
                      "vibe_tags",
                      "flavor_tags",
                      "content_type",
                    ];
                if (arrayFields.includes(key) || Array.isArray(value)) {
                  result[key] = smartParse(value);
                } else {
                  const parsedValues = smartParse(value);
                  const val = parsedValues.join(", ");
                  result[key] =
                    val === "" && (value === null || value === undefined)
                      ? ""
                      : val;
                }
              });

              // Sync in_coming_soon flag and status array
              const currentStatuses = Array.isArray(result.status)
                ? [...result.status]
                : result.status
                  ? [result.status]
                  : [];
              if (
                result.in_coming_soon === true &&
                !currentStatuses.includes("coming_soon")
              ) {
                currentStatuses.push("coming_soon");
              }
              if (currentStatuses.includes("coming_soon")) {
                result.in_coming_soon = true;
              }
              result.status = currentStatuses;

              if (
                !userHasModifiedFormRef.current &&
                requestedMediaIdRef.current === mediaIdForFetch
              ) {
                // ✅ Prefer cached saved data over stale media prop
                const cached =
                  savedFormDataCacheRef.current[mediaIdForFetch ?? ""];
                setFormData(cached ?? (result as ProjectFormData));
              }
            } else {
              // Add mode - initialize empty fields
              const base: Record<string, any> = {};
              fields.forEach((key) => {
                const arrayFields = arrayFieldNames.length
                  ? arrayFieldNames
                  : [
                      "genres",
                      "status",
                      "vibe_tags",
                      "flavor_tags",
                      "content_type",
                    ];
                if (arrayFields.includes(key)) {
                  base[key] = [];
                } else if (key === "row_type") {
                  base[key] = ""; // always a plain string
                } else {
                  base[key] = "";
                }
              });

              // Apply default values if provided
              if (defaultValues) {
                Object.assign(base, defaultValues);
              }

              if (
                !userHasModifiedFormRef.current &&
                requestedMediaIdRef.current === mediaIdForFetch
              ) {
                setFormData(base as ProjectFormData);
              }
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
  }, [open, (media as any)?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const typesForValidation = smartParse(formData.content_type);
    const isReadCase = typesForValidation.some(
      (t) =>
        String(t) === ContentTypeEnum.Audiobook ||
        String(t).toLowerCase() === "audiobook" ||
        String(t).toLowerCase() === "audiobooks",
    );

    const requiredFields = [
      "title",
      "content_type",
      "status",
      "poster_url",
      "notes",
      "platform",
      "release_year",
      ...(isReadCase ? ["audio_url"] : ["preview_url"]),
    ];

    const missingFields = requiredFields.filter((field) => {
      if (
        availableFields.includes(field) ||
        ["content_type", "status", "preview_url"].includes(field)
      ) {
        const value = (formData as any)[field];
        if (Array.isArray(value)) return value.length === 0;
        return value === undefined || value === null || value === "";
      }
      return false;
    });

    if (missingFields.length > 0) {
      const fieldLabels = missingFields.map((f) =>
        f.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      );
      toast.error(
        `Please fill in all required fields: ${fieldLabels.join(", ")}`,
      );
      return;
    }

    // Prepare data for submission
    const submitData: Record<string, any> = {};

    // Only include fields that have actual values
    Object.entries(formData).forEach(([key, value]) => {
      // Skip internal fields and play_behavior
      if (
        [
          "id",
          "created_at",
          "updated_at",
          "play_behavior",
          "commaSeperatedGenres",
        ].includes(key)
      ) {
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
          "ownership",
        ].includes(key)
      ) {
        // Convert numeric strings to integers, allowing 0
        submitData[key] =
          value !== null && value !== undefined && value !== ""
            ? parseInt(String(value), 10)
            : null;
      } else {
        // Handle other possible array fields
        const arrayFields = arrayFieldNames.length
          ? arrayFieldNames
          : [
              "creators",
              "cast",
              "directors",
              "producers",
              "writers",
              "tags",
              "stars",
              "writer",
              "director",
              "star",
              "status",
              "genres",
              "vibe_tags",
              "flavor_tags",
              "content_type",
            ];
        if (key === "row_type") {
          const parts = String(value || "")
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean);
          submitData[key] = parts.join(", ") || null;
        } else if (arrayFields.includes(key)) {
          const parsedArray = smartParse(value);
          const cleanArray = parsedArray.filter(Boolean);
          if (key === "content_type") {
            submitData[key] = cleanArray.join(", ");
          } else {
            submitData[key] = cleanArray;
          }
        } else if (typeof value === "string") {
          submitData[key] = value.trim();
        } else {
          submitData[key] = value;
        }
      }
    });

    console.log("Submitting data to database:", submitData);
    await onSubmit(submitData);
    // ✅ Cache the current formData so reopening reflects saved state
    const mediaId = (media as any)?.id;
    if (mediaId) {
      savedFormDataCacheRef.current[mediaId] = { ...formData };
    }
  };

  const handleChange = (field: keyof ProjectFormData, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      // Sync status -> in_coming_soon flag
      if (field === "status") {
        const statuses = Array.isArray(value) ? value : value ? [value] : [];
        const norm = (v: any) =>
          String(v || "")
            .toLowerCase()
            .trim();
        const IsComingSoon = statuses.some((s) => norm(s) === "coming_soon");
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
      const types = Array.isArray(formData.content_type)
        ? formData.content_type
        : formData.content_type
          ? [formData.content_type]
          : [];
      return types.some((t) => String(t).toLowerCase() === "audiobook");
    })();

    const requiredFields = [
      "title",
      "content_type",
      "status",
      "poster_url",
      "notes",
      "platform",
      "release_year",
      ...(isReadCase ? ["audio_url"] : ["preview_url"]),
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

      // Only show real content types here.
      // Row labels (content rows) are no longer injected as extra content_type options.
      const allOptions = standardTypes;

      const parseArray = (val: any): string[] => smartParse(val);

      const currentTypes = parseArray(value);

      const toggleType = (t: string) => {
        const next = currentTypes.includes(t)
          ? currentTypes.filter((existing) => existing !== t)
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
              <span className="text-xs text-slate-400 italic">
                No types selected
              </span>
            ) : (
              currentTypes.map((t: string) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100 cursor-pointer transition-colors"
                  onClick={() => toggleType(t)}
                >
                  {(() => {
                    const option = allOptions.find((o) => o.value === t);
                    if (option) return option.label;
                    const s = String(t).replace(/_/g, " ");
                    return s.charAt(0).toUpperCase() + s.slice(1);
                  })()}{" "}
                  <span className="ml-1 opacity-60">×</span>
                </Badge>
              ))
            )}
          </div>
          <Select value="" onValueChange={toggleType}>
            <SelectTrigger className="capitalize">
              <SelectValue placeholder="Add another type..." />
            </SelectTrigger>
            <SelectContent>
              {allOptions.map((type) => (
                <SelectItem
                  key={type.value}
                  value={type.value}
                  disabled={currentTypes.includes(type.value)}
                >
                  {type.label} {currentTypes.includes(type.value) ? "✓" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400 italic">
            Click a badge above to remove it. Multiple types allow assignment to
            multiple rows.
          </p>
        </div>
      );
    }

    // Special: Status Select
    if (key === "status") {
      const standardStatuses = [
        { value: "released", label: "Released" },
        { value: "coming_soon", label: "Coming Soon" },
      ];

      const parseArray = (val: any): string[] => smartParse(val);

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
              <span className="text-xs text-slate-400 italic">
                No statuses selected
              </span>
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
                  })()}{" "}
                  <span className="ml-1 opacity-60">×</span>
                </Badge>
              ))
            )}
          </div>
          <Select value="" onValueChange={toggleStatus}>
            <SelectTrigger className="capitalize">
              <SelectValue placeholder="Add another status..." />
            </SelectTrigger>
            <SelectContent>
              {standardStatuses.map((stat) => (
                <SelectItem
                  key={stat.value}
                  value={stat.value}
                  disabled={currentStatuses.includes(stat.value)}
                >
                  {stat.label} {currentStatuses.includes(stat.value) ? "✓" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400 italic">
            Click a badge above to remove it. Multiple statuses allow an item to
            be in both 'Released' and 'Coming Soon'.
          </p>
        </div>
      );
    }

    // Special: Required Plan Select
    if (key === "required_plan_id") {
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">
            Required Plan
          </Label>
          <Select
            value={value || ""}
            onValueChange={(v) => handleChange(key as keyof ProjectFormData, v)}
          >
            <SelectTrigger className="mt-1.5 capitalize">
              <SelectValue placeholder="Select required plan" />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan: any) => (
                <SelectItem key={plan.id} value={plan.id || "Free"}>
                  {plan.name}
                </SelectItem>
              ))}
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

    // Unified Field Guide for simple help text
    const fieldGuide: Record<
      string,
      { description: string; example?: string }
    > = {
      title: { description: "Name of the content as seen in the catalog." },
      content_type: { description: "Classification for routing and playback." },
      row_type: {
        description:
          "Links this item to a specific content row. Auto-set when you select a row from Row Visibility above.",
        example: "trending_audiobooks",
      },
      status: {
        description:
          "Release status: 'released' is live, 'coming_soon' shows teaser.",
      },
      poster_url: { description: "Primary display image URL." },
      preview_url: { description: "Teaser video or thumbnail URL." },
      notes: { description: "Internal notes or brief summary." },
      platform: {
        description: "Where is this available? (YouTube, Netflix, etc.)",
      },
      platform_url: { description: "Direct link to the content platform." },
      release_year: { description: "Year of original release (YYYY)." },
      runtime_minutes: { description: "Total duration in minutes." },
      ownership: { description: "Numeric identifier for licensing/ownership." },
      creators: {
        description: "Authors or creators. Enter names separated by commas.",
        example: "John Doe, Jane Smith",
      },
      stars: {
        description:
          "Main stars or lead performers. Enter names separated by commas.",
        example: "Star One, Star Two",
      },
      directors: { description: "Directors. Enter names separated by commas." },
      writers: { description: "Writers. Enter names separated by commas." },
      genres: {
        description: "Genres for filtering. Enter comma-separated.",
        example: "Action, Drama",
      },
      vibe_tags: {
        description: "Vibe tags for mood/aesthetic. Enter comma-separated.",
        example: "Chill, Dark, Uplifting",
      },
      flavor_tags: {
        description: "Flavor tags for recipes. Enter comma-separated.",
        example: "Spicy, Sweet, Savory",
      },
      order_index: { description: "Listing priority (lower is higher)." },
      audio_url: { description: "Direct audio file link." },
      audio_preview_url: { description: "Link to audio clip for preview." },
      slug: { description: "URL-friendly name. Auto-generated if empty." },
      synopsis: { description: "Brief overview or plot summary." },
      venue_name: { description: "Name of the event venue or location." },
      city: { description: "City where the event or production is located." },
      country: { description: "Country of origin or event location." },
      ticket_url: { description: "Direct link for purchasing tickets." },
    };

    const isDate =
      key.endsWith("_at") ||
      key.includes("date") ||
      (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value));
    const knownArrayFields = [
      "creators",
      "cast",
      "directors",
      "producers",
      "writers",
      "tags",
      "stars",
      "writer",
      "director",
      "star",
      "status",
      "genres",
      "vibe_tags",
      "flavor_tags",
      "content_type",
      ...arrayFieldNames,
    ];
    const isArrayField = knownArrayFields.includes(key) || Array.isArray(value);
    const fieldInfo = fieldGuide[key];

    // Special: Date Fields
    if (isDate) {
      const dateValue =
        value && typeof value === "string" ? value.split("T")[0] : "";
      return (
        <div key={key}>
          <Label htmlFor={key} className="font-medium">
            {label} {isRequired ? "*" : ""}
          </Label>
          <Input
            id={key}
            type="date"
            value={dateValue}
            onChange={(e) =>
              handleChange(key as keyof ProjectFormData, e.target.value)
            }
            className="mt-1.5"
            required={isRequired}
          />
          <p className="mt-1 text-[10px] text-slate-400 italic">
            Format: YYYY-MM-DD
          </p>
        </div>
      );
    }

    // Special: Array fields — show raw string when editing (preserves spaces/commas while typing)
    if (isArrayField) {
      const displayValue =
        typeof value === "string"
          ? value
          : Array.isArray(value)
            ? value.join(", ")
            : smartParse(value).join(", ");
      return (
        <div key={key} className="col-span-2">
          <Label htmlFor={key} className="font-medium">
            {label}{" "}
            <span className="text-[10px] text-slate-400 font-normal ml-1">
              (Array)
            </span>
          </Label>
          <Textarea
            id={key}
            value={displayValue}
            onChange={(e) => {
              handleChange(key as keyof ProjectFormData, e.target.value);
            }}
            placeholder={
              fieldInfo?.example
                ? `e.g., ${fieldInfo.example}`
                : `Enter values separated by commas or new lines`
            }
            className="mt-1.5 min-h-[80px]"
          />
          <div className="mt-1">
            <p className="text-[10px] text-slate-500">
              {fieldInfo?.description ||
                "Enter multiple values separated by commas or press Enter for new lines."}
            </p>
            {fieldInfo?.example && (
              <p className="text-[9px] text-slate-400 italic">
                Example: {fieldInfo.example}
              </p>
            )}
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
                      const types = smartParse(formData.content_type);
                      const primaryType =
                        types.length > 0 ? types[0] : "Generic";

                      const path =
                        key === "audio_url" || key === "audio_preview_url"
                          ? `Audio/${primaryType}/${Date.now()}-${safeName}`
                          : createBucketPath(
                              `${Date.now()}-${safeName}`,
                              primaryType as any,
                            );
                      const publicUrl = await mediaService.uploadFile(
                        file,
                        bucket,
                        path,
                      );
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
                {isUploading === key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Upload</span>
              </Button>
            </div>
          </div>
        ) : key === "synopsis" || key === "notes" ? (
          <Textarea
            id={key}
            value={value ?? ""}
            onChange={(e) =>
              handleChange(key as keyof ProjectFormData, e.target.value)
            }
            placeholder={`Enter ${label.toLowerCase()}`}
            required={isRequired}
            className="mt-1.5 min-h-[100px]"
          />
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
                  className={
                    addMode === "standard"
                      ? "bg-white text-slate-900 shadow-sm hover:bg-white h-7 px-3 text-xs font-semibold"
                      : "text-slate-500 hover:text-slate-700 h-7 px-3 text-xs font-medium"
                  }
                >
                  Standard Form
                </Button>
                <Button
                  type="button"
                  variant={addMode === "row" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAddMode("row")}
                  className={
                    addMode === "row"
                      ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 h-7 px-3 text-xs font-semibold"
                      : "text-slate-500 hover:text-slate-700 h-7 px-3 text-xs font-medium"
                  }
                >
                  Add to Row
                </Button>
              </div>

              {addMode === "row" && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <Select
                    value={localAssignmentPage}
                    onValueChange={setLocalAssignmentPage}
                  >
                    <SelectTrigger className="h-9 w-[100px] text-xs capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="watch">Watch</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={targetRowId}
                    onValueChange={(id) => {
                      setTargetRowId(id);
                      const row = (contentRowFilters as any[]).find(
                        (r) => r.id === id,
                      );
                      if (row) applyRowTemplate(row);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[180px] text-xs font-medium">
                      <SelectValue placeholder="Choose Row..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(contentRowFilters as any[])
                        .filter((r) => r.page === localAssignmentPage)
                        .map((row) => (
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

        {/* Row Visibility Panel — always shown for both Add and Edit, grouped by page */}
        {(() => {
          const pageOrder = ["home", "watch", "read"];
          const grouped: Record<string, any[]> = {};
          (contentRowFilters as any[]).forEach((row) => {
            const pg = row.page || "other";
            if (!grouped[pg]) grouped[pg] = [];
            grouped[pg].push(row);
          });
          const pages = [
            ...pageOrder.filter((p) => grouped[p]),
            ...Object.keys(grouped).filter((p) => !pageOrder.includes(p)),
          ];

          const pageColors: Record<string, string> = {
            home: "bg-violet-100 text-violet-700",
            watch: "bg-blue-100 text-blue-700",
            read: "bg-emerald-100 text-emerald-700",
          };

          return (
            <div className="px-6 py-4 bg-slate-50 border-b space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  Row Visibility
                </h3>
                {!isLoadingRowFilters && (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                    {matchedRows.length} active
                  </span>
                )}
              </div>

              {/* Loading skeleton */}
              {isLoadingRowFilters ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-slate-200" />
                  ))}
                </div>
              ) : pages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No content rows yet. Create them in{" "}
                  <a
                    href="/content-rows"
                    className="text-indigo-600 hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenChange?.(false);
                      window.location.href = "/content-rows";
                    }}
                  >
                    Content Rows
                  </a>
                  .
                </p>
              ) : (
                <div className="space-y-3">
                  {pages.map((pg) => (
                    <div key={pg}>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${pageColors[pg] || "bg-slate-100 text-slate-500"}`}
                        >
                          {pg}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {(grouped[pg] || []).map((row: any) => {
                          const isMatched = matchedRows.some(
                            (r) => r.id === row.id,
                          );
                          return (
                            <div
                              key={row.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (isMatched) {
                                  removeRowTemplate(row);
                                  toast.info(`Removed from "${row.label}"`);
                                } else {
                                  applyRowTemplate(row);
                                  toast.success(`Added to "${row.label}"`);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  if (isMatched) {
                                    removeRowTemplate(row);
                                    toast.info(`Removed from "${row.label}"`);
                                  } else {
                                    applyRowTemplate(row);
                                    toast.success(`Added to "${row.label}"`);
                                  }
                                }
                              }}
                              className={`
                                flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer
                                transition-all duration-150 select-none
                                ${
                                  isMatched
                                    ? "bg-indigo-50 border-indigo-300 shadow-sm shadow-indigo-100"
                                    : "bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30"
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isMatched}
                                readOnly
                                tabIndex={-1}
                                className="accent-indigo-600 w-3.5 h-3.5 flex-shrink-0 pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs font-semibold truncate ${isMatched ? "text-indigo-700" : "text-slate-700"}`}
                                >
                                  {row.label}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {row.filter_type} · {row.filter_value}
                                </p>
                              </div>
                              {isMatched && (
                                <span className="text-indigo-500 text-[10px] font-bold flex-shrink-0">
                                  ✓ ON
                                </span>
                              )}
                            </div>
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
                  <h3 className="text-xl font-bold text-slate-800">
                    Assign to Content Row
                  </h3>
                  <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                    Select a row template above. We'll pre-fill the specific
                    flags and types automatically.
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
                    if (
                      key.startsWith("in_") ||
                      key === "featured" ||
                      key === "is_downloadable"
                    )
                      return false;

                    // Tag visibility is primarily controlled by availableFields (which respects allowedFields)
                    // We just need to make sure we don't return false for them here unless we really want them hidden.
                    if (["flavor_tags", "vibe_tags", "genres"].includes(key))
                      return true;

                    return true;
                  })
                  .map((key) => renderField(key, (formData as any)[key]))}

                {/* Checkboxes Area */}
                <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t mt-4 bg-slate-50/50 p-4 rounded-xl">
                  <h4 className="col-span-full text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Additional Options
                  </h4>

                  {["in_hero_carousel", "in_theaters"].map((key) =>
                    renderField(key, (formData as any)[key]),
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
                parentContentType={
                  Array.isArray(formData.content_type)
                    ? formData.content_type[0]
                    : formData.content_type
                }
              />
            )}

            {/* Pairings section */}
            {projectId && (
              <PairingsSection
                sourceId={projectId}
                sourceRef={
                  (Array.isArray(formData.content_type)
                    ? formData.content_type[0]
                    : formData.content_type) as unknown as PairingSourceEnum
                }
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
              parentContentType={
                Array.isArray(formData.content_type)
                  ? formData.content_type[0]
                  : formData.content_type
              }
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
