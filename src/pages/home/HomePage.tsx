import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Loader2, Pin, PinOff, Mail, Layout } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { pairingService } from "@/services/pairingService";
import MediaDialog from "@/components/MediaDialog";
import { MediaFilters } from "@/components/MediaFilters";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks";
import { Flag, Project, ContentRow, FilterTypeEnum } from "@/types";
import { StatsRow } from "@/components/StatsRow";
import { cn, smartParse } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailCaptureSettingsCard } from "@/components/EmailCaptureSettingsCard";
import { PageSettingsCard } from "@/components/PageSettingsCard";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<string[]>([]);
  const [selectedShelfId, setSelectedShelfId] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [stickyColumns, setStickyColumns] = useState<string[]>([
    "actions",
    "title",
  ]);
  const [activeConfigTab, setActiveConfigTab] = useState("email");

  const toggleSticky = (key: string) => {
    setStickyColumns((prev) => {
      if (prev.includes(key)) {
        return prev.filter((col) => col !== key);
      }
      if (prev.length >= 2) {
        toast.info("Maximum 2 columns can be pinned");
        return prev;
      }
      return [...prev, key];
    });
  };

  const { data: shelves = [] } = useQuery({
    queryKey: ["content-rows", "home"],
    queryFn: async () => {
      const { ContentRows } =
        await import("@/api/integrations/supabase/content_rows/content_rows");
      const resp = await (ContentRows as any).get({
        eq: [
          { key: "page", value: "home" },
          { key: "is_active", value: true },
        ],
      });
      return Array.isArray(resp.data) ? (resp.data as ContentRow[]) : [];
    },
  });

  const PINNED_WIDTH = 200;
  const COLUMN_WIDTHS: Record<string, number> = {
    actions: PINNED_WIDTH,
    title: PINNED_WIDTH,
    content_type: 150,
    status: 150,
    platform: 150,
    release_year: 120,
    runtime_minutes: 150,
    notes: 300,
  };

  // Calculate left offset for sticky columns
  const getStickyOffset = (columnKey: string): number => {
    const index = stickyColumns.indexOf(columnKey);
    if (index === -1) return 0;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += PINNED_WIDTH;
    }
    return offset;
  };

  const queryClient = useQueryClient();

  // // Fetch unique types for filters
  // const { data: availableTypes = [] } = useQuery({
  //   queryKey: ["unique-types"],
  //   queryFn: async () => {
  //     const response = await projectsAPI.get({ eq: [] });
  //     if (response.flag === Flag.Success && response.data) {
  //       const types = (response.data as Project[])
  //         .flatMap((item) => smartParse(item.content_type))
  //         .filter(Boolean);
  //       return [...new Set(types)].sort();
  //     }
  //   },
  // });
  // Fetch unique content types for filters
  const { data: availableTypes = [] } = useQuery({
    queryKey: ["unique-types"],
    queryFn: async () => {
      const response = await projectsAPI.get({ eq: [] });

      if (response.flag !== Flag.Success || !response.data) {
        return [];
      }

      const typesSet = new Set<string>();

      // 🔥 Recursive deep parser
      const extractValues = (value: any): string[] => {
        if (!value) return [];

        // If already array → flatten deeply
        if (Array.isArray(value)) {
          return value.flatMap(extractValues);
        }

        // If string → try parsing repeatedly
        if (typeof value === "string") {
          const trimmed = value.trim();

          // Try to parse JSON safely
          try {
            const parsed = JSON.parse(trimmed);

            // If parsing changes the value → recurse again
            if (parsed !== trimmed) {
              return extractValues(parsed);
            }
          } catch {
            // Not JSON — continue
          }

          return [trimmed];
        }

        return [];
      };

      (response.data as Project[]).forEach((item) => {
        const cleanValues = extractValues(item.content_type);

        cleanValues.forEach((val) => {
          if (typeof val === "string" && val.trim()) {
            typesSet.add(val.trim());
          }
        });
      });

      return Array.from(typesSet).sort((a, b) => a.localeCompare(b));
    },
  });

  // Fetch projects with server-side filters
  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: [
      "home-library",
      debouncedSearchQuery,
      statusFilter,
      contentTypeFilter,
      selectedShelfId,
    ],
    queryFn: async () => {
      const eqFilters: any[] = [];
      const containsFilters: any[] = [];
      const overlapsFilters: any[] = [];
      const ilikeFilters: any[] = [];

      if (statusFilter.length > 0) {
        overlapsFilters.push({ key: "status" as const, value: statusFilter });
      }
      let shelfOr: string | undefined = undefined;

      // Apply shelf filter logic
      if (selectedShelfId !== "all") {
        const shelf = shelves.find((s) => s.id === selectedShelfId);
        if (shelf) {
          if (shelf.filter_type === FilterTypeEnum.Flag) {
            const knownFlags = [
              "in_now_playing",
              "in_coming_soon",
              "in_latest_releases",
              "in_hero_carousel",
              "featured",
              "is_downloadable",
            ];
            const flagExists = knownFlags.includes(
              shelf.filter_value.toLowerCase(),
            );

            if (flagExists) {
              eqFilters.push({ key: shelf.filter_value, value: true });
            } else if (shelf.page !== "listen") {
              // For custom rows, query by row_type using the shelf's row_type or label
              // Only for pages where row_type exists
              const rowTypeFilter =
                (shelf as any).row_type || (shelf as any).label;
              ilikeFilters.push({
                key: "row_type",
                value: `%${rowTypeFilter}%`,
              });
            }
          } else if (shelf.filter_type === FilterTypeEnum.Audiobook) {
            ilikeFilters.push({ key: "content_type", value: "%Audiobook%" });
          } else if (shelf.filter_type === FilterTypeEnum.Song) {
            ilikeFilters.push({ key: "content_type", value: "%Song%" });
          } else if (shelf.filter_type === FilterTypeEnum.Listen) {
            // Since Listen is Song OR Audiobook, and we can only have one OR in CRUDWrapper easily,
            // we'll use a hack or just stick to one for now if ANDed
            // Actually, we can just use the 'or' property for complex ones.
          } else if (
            shelf.filter_type === FilterTypeEnum.Status ||
            shelf.filter_type === FilterTypeEnum.ContentType
          ) {
            const isStatus = shelf.filter_type === FilterTypeEnum.Status;
            if (shelf.filter_value.includes(",")) {
              const values = shelf.filter_value.split(",").map((v) => v.trim());
              if (isStatus) {
                overlapsFilters.push({ key: "status", value: values });
              } else {
                shelfOr = values
                  .map((v) => `content_type.ilike.%${v}%`)
                  .join(",");
              }
            } else {
              if (isStatus) {
                containsFilters.push({
                  key: "status",
                  value: [shelf.filter_value],
                });
              } else {
                ilikeFilters.push({
                  key: "content_type",
                  value: `%${shelf.filter_value}%`,
                });
              }
            }
          } else if (shelf.filter_type === FilterTypeEnum.Genre) {
            containsFilters.push({
              key: "genres",
              value: [shelf.filter_value],
            });
          } else if (shelf.filter_type === FilterTypeEnum.VibeTags) {
            containsFilters.push({
              key: "vibe_tags",
              value: [shelf.filter_value],
            });
          } else if (shelf.filter_type === FilterTypeEnum.FlavorTags) {
            containsFilters.push({
              key: "flavor_tags",
              value: [shelf.filter_value],
            });
          }
        }
      }

      if (contentTypeFilter.length > 0) {
        // Build multiple ilike patterns joined by OR
        const contentTypePatterns = contentTypeFilter
          .map((t) => `content_type.ilike.%${t}%`)
          .join(",");
        if (shelfOr) {
          shelfOr = `and(or(${shelfOr}),or(${contentTypePatterns}))`;
        } else {
          shelfOr = contentTypePatterns;
        }
      }

      // Apply base content type restriction for Home page
      const pageFilterOr =
        "content_type.ilike.%Film%,content_type.ilike.%TV Show%";
      const visibilityFilter = "is_deleted.eq.false,is_deleted.is.null";
      let finalOr = shelfOr;

      if (finalOr) {
        finalOr = `and(or(${finalOr}),or(${pageFilterOr}),or(${visibilityFilter}))`;
      } else {
        finalOr = `and(or(${pageFilterOr}),or(${visibilityFilter}))`;
      }

      const response = await projectsAPI.get({
        eq: eqFilters,
        contains: containsFilters,
        overlaps: overlapsFilters,
        ilike: ilikeFilters,
        or: finalOr,
        sort: "created_at",
        sortBy: "dec",
        search: debouncedSearchQuery || undefined,
        searchFields: ["title", "platform", "notes"],
      });

      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        throw new Error(response.error?.message || "Failed to fetch projects");
      }

      let rows = Array.isArray(response.data)
        ? (response.data as Project[])
        : [];

      // Handle smart search (including inheritance)
      if (debouncedSearchQuery.length > 2) {
        try {
          const inheritedProjects =
            await pairingService.searchProjectsByInheritedTag(
              debouncedSearchQuery,
            );
          const existingIds = new Set(rows.map((r) => r.id));
          inheritedProjects.forEach((p) => {
            if (!existingIds.has(p.id)) {
              // Apply basic filters to inherited results
              if (statusFilter.length > 0) {
                const statuses = Array.isArray(p.status)
                  ? p.status
                  : typeof p.status === "string"
                    ? smartParse(p.status)
                    : [];
                if (!statusFilter.some((sf) => statuses.includes(sf as any)))
                  return;
              }
              if (contentTypeFilter.length > 0) {
                const types = Array.isArray(p.content_type)
                  ? p.content_type
                  : typeof p.content_type === "string"
                    ? smartParse(p.content_type)
                    : [];
                if (!contentTypeFilter.some((cf) => types.includes(cf as any)))
                  return;
              }
              rows.push(p);
            }
          });
        } catch (e) {
          console.error("Error fetching inherited projects:", e);
        }
      }

      return rows.filter((item) => (item as any).is_deleted !== true);
    },
  });

  const displayFields = [
    { key: "actions", label: "Actions" },
    { key: "title", label: "Title" },
    { key: "content_type", label: "Content Type" },
    { key: "status", label: "Status" },
    { key: "platform", label: "Platform" },
    { key: "platform_url", label: "Platform URL" },
    { key: "preview_url", label: "Preview URL" },
    { key: "genres", label: "Genres" },
    { key: "vibe_tags", label: "Vibe Tags" },
    { key: "order_index", label: "Order Index" },
    { key: "release_year", label: "Release Year" },
    { key: "runtime_minutes", label: "Runtime Minutes" },
    { key: "notes", label: "Notes" },
  ];

  const allAvailableFields = displayFields.map((field) => field.key);
  const availableStatuses = Array.from(
    new Set(projects.flatMap((p) => smartParse(p.status)).filter(Boolean)),
  ).sort();
  const orderedFields = [
    ...allAvailableFields.filter((key) => stickyColumns.includes(key)),
    ...allAvailableFields.filter((key) => !stickyColumns.includes(key)),
  ];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await projectsAPI.createOne(data);
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to create content item";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-library"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      queryClient.invalidateQueries({ queryKey: ["unique-vibes"] });
      setIsMediaDialogOpen(false);
      toast.success("Content item created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create content item: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await projectsAPI.updateOneByID(id, data);
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to update content item";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-library"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      queryClient.invalidateQueries({ queryKey: ["unique-vibes"] });
      setIsMediaDialogOpen(false);
      setSelectedMedia(null);
      toast.success("Content item updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update content item: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await projectsAPI.toogleSoftDeleteOneByID(id, true);
      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to delete content item";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-library"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Moved to archive.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete content item: ${error.message}`);
    },
  });

  const handleAddNew = () => {
    setSelectedMedia(null);
    setIsMediaDialogOpen(true);
  };

  const handleEdit = (media: Project) => {
    setSelectedMedia(media);
    setSelectedRowId(media.id);
    setIsMediaDialogOpen(true);
  };

  const handleDelete = (media: Project) => {
    setMediaToDelete(media);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (selectedMedia) {
      await updateMutation.mutateAsync({ id: (selectedMedia as any).id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const confirmDelete = async () => {
    if (mediaToDelete) {
      await deleteMutation.mutateAsync(mediaToDelete.id);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-bold mb-2">Error Loading Content</h2>
          <p>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <StatsRow
        title="Home Page Library"
        description="Manage all content items displayed on the home page."
        handleNew={handleAddNew}
      />

      <Tabs defaultValue="library" className="w-full">
        <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-2">
          <TabsList className="bg-slate-100 p-1 rounded-lg h-10 border border-slate-200">
            <TabsTrigger
              value="library"
              className="rounded-md px-6 h-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 font-semibold transition-all flex items-center gap-2"
            >
              Content Library
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-md px-6 h-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 font-semibold transition-all flex items-center gap-2"
            >
              Page Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="settings"
          className="mt-0 outline-none animate-in fade-in duration-300"
        >
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <Tabs
              value={activeConfigTab}
              onValueChange={setActiveConfigTab}
              className="w-full"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
                    {activeConfigTab === "email" ? (
                      <Mail className="h-5 w-5 text-slate-600" />
                    ) : (
                      <Layout className="h-5 w-5 text-slate-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      {activeConfigTab === "email"
                        ? "Email Capture Configuration"
                        : "Pricing Page Header"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {activeConfigTab === "email"
                        ? "Tailor the signup experience for your visitors"
                        : "Configure headlines for the pricing page"}
                    </p>
                  </div>
                </div>
                <TabsList className="bg-slate-100 p-1 rounded-lg h-10 border border-slate-200 self-start md:self-center">
                  <TabsTrigger
                    value="email"
                    className="rounded-md px-6 h-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                  >
                    Email Signup
                  </TabsTrigger>
                  <TabsTrigger
                    value="pricing"
                    className="rounded-md px-6 h-full data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                  >
                    Pricing Page
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <TabsContent value="email" className="mt-0 outline-none">
                  <Card className="border border-slate-200 bg-white rounded-lg overflow-hidden">
                    <EmailCaptureSettingsCard hideCard />
                  </Card>
                </TabsContent>

                <TabsContent value="pricing" className="mt-0 outline-none">
                  <Card className="border border-slate-200 bg-white rounded-lg overflow-hidden">
                    <PageSettingsCard pageName="pricing" hideCard />
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </TabsContent>

        <TabsContent
          value="library"
          className="mt-0 outline-none space-y-6 animate-in fade-in slide-in-from-left-2 duration-300"
        >
          {/* Main Content Area */}
          <Card className="border-none shadow-sm overflow-hidden bg-white">
            <div className="p-6 space-y-4">
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <MediaFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  contentTypeFilter={contentTypeFilter}
                  onContentTypeFilterChange={setContentTypeFilter}
                  availableStatuses={availableStatuses}
                  availableTypes={availableTypes}
                  shelves={shelves}
                  selectedShelfId={selectedShelfId}
                  onShelfChange={setSelectedShelfId}
                />
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                    <TableRow>
                      {orderedFields.map((key) => (
                        <TableHead
                          key={key}
                          className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 whitespace-nowrap group"
                          sticky={
                            stickyColumns.includes(key) ? "left" : undefined
                          }
                          left={
                            stickyColumns.includes(key)
                              ? getStickyOffset(key)
                              : undefined
                          }
                          width={
                            stickyColumns.includes(key)
                              ? PINNED_WIDTH
                              : COLUMN_WIDTHS[key] || 150
                          }
                          showShadow={
                            stickyColumns.indexOf(key) ===
                            stickyColumns.length - 1
                          }
                        >
                          <div className="flex items-center gap-2">
                            {key === "actions"
                              ? "Actions"
                              : key.replace(/_/g, " ")}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-4 w-4 transition-opacity ${stickyColumns.includes(key) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                              onClick={() => toggleSticky(key)}
                            >
                              {stickyColumns.includes(key) ? (
                                <PinOff className="h-3 w-3" />
                              ) : (
                                <Pin className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={displayFields.length + 1}
                          className="h-64 text-center"
                        >
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                          <p className="mt-2 text-sm text-slate-500 font-medium">
                            Loading content library...
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : projects.length > 0 ? (
                      [...projects]
                        .sort((a, b) =>
                          a.id === selectedRowId
                            ? -1
                            : b.id === selectedRowId
                              ? 1
                              : 0,
                        )
                        .map((project: Project) => {
                          const isSelected = selectedRowId === project.id;
                          return (
                            <TableRow
                              key={project.id}
                              className={`transition-colors cursor-pointer group ${
                                isSelected
                                  ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm"
                                  : "hover:bg-slate-50"
                              }`}
                              onClick={() =>
                                setSelectedRowId(isSelected ? null : project.id)
                              }
                              data-state={isSelected ? "selected" : undefined}
                            >
                              {orderedFields.map((key) => {
                                if (key === "actions") {
                                  return (
                                    <TableCell
                                      key="actions"
                                      className="whitespace-nowrap"
                                      sticky={
                                        stickyColumns.includes("actions")
                                          ? "left"
                                          : undefined
                                      }
                                      left={
                                        stickyColumns.includes("actions")
                                          ? getStickyOffset("actions")
                                          : undefined
                                      }
                                      width={PINNED_WIDTH}
                                      showShadow={
                                        stickyColumns.indexOf("actions") ===
                                        stickyColumns.length - 1
                                      }
                                    >
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(project);
                                          }}
                                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(project);
                                          }}
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  );
                                }

                                const value = (project as any)[key];
                                return (
                                  <TableCell
                                    key={key}
                                    className={cn(
                                      "text-slate-600 font-medium group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50",
                                      key === "notes" || key === "description"
                                        ? "max-w-[300px]"
                                        : "max-w-[250px]",
                                    )}
                                    sticky={
                                      stickyColumns.includes(key)
                                        ? "left"
                                        : undefined
                                    }
                                    left={
                                      stickyColumns.includes(key)
                                        ? getStickyOffset(key)
                                        : undefined
                                    }
                                    width={
                                      stickyColumns.includes(key)
                                        ? PINNED_WIDTH
                                        : COLUMN_WIDTHS[key] || 150
                                    }
                                    showShadow={
                                      stickyColumns.indexOf(key) ===
                                      stickyColumns.length - 1
                                    }
                                  >
                                    {value === null ||
                                    value === undefined ||
                                    value === "" ? (
                                      <span className="text-muted-foreground text-xs">
                                        —
                                      </span>
                                    ) : (
                                      (() => {
                                        let values = smartParse(value);
                                        // Capitalize and format for display
                                        values = values.map((v) => {
                                          if (!v) return v;
                                          const s = String(v).replace(
                                            /_/g,
                                            " ",
                                          );
                                          return (
                                            s.charAt(0).toUpperCase() +
                                            s.slice(1)
                                          );
                                        });

                                        if (
                                          [
                                            "content_type",
                                            "status",
                                            "genres",
                                            "vibe_tags",
                                          ].includes(key)
                                        ) {
                                          const MAX_TAGS = 3;
                                          const visible = values.slice(
                                            0,
                                            MAX_TAGS,
                                          );
                                          const overflow =
                                            values.length - MAX_TAGS;
                                          return (
                                            <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                                              {visible.map((v, i) => (
                                                <Badge
                                                  key={`${v}-${i}`}
                                                  variant={
                                                    key === "vibe_tags"
                                                      ? "outline"
                                                      : "secondary"
                                                  }
                                                  className={cn(
                                                    "text-[10px] h-5 px-2 font-normal whitespace-nowrap shrink-0",
                                                    key === "vibe_tags"
                                                      ? "border-slate-200 text-slate-500 bg-transparent"
                                                      : "bg-slate-100 text-slate-600 border-none",
                                                  )}
                                                  title={v}
                                                >
                                                  {v}
                                                </Badge>
                                              ))}
                                              {overflow > 0 && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-[10px] h-5 px-1.5 font-normal whitespace-nowrap shrink-0 text-muted-foreground"
                                                  title={values
                                                    .slice(MAX_TAGS)
                                                    .join(", ")}
                                                >
                                                  +{overflow}
                                                </Badge>
                                              )}
                                            </div>
                                          );
                                        }
                                        const displayValue = values.join(", ");
                                        return (
                                          <span
                                            className="truncate block"
                                            title={displayValue}
                                          >
                                            {displayValue}
                                          </span>
                                        );
                                      })()
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={displayFields.length + 1}
                          className="h-32 text-center text-slate-500 font-medium"
                        >
                          No items found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <MediaDialog
        open={isMediaDialogOpen}
        onOpenChange={setIsMediaDialogOpen}
        media={selectedMedia as any}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        assignmentPage="home"
        selectedShelfId={selectedShelfId}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Move to archive?"
        itemName={mediaToDelete?.title}
        description={
          mediaToDelete?.title
            ? `Are you sure you want to move "${mediaToDelete.title}" to the bin? You’ll be able to permanently delete it later from the Archive.`
            : "Are you sure you want to move this item to the bin? You’ll be able to permanently delete it later from the Archive."
        }
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};

export default HomePage;
