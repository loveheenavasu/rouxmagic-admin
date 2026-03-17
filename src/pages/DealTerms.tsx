import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DealTermsAPI } from "@/api";
import { DealTerm, Flag, PageName } from "@/types";
import { PageSettingsCard } from "@/components/PageSettingsCard";

export default function DealTerms() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<DealTerm | null>(null);
  const [formData, setFormData] = useState<Partial<DealTerm>>({
    title: "",
    order: 0,
  });

  const queryClient = useQueryClient();

  // Fetch Deal Terms
  const {
    data: termsList = [],
    isLoading,
    error,
  } = useQuery<DealTerm[]>({
    queryKey: ["deal_terms"],
    queryFn: async () => {
      const response = await DealTermsAPI.get({
        eq: [],
        sort: "order",
        sortBy: "asc",
      });

      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        throw new Error(
          response.error?.message || "Failed to fetch deal terms",
        );
      }

      return Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as DealTerm[]);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<DealTerm>) => {
      const conflictTerm = termsList.find((t) => t.order === data.order);
      if (conflictTerm) {
        const maxOrder = termsList.reduce(
          (max, t) => Math.max(max, t.order || 0),
          0,
        );
        await DealTermsAPI.updateOneByID(conflictTerm.id, {
          order: maxOrder + 1,
        });
      }

      const response = await DealTermsAPI.createOne(data as DealTerm);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to create term");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_terms"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Term created successfully!");
    },
    onError: (err: Error) =>
      toast.error(`Failed to create term: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      originalOrder,
    }: {
      id: string;
      data: Partial<DealTerm>;
      originalOrder?: number;
    }) => {
      if (
        data.order !== undefined &&
        originalOrder !== undefined &&
        data.order !== originalOrder
      ) {
        const conflictTerm = termsList.find(
          (t) => t.order === data.order && t.id !== id,
        );
        if (conflictTerm) {
          // Interchange: assign originalOrder to the conflicting term
          await DealTermsAPI.updateOneByID(conflictTerm.id, {
            order: originalOrder,
          });
        }
      }

      const response = await DealTermsAPI.updateOneByID(id, data);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to update term");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_terms"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Term updated successfully!");
    },
    onError: (err: Error) =>
      toast.error(`Failed to update term: ${err.message}`),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await DealTermsAPI.deleteOneByIDPermanent(id);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to delete term");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_terms"] });
      setIsDeleteDialogOpen(false);
      setSelectedTerm(null);
      toast.success("Term deleted successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenDialog = (term?: DealTerm) => {
    if (term) {
      setSelectedTerm(term);
      setFormData({
        title: term.title || "",
        order: term.order || 0,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (term: DealTerm) => {
    setSelectedTerm(term);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedTerm(null);
    setFormData({
      title: "",
      order: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    if (selectedTerm) {
      updateMutation.mutate({
        id: selectedTerm.id,
        data: formData,
        originalOrder: selectedTerm.order,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deal Terms</h1>
          <p className="text-muted-foreground mt-1">
            Manage terms and conditions for your deals.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Term
        </Button>
      </div>

      <PageSettingsCard
        pageName={PageName.DealTerms}
        shouldAcceptSubtitle={false}
      />

      <Card>
        <CardHeader>
          <CardTitle>Terms List</CardTitle>
          <CardDescription>
            All deal terms mapped to your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">
              Error fetching terms: {(error as Error).message}
            </div>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] font-bold text-muted-foreground">
                    Actions
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground w-[100px] text-center">
                    Order
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Title
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground min-w-[150px]">
                    Created At
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !termsList || termsList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No terms found. Click 'Add New Term' to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  termsList.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="align-top py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(term)}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(term)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top py-4 font-mono text-sm text-muted-foreground">
                        {term.order}
                      </TableCell>
                      <TableCell className="font-medium align-top py-4 whitespace-nowrap">
                        {term.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm align-top py-4 whitespace-nowrap">
                        {format(new Date(term.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedTerm ? "Edit Term" : "Add New Term"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedTerm ? "Save Changes" : "Create Term"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the term. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedTerm && deleteMutation.mutate(selectedTerm.id)
              }
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Term"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
