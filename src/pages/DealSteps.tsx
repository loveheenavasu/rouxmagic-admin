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
import { Textarea } from "@/components/ui/textarea";
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
import { DealStepsAPI } from "@/api";
import { DealStep, Flag, PageName } from "@/types";
import { PageSettingsCard } from "@/components/PageSettingsCard";

export default function DealSteps() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<DealStep | null>(null);
  const [formData, setFormData] = useState<Partial<DealStep>>({
    title: "",
    description: "",
    order: 1,
  });

  const queryClient = useQueryClient();

  // Fetch Deal Steps
  const {
    data: stepsList = [],
    isLoading,
    error,
  } = useQuery<DealStep[]>({
    queryKey: ["deal_steps"],
    queryFn: async () => {
      const response = await DealStepsAPI.get({
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
          response.error?.message || "Failed to fetch deal steps",
        );
      }

      return Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as DealStep[]);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<DealStep>) => {
      const conflictStep = stepsList.find((s) => s.order === data.order);
      if (conflictStep) {
        const maxOrder = stepsList.reduce(
          (max, s) => Math.max(max, s.order || 0),
          0,
        );
        await DealStepsAPI.updateOneByID(conflictStep.id, {
          order: maxOrder + 1,
        });
      }

      const response = await DealStepsAPI.createOne(data as DealStep);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to create step");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_steps"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Step created successfully!");
    },
    onError: (err: Error) =>
      toast.error(`Failed to create step: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
      originalOrder,
    }: {
      id: string;
      data: Partial<DealStep>;
      originalOrder?: number;
    }) => {
      if (
        data.order !== undefined &&
        originalOrder !== undefined &&
        data.order !== originalOrder
      ) {
        const conflictStep = stepsList.find(
          (s) => s.order === data.order && s.id !== id,
        );
        if (conflictStep) {
          // Interchange: assign originalOrder to the conflicting step
          await DealStepsAPI.updateOneByID(conflictStep.id, {
            order: originalOrder,
          });
        }
      }

      const response = await DealStepsAPI.updateOneByID(id, data);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to update step");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_steps"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Step updated successfully!");
    },
    onError: (err: Error) =>
      toast.error(`Failed to update step: ${err.message}`),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await DealStepsAPI.deleteOneByIDPermanent(id);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to delete step");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal_steps"] });
      setIsDeleteDialogOpen(false);
      setSelectedStep(null);
      toast.success("Step deleted successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenDialog = (step?: DealStep) => {
    if (step) {
      setSelectedStep(step);
      setFormData({
        title: step.title || "",
        description: step.description || "",
        order: step.order || 0,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (step: DealStep) => {
    setSelectedStep(step);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedStep(null);
    setFormData({
      title: "",
      description: "",
      order: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Title and Step Number are required");
      return;
    }

    if (selectedStep) {
      updateMutation.mutate({
        id: selectedStep.id,
        data: formData,
        originalOrder: selectedStep.order,
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
          <h1 className="text-3xl font-bold tracking-tight">Deal Steps</h1>
          <p className="text-muted-foreground mt-1">
            Manage the step instructions or phases for your deals.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Step
        </Button>
      </div>

      <PageSettingsCard
        pageName={PageName.DealSteps}
        shouldAcceptSubtitle={false}
      />

      <Card>
        <CardHeader>
          <CardTitle>Steps List</CardTitle>
          <CardDescription>
            All deal steps mapped to your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">
              Error fetching steps: {(error as Error).message}
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
                  <TableHead className="font-bold text-muted-foreground min-w-[300px]">
                    Description
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground min-w-[150px]">
                    Created At
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !stepsList || stepsList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No steps found. Click 'Add New Step' to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  stepsList.map((step) => (
                    <TableRow key={step.id}>
                      <TableCell className="align-top py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(step)}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(step)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top py-4 font-mono text-sm text-muted-foreground">
                        {step.order}
                      </TableCell>
                      <TableCell className="font-medium align-top py-4 whitespace-nowrap">
                        {step.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground align-top py-4">
                        <div
                          className="line-clamp-3"
                          title={step.description || ""}
                        >
                          {step.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm align-top py-4 whitespace-nowrap">
                        {format(new Date(step.created_at), "MMM d, yyyy")}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedStep ? "Edit Step" : "Add New Step"}
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={5}
              />
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
                {selectedStep ? "Save Changes" : "Create Step"}
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
              This will permanently delete the step. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedStep && deleteMutation.mutate(selectedStep.id)
              }
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Step"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
