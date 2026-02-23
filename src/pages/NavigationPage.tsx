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
import { Edit, Trash2, Loader2, GripVertical, Pin, PinOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NavigationItems } from "@/api";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import NavigationDialog from "@/components/NavigationDialog";
import { toast } from "sonner";
import { Flag, NavigationItem, NavigationItemFormData } from "@/types";
import { StatsRow } from "@/components/StatsRow";

export default function NavigationPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<NavigationItem | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<NavigationItem | null>(null);
    const [stickyColumns, setStickyColumns] = useState<string[]>(["actions", "label"]);

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

    const PINNED_WIDTH = 150;
    const getStickyOffset = (columnKey: string): number => {
        const index = stickyColumns.indexOf(columnKey);
        if (index === -1) return 0;

        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += PINNED_WIDTH;
        }
        return offset;
    };

    const {
        data: items = [],
        isLoading,
    } = useQuery<NavigationItem[]>({
        queryKey: ["navigation-items"],
        queryFn: async () => {
            const response = await NavigationItems.get({
                sort: "order_index",
                sortBy: "asc",
            });

            console.log("NavigationItems response:", response);

            if (response.flag !== Flag.Success || !response.data) {
                if (response.flag === Flag.APIError) {
                    toast.error(`API Error: ${response.error?.message || "Unknown error"}`);
                }
                return [];
            }

            return Array.isArray(response.data) ? response.data : [response.data];
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: NavigationItemFormData) => NavigationItems.createOne(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["navigation-items"] });
            toast.success("Navigation item created successfully");
            setIsDialogOpen(false);
        },
        onError: () => toast.error("Failed to create navigation item"),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: NavigationItemFormData }) =>
            NavigationItems.updateOneByID(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["navigation-items"] });
            toast.success("Navigation item updated successfully");
            setIsDialogOpen(false);
            setSelectedItem(null);
        },
        onError: () => toast.error("Failed to update navigation item"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => NavigationItems.deleteOneByIDPermanent(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["navigation-items"] });
            toast.success("Navigation item deleted successfully");
            setDeleteDialogOpen(false);
            setItemToDelete(null);
        },
        onError: () => toast.error("Failed to delete navigation item"),
    });

    const handleOpenAdd = () => {
        setSelectedItem(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (item: NavigationItem) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

    const handleOpenDelete = (item: NavigationItem) => {
        setItemToDelete(item);
        setDeleteDialogOpen(true);
    };

    const handleSubmit = (data: NavigationItemFormData) => {
        if (selectedItem) {
            updateMutation.mutate({ id: selectedItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <StatsRow
                title="Navigation Header"
                description="Manage the main navigation links for the application."
                handleNew={handleOpenAdd}
                items={[
                    { label: "Total Links", value: items.length },
                    { label: "Active Links", value: items.filter(i => i.is_active).length },
                ]}
            />

            <Card className="border-slate-100 shadow-sm overflow-hidden rounded-2xl">
                <Table>
                    <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead
                                className="font-semibold text-slate-700 group py-4"
                                sticky={stickyColumns.includes("actions") ? "left" : undefined}
                                left={stickyColumns.includes("actions") ? getStickyOffset("actions") : undefined}
                                width={stickyColumns.includes("actions") ? 150 : (120)}
                                showShadow={stickyColumns.indexOf("actions") === stickyColumns.length - 1}
                            >
                                <div className="flex items-center gap-2">
                                    Actions
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-4 w-4 transition-opacity ${stickyColumns.includes("actions") ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                        onClick={() => toggleSticky("actions")}
                                    >
                                        {stickyColumns.includes("actions") ? (
                                            <PinOff className="h-3 w-3" />
                                        ) : (
                                            <Pin className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                            </TableHead>
                            <TableHead
                                className="font-semibold text-slate-700 group py-4"
                                sticky={stickyColumns.includes("order") ? "left" : undefined}
                                left={stickyColumns.includes("order") ? getStickyOffset("order") : undefined}
                                width={stickyColumns.includes("order") ? 150 : (100)}
                                showShadow={stickyColumns.indexOf("order") === stickyColumns.length - 1}
                            >
                                <div className="flex items-center gap-2">
                                    Order
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-4 w-4 transition-opacity ${stickyColumns.includes("order") ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                        onClick={() => toggleSticky("order")}
                                    >
                                        {stickyColumns.includes("order") ? (
                                            <PinOff className="h-3 w-3" />
                                        ) : (
                                            <Pin className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                            </TableHead>
                            <TableHead
                                className="font-semibold text-slate-700 group py-4"
                                sticky={stickyColumns.includes("label") ? "left" : undefined}
                                left={stickyColumns.includes("label") ? getStickyOffset("label") : undefined}
                                width={stickyColumns.includes("label") ? 150 : (200)}
                                showShadow={stickyColumns.indexOf("label") === stickyColumns.length - 1}
                            >
                                <div className="flex items-center gap-2">
                                    Label
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-4 w-4 transition-opacity ${stickyColumns.includes("label") ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                        onClick={() => toggleSticky("label")}
                                    >
                                        {stickyColumns.includes("label") ? (
                                            <PinOff className="h-3 w-3" />
                                        ) : (
                                            <Pin className="h-3 w-3" />
                                        )}
                                    </Button>
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-slate-700" width={300}>HREF</TableHead>
                            <TableHead className="font-semibold text-slate-700 text-center" width={120}>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                                    No navigation items found. Click "Add Item" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                                    <TableCell
                                        sticky={stickyColumns.includes("actions") ? "left" : undefined}
                                        left={stickyColumns.includes("actions") ? getStickyOffset("actions") : undefined}
                                        width={PINNED_WIDTH}
                                        showShadow={stickyColumns.indexOf("actions") === stickyColumns.length - 1}
                                        className="bg-white group-hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenEdit(item)}
                                                className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleOpenDelete(item)}
                                                className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        sticky={stickyColumns.includes("order") ? "left" : undefined}
                                        left={stickyColumns.includes("order") ? getStickyOffset("order") : undefined}
                                        width={PINNED_WIDTH}
                                        showShadow={stickyColumns.indexOf("order") === stickyColumns.length - 1}
                                        className="bg-white group-hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-400" />
                                            <span className="font-mono text-sm text-slate-600">{item.order_index}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell
                                        className="font-medium text-slate-900 px-4 bg-white group-hover:bg-slate-50 transition-colors"
                                        sticky={stickyColumns.includes("label") ? "left" : undefined}
                                        left={stickyColumns.includes("label") ? getStickyOffset("label") : undefined}
                                        width={PINNED_WIDTH}
                                        showShadow={stickyColumns.indexOf("label") === stickyColumns.length - 1}
                                    >
                                        {item.label}
                                    </TableCell>
                                    <TableCell className="text-slate-500 font-mono text-xs max-w-[200px] truncate">
                                        {item.href}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge
                                            variant={item.is_active ? "default" : "secondary"}
                                            className={item.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"}
                                        >
                                            {item.is_active ? "Active" : "Disabled"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <NavigationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSubmit={handleSubmit}
                initialData={selectedItem}
                mode={selectedItem ? "edit" : "add"}
            />

            <DeleteConfirmationDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={() => itemToDelete && deleteMutation.mutate(itemToDelete.id)}
                title="Delete Navigation Item"
                description={`Are you sure you want to delete "${itemToDelete?.label}"? This action cannot be undone.`}
                isDeleting={deleteMutation.isPending}
                confirmLabel="Delete Permanent"
            />
        </div>
    );
}
