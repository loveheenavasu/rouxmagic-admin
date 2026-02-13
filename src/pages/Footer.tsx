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
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Loader2, Pin, PinOff } from "lucide-react";
import { format } from "date-fns";
import { Footers } from "@/api/integrations/supabase/footer/footer";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import FooterDialog from "@/components/FooterDialog";
import { toast } from "sonner";
import { Flag, Footer } from "@/types";
import { StatsRow } from "@/components/StatsRow";
import { cn } from "@/lib/utils";

const footersAPI = Footers as Required<typeof Footers>;

export default function FooterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFooter, setSelectedFooter] = useState<Footer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [footerToDelete, setFooterToDelete] = useState<Footer | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [stickyColumns, setStickyColumns] = useState<string[]>(["actions", "title"]);

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


  const PINNED_WIDTH = 200;
  const COLUMN_WIDTHS: Record<string, number> = {
    actions: PINNED_WIDTH,
    title: PINNED_WIDTH,
    url: 150,
    icon_url: 150,
    created_at: 200,
  };

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

  const {
    data: footerLinks = [],
    isLoading,
    error,
  } = useQuery<Footer[]>({
    queryKey: ["footer", searchQuery],
    queryFn: async () => {
      const response = await footersAPI.get({
        eq: [],
        sort: "created_at",
        sortBy: "asc",
        search: searchQuery || undefined,
        searchFields: ["title", "url"],
      });

      if (response.flag !== Flag.Success || !response.data) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to fetch footer links";
        throw new Error(errorMessage);
      }

      const data = Array.isArray(response.data)
        ? (response.data as Footer[])
        : ([response.data].filter(Boolean) as Footer[]);

      return data.filter((item) => (item as any).is_deleted !== true);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await footersAPI.createOne(data);
      if (response.flag !== Flag.Success || !response.data) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        throw new Error(
          supabaseError?.message ||
          response.error?.message ||
          "Failed to create"
        );
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer"] });
      setIsDialogOpen(false);
      toast.success("Footer link added successfully!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to add: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await footersAPI.updateOneByID(id, data);
      if (response.flag !== Flag.Success || !response.data) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        throw new Error(
          supabaseError?.message ||
          response.error?.message ||
          "Failed to update"
        );
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer"] });
      setIsDialogOpen(false);
      setSelectedFooter(null);
      toast.success("Footer link updated successfully!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await footersAPI.toogleSoftDeleteOneByID(id, true);
      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        throw new Error(
          supabaseError?.message ||
          response.error?.message ||
          "Failed to delete footer link"
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer"] });
      setDeleteDialogOpen(false);
      setFooterToDelete(null);
      toast.success("Moved to archive.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete footer link: ${err.message}`);
    },
  });

  const handleAddNew = () => {
    setSelectedFooter(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (footer: Footer) => {
    setSelectedFooter(footer);
    setSelectedRowId(footer.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (footer: Footer) => {
    setFooterToDelete(footer);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (selectedFooter?.id) {
      await updateMutation.mutateAsync({ id: selectedFooter.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const confirmDelete = async () => {
    if (footerToDelete?.id) {
      await deleteMutation.mutateAsync(footerToDelete.id);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-bold mb-2">Error Loading Footer</h2>
          <p>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const displayFields = ["title", "url", "created_at"];
  const allAvailableFields = ["actions", ...displayFields];
  const orderedFields = [
    ...allAvailableFields.filter(key => stickyColumns.includes(key)),
    ...allAvailableFields.filter(key => !stickyColumns.includes(key))
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <StatsRow
        items={[{ label: "Total Links", value: footerLinks.length }]}
        title="Footer"
        description="Manage footer social links and connect links shown on the frontend."
        handleNew={handleAddNew}
      />

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <Input
              placeholder="Search by title or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 max-w-sm"
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
                      sticky={stickyColumns.includes(key) ? "left" : undefined}
                      left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                      width={stickyColumns.includes(key) ? PINNED_WIDTH : (COLUMN_WIDTHS[key] || 150)}
                      showShadow={stickyColumns.indexOf(key) === stickyColumns.length - 1}
                    >
                      <div className="flex items-center gap-2">
                        {key === "actions" ? "Actions" : key.replace(/_/g, " ")}
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
                        Loading footer links...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : footerLinks.length > 0 ? (
                  [...footerLinks].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map((link) => {
                    const isSelected = selectedRowId === link.id;
                    return (
                      <TableRow
                        key={link.id}
                        className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50"
                          }`}
                        onClick={() => setSelectedRowId(isSelected ? null : link.id)}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        {orderedFields.map((key) => {
                          if (key === "actions") {
                            return (
                              <TableCell
                                key="actions"
                                className="whitespace-nowrap"
                                sticky={stickyColumns.includes("actions") ? "left" : undefined}
                                left={stickyColumns.includes("actions") ? getStickyOffset("actions") : undefined}
                                width={PINNED_WIDTH}
                                showShadow={stickyColumns.indexOf("actions") === stickyColumns.length - 1}
                              >
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(link);
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
                                      handleDelete(link);
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            );
                          }

                          const value = (link as any)[key];
                          return (
                            <TableCell
                              key={key}
                              className={cn(
                                "text-slate-600 font-medium group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50",
                                (key === "notes" || key === "description") ? "max-w-[300px]" : "max-w-[250px]"
                              )}
                              sticky={stickyColumns.includes(key) ? "left" : undefined}
                              left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                              width={stickyColumns.includes(key) ? PINNED_WIDTH : (COLUMN_WIDTHS[key] || 150)}
                              showShadow={stickyColumns.indexOf(key) === stickyColumns.length - 1}
                            >
                              {value === null || value === undefined ? (
                                <span className="text-slate-300 text-xs">—</span>
                              ) : key === "url" ? (
                                <a
                                  href={String(value)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline truncate block"
                                >
                                  {String(value)}
                                </a>
                              ) : key === "created_at" ? (
                                <span
                                  className="truncate block text-slate-600"
                                  title={value}
                                >
                                  {format(
                                    new Date(value),
                                    "MMM d, yyyy 'at' h:mm a"
                                  )}
                                </span>
                              ) : (
                                <span
                                  className="truncate block"
                                  title={String(value)}
                                >
                                  {String(value)}
                                </span>
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
                      No footer links found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <FooterDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        footer={selectedFooter}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={footerToDelete?.title}
        isDeleting={deleteMutation.isPending}
        description={
          footerToDelete
            ? `Are you sure you want to move "${footerToDelete.title}" to the bin? You’ll be able to permanently delete it later from the Archive.`
            : "Are you sure you want to move this footer link to the bin? You’ll be able to permanently delete it later from the Archive."
        }
      />
    </div>
  );
}
