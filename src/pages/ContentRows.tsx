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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, Loader2, Eye, EyeOff, Search } from "lucide-react";
import { ContentRows } from "@/api/integrations/supabase/content_rows/content_rows";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { Flag, ContentRow, PageEnum, FilterTypeEnum } from "@/types";
import { StatsRow } from "@/components/StatsRow";
import { Projects } from "@/api/integrations/supabase/projects/projects";

const contentRowsAPI = ContentRows as Required<typeof ContentRows>;
const projectsAPI = Projects as Required<typeof Projects>;

const ContentRowsPage = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<Partial<ContentRow> | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [rowToDelete, setRowToDelete] = useState<ContentRow | null>(null);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    const [pageFilter, setPageFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        label: "",
        page: "home" as PageEnum,
        filter_type: "flag" as FilterTypeEnum,
        filter_value: "",
        order_index: 0,
        is_active: true,
        max_items: null as number | null,
    });

    const queryClient = useQueryClient();

    // Fetch content rows
    const {
        data: contentRows = [],
        isLoading,
        error,
    } = useQuery<ContentRow[]>({
        queryKey: ["content-rows", pageFilter, searchQuery],
        queryFn: async () => {
            const eqFilters = [];
            if (pageFilter !== "all") {
                eqFilters.push({ key: "page" as const, value: pageFilter });
            }
            const response = await contentRowsAPI.get({
                eq: eqFilters,
                sort: "order_index",
                sortBy: "asc",
                search: searchQuery || undefined,
                searchFields: ["label", "filter_value"],
            });

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
                    "Failed to fetch content rows";
                throw new Error(errorMessage);
            }

            if (response.data === null || response.data === undefined) {
                return [];
            }

            const rows = Array.isArray(response.data) ? (response.data as ContentRow[]) : [];

            // Add match counts for each row
            const rowsWithCounts = await Promise.all(
                rows.map(async (row) => {
                    const eqFilters: any[] = [];
                    const inValue: any = row.filter_value.includes(",")
                        ? {
                            key: row.filter_type === FilterTypeEnum.Status ? "status" : "content_type",
                            value: row.filter_value.split(",").map(v => v.trim())
                        }
                        : undefined;

                    if (!inValue) {
                        if (row.filter_type === FilterTypeEnum.Flag) {
                            eqFilters.push({ key: row.filter_value, value: true });
                        } else {
                            eqFilters.push({ key: row.filter_type, value: row.filter_value });
                        }
                    }

                    const projectsResp = await projectsAPI.get({
                        eq: eqFilters,
                        inValue,
                        limit: 1 // We just need to check if any exist or more
                    });

                    // For real count, we'd need a separate count API or fetch all, 
                    // but for a preview, we'll just check if it returns data.
                    // Let's assume we want a real count for "identify things"
                    const count = Array.isArray(projectsResp.data) ? projectsResp.data.length : (projectsResp.data ? 1 : 0);

                    return { ...row, matchCount: count };
                })
            );

            return rowsWithCounts as any;
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await contentRowsAPI.createOne(data);
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
                    "Failed to create content row";
                throw new Error(errorMessage);
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["content-rows"] });
            setIsDialogOpen(false);
            resetForm();
            toast.success("Content row added successfully!");
        },
        onError: (error: Error) => {
            toast.error(`Failed to add content row: ${error.message}`);
        },
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const response = await contentRowsAPI.updateOneByID(id, data);
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
                    "Failed to update content row";
                throw new Error(errorMessage);
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["content-rows"] });
            setIsDialogOpen(false);
            setSelectedRow(null);
            resetForm();
            toast.success("Content row updated successfully!");
        },
        onError: (error: Error) => {
            toast.error(`Failed to update content row: ${error.message}`);
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await contentRowsAPI.deleteOneByIDPermanent(id);
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
                    "Failed to delete content row";
                throw new Error(errorMessage);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["content-rows"] });
            setDeleteDialogOpen(false);
            setRowToDelete(null);
            toast.success("Content row deleted successfully!");
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete content row: ${error.message}`);
        },
    });

    const resetForm = () => {
        setFormData({
            label: "",
            page: "home" as PageEnum,
            filter_type: "flag" as FilterTypeEnum,
            filter_value: "",
            order_index: 0,
            is_active: true,
            max_items: null,
        });
    };

    const handleAddNew = () => {
        resetForm();
        setFormData({
            ...formData,
            label: "",
            filter_value: "",
            page: pageFilter !== "all" ? (pageFilter as PageEnum) : PageEnum.Home,
            order_index: 0,
            is_active: true,
            max_items: null
        });
        setSelectedRow(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (row: ContentRow) => {
        setSelectedRow(row);
        setSelectedRowId(row.id);
        setFormData({
            label: row.label,
            page: row.page,
            filter_type: row.filter_type,
            filter_value: row.filter_value,
            order_index: row.order_index,
            is_active: row.is_active,
            max_items: row.max_items ?? null,
        });
        setIsDialogOpen(true);
    };

    const handleDelete = (row: ContentRow) => {
        setRowToDelete(row);
        setDeleteDialogOpen(true);
    };

    const inferFilterType = (key: string): FilterTypeEnum => {
        const lowerKey = key.toLowerCase();
        // Check for content types
        if (["film", "tv show", "song", "audiobook", "episode", "season"].some(type => lowerKey.includes(type))) {
            return FilterTypeEnum.ContentType;
        }
        // Check for statuses
        if (["released", "draft", "archived", "scheduled"].includes(lowerKey)) {
            return FilterTypeEnum.Status;
        }
        // Default to flag for everything else (e.g. in_now_playing, is_trending)
        return FilterTypeEnum.Flag;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const inferredType = inferFilterType(formData.filter_value);
        const dataToSubmit = { ...formData, filter_type: inferredType };

        if (selectedRow) {
            await updateMutation.mutateAsync({ id: selectedRow.id!, data: dataToSubmit });
        } else {
            await createMutation.mutateAsync(dataToSubmit);
        }
    };

    const confirmDelete = async () => {
        if (rowToDelete) {
            await deleteMutation.mutateAsync(rowToDelete.id);
        }
    };

    const toggleActive = async (row: ContentRow) => {
        await updateMutation.mutateAsync({
            id: row.id,
            data: { is_active: !row.is_active },
        });
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center text-red-500">
                    <h2 className="text-2xl font-bold mb-2">Error Loading Content Rows</h2>
                    <p>{(error as Error).message}</p>
                </div>
            </div>
        );
    }

    const activeRows = contentRows.filter((r) => r.is_active).length;
    const inactiveRows = contentRows.filter((r) => !r.is_active).length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <StatsRow
                items={[
                    { label: "Total Rows", value: contentRows.length },
                    { label: "Active", value: activeRows },
                    { label: "Inactive", value: inactiveRows },
                ]}
                title="Content Rows"
                description="Manage dynamic content shelves across all pages"
                handleNew={handleAddNew}
            />

            <Tabs value={pageFilter} onValueChange={setPageFilter} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-12">
                    <TabsTrigger value="all" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">All Pages</TabsTrigger>
                    <TabsTrigger value="home" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Home</TabsTrigger>
                    <TabsTrigger value="watch" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Watch</TabsTrigger>
                    <TabsTrigger value="listen" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">Listen</TabsTrigger>
                    <TabsTrigger value="mylist" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">My List</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Main Content Area */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search rows by label or filter value..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 bg-slate-50 border-none rounded-xl focus-visible:ring-indigo-500"
                        />
                    </div>

                    <div className="rounded-xl border border-slate-100 overflow-hidden overflow-x-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                                <TableRow>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Actions
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Label
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Page
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Filter Type
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Filter Value
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Order
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Max Items
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Matches
                                    </TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-4 bg-slate-50">
                                        Status
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-64 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                                            <p className="mt-2 text-sm text-slate-500 font-medium">
                                                Loading content rows...
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : contentRows.length > 0 ? (
                                    [...contentRows]
                                        .sort((a, b) =>
                                            a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0
                                        )
                                        .map((row: ContentRow) => {
                                            const isSelected = selectedRowId === row.id;
                                            return (
                                                <TableRow
                                                    key={row.id}
                                                    className={`transition-colors cursor-pointer group ${isSelected
                                                        ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm"
                                                        : "hover:bg-slate-50/50"
                                                        }`}
                                                    onClick={() =>
                                                        setSelectedRowId(isSelected ? null : row.id)
                                                    }
                                                    data-state={isSelected ? "selected" : undefined}
                                                >
                                                    <TableCell className="px-4 whitespace-nowrap">
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEdit(row);
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
                                                                    toggleActive(row);
                                                                }}
                                                                className={`${row.is_active
                                                                    ? "text-green-500 hover:text-green-700 hover:bg-green-50"
                                                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                                                    } rounded-lg`}
                                                            >
                                                                {row.is_active ? (
                                                                    <Eye className="h-4 w-4" />
                                                                ) : (
                                                                    <EyeOff className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(row);
                                                                }}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        {row.label}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                                                            {row.page}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                            {row.filter_type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        {row.filter_value}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        {row.order_index}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        {row.max_items || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${(row as any).matchCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                                                            {(row as any).matchCount}+ items
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-slate-600 font-medium px-4">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-100 text-gray-700"
                                                                }`}
                                                        >
                                                            {row.is_active ? "Active" : "Inactive"}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-32 text-center text-slate-500 font-medium"
                                        >
                                            No content rows found. Add your first row to get started.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedRow ? "Edit Content Row" : "Add Content Row"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="label">Label *</Label>
                                <Input
                                    id="label"
                                    value={formData.label}
                                    onChange={(e) =>
                                        setFormData({ ...formData, label: e.target.value })
                                    }
                                    placeholder="e.g., Trending Now"
                                    required
                                    className="bg-slate-50 border-slate-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="filter_value">Filter Key *</Label>
                                <Select
                                    value={formData.filter_value}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, filter_value: value })
                                    }
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200 font-mono text-xs">
                                        <SelectValue placeholder="Select a filter..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Film">Film (Content Type)</SelectItem>
                                        <SelectItem value="TV Show">TV Show (Content Type)</SelectItem>
                                        <SelectItem value="Song">Song (Content Type)</SelectItem>
                                        <SelectItem value="Audiobook">Audiobook (Content Type)</SelectItem>
                                        <SelectItem value="in_now_playing">Now Playing (Flag)</SelectItem>
                                        <SelectItem value="in_coming_soon">Coming Soon (Flag)</SelectItem>
                                        <SelectItem value="in_latest_releases">Latest Releases (Flag)</SelectItem>
                                        <SelectItem value="in_hero_carousel">Hero Carousel (Flag)</SelectItem>
                                        <SelectItem value="released">Released (Status)</SelectItem>
                                        <SelectItem value="created">Created (Status)</SelectItem>
                                        <SelectItem value="custom">Custom (type manual)</SelectItem>
                                    </SelectContent>
                                </Select>

                                {formData.filter_value === "custom" && (
                                    <Input
                                        placeholder="Enter manual filter key..."
                                        className="mt-2 bg-slate-50 border-slate-200 font-mono text-sm"
                                        onChange={(e) => setFormData({ ...formData, filter_value: e.target.value })}
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="page">Page *</Label>
                                <Select
                                    value={formData.page}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, page: value as PageEnum })
                                    }
                                >
                                    <SelectTrigger className="bg-slate-50 border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="home">Home</SelectItem>
                                        <SelectItem value="watch">Watch</SelectItem>
                                        <SelectItem value="listen">Listen</SelectItem>
                                        <SelectItem value="mylist">My List</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Advanced fields hidden by default unless editing or needed */}
                            {selectedRow && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="order_index">Order Index</Label>
                                        <Input
                                            id="order_index"
                                            type="number"
                                            value={formData.order_index}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    order_index: parseInt(e.target.value) || 0,
                                                })
                                            }
                                            className="bg-slate-50 border-slate-200"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="max_items">Max Items</Label>
                                        <Input
                                            id="max_items"
                                            type="number"
                                            value={formData.max_items || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    max_items: e.target.value ? parseInt(e.target.value) : null,
                                                })
                                            }
                                            placeholder="No limit"
                                            className="bg-slate-50 border-slate-200"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2 pt-8">
                                        <Switch
                                            id="is_active"
                                            checked={formData.is_active}
                                            onCheckedChange={(checked: boolean) =>
                                                setFormData({ ...formData, is_active: checked })
                                            }
                                        />
                                        <Label htmlFor="is_active">Active</Label>
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {createMutation.isPending || updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : selectedRow ? (
                                    "Update Row"
                                ) : (
                                    "Add Row"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={confirmDelete}
                itemName={rowToDelete?.label}
                isDeleting={deleteMutation.isPending}
                description={
                    rowToDelete
                        ? `Are you sure you want to delete "${rowToDelete.label}"? This action cannot be undone.`
                        : "Are you sure you want to delete this content row?"
                }
            />
        </div>
    );
};

export default ContentRowsPage;
