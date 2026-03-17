import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
import { Plus, Edit, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DealsAPI } from "@/api";
import { Deal, Flag, PageName } from "@/types";
import { mediaService } from "@/services/mediaService";
import { PageSettingsCard } from "@/components/PageSettingsCard";

export default function Deals() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<Partial<Deal>>({
    title: "",
    subtitle: "",
    description: "",
    order: 0,
    currency: "USD",
    credit_amount: 0,
    cta_text: "",
    cta_link: "",
    image: "",
    is_active: true,
    price: 0,
  });
  const [isUploading, setIsUploading] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch Deals
  const {
    data: dealsList = [],
    isLoading,
    error,
  } = useQuery<Deal[]>({
    queryKey: ["deals"],
    queryFn: async () => {
      const response = await DealsAPI.get({
        eq: [],
        sort: "order",
        sortBy: "asc",
      });

      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        throw new Error(response.error?.message || "Failed to fetch deals");
      }

      return Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as Deal[]);
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Deal>) => {
      const response = await DealsAPI.createOne(data as Deal);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to create deal");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Deal created successfully!");
    },
    onError: (err: Error) =>
      toast.error(`Failed to create deal: ${err.message}`),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Deal> }) => {
      const response = await DealsAPI.updateOneByID(id, data);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to update deal");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Deal updated successfully!");
    },
    onError: (err: Error) =>
      toast.error(`Failed to update deal: ${err.message}`),
  });

  // Toggle Active mutation
  /*
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await DealsAPI.updateOneByID(id, { is_active });
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to update deal status");
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success(
        variables.is_active ? "Deal activated successfully!" : "Deal deactivated successfully!"
      );
    },
    onError: (err: Error) => toast.error(`Failed to update deal status: ${err.message}`),
  });
  */

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await DealsAPI.deleteOneByIDPermanent(id);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to delete deal");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsDeleteDialogOpen(false);
      setSelectedDeal(null);
      toast.success("Deal deleted successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenDialog = (deal?: Deal) => {
    if (deal) {
      setSelectedDeal(deal);
      setFormData({
        title: deal.title || "",
        subtitle: deal.subtitle || "",
        description: deal.description || "",
        order: deal.order || 0,
        currency: deal.currency || "USD",
        credit_amount: deal.credit_amount || 0,
        cta_text: deal.cta_text || "",
        cta_link: deal.cta_link || "",
        image: deal.image || "",
        is_active: deal.is_active ?? true,
        price: deal.price || 0,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  /*
  const handleToggleActive = async (deal: Deal) => {
    await toggleActiveMutation.mutateAsync({ id: deal.id, is_active: !deal.is_active });
  };
  */

  const handleOpenDelete = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedDeal(null);
    setFormData({
      title: "",
      subtitle: "",
      description: "",
      order: 0,
      currency: "USD",
      credit_amount: 0,
      cta_text: "",
      cta_link: "",
      image: "",
      is_active: true,
      price: 0,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.price === undefined) {
      toast.error("Title and Price are required");
      return;
    }

    if (selectedDeal) {
      updateMutation.mutate({ id: selectedDeal.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Promotional Deals
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your promotional deals and special offers.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Deal
        </Button>
      </div>

      <PageSettingsCard pageName={PageName.DealMain} />

      <Card>
        <CardHeader>
          <CardTitle>Deals List</CardTitle>
          <CardDescription>
            All promotional deals mapped to your database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">
              Error fetching deals: {(error as Error).message}
            </div>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] font-bold text-muted-foreground">
                    Actions
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Title
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Price
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Credits
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Subtitle
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Description
                  </TableHead>
                  {/* <TableHead className="font-bold text-muted-foreground">Active</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !dealsList || dealsList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No Deals found. Click 'Add New Deal' to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  dealsList.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(deal)}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(deal)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          {/*
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(deal)}
                            disabled={toggleActiveMutation.isPending}
                            title={deal.is_active ? "Deactivate" : "Activate"}
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100"
                          >
                            <Power className={`h-4 w-4 ${deal.is_active ? 'text-destructive' : 'text-green-600'}`} />
                          </Button>
                          */}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {deal.title}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: deal.currency || "USD",
                        }).format(deal.price / 100)}
                      </TableCell>
                      <TableCell>{deal.credit_amount / 100}</TableCell>
                      <TableCell className="text-muted-foreground min-w-[150px]">
                        <div
                          className="line-clamp-2"
                          title={deal.subtitle || ""}
                        >
                          {deal.subtitle || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground min-w-[200px]">
                        <div
                          className="line-clamp-2"
                          title={deal.description || ""}
                        >
                          {deal.description || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {/* {deal.is_active ? (
                          <div className="flex items-center text-green-600 border border-green-200 bg-green-50 px-2 py-1 rounded-full w-fit max-w-full text-xs font-semibold gap-1">
                            <Check className="h-3 w-3" />
                            <span className="hidden sm:inline">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-slate-500 border border-slate-200 bg-slate-50 px-2 py-1 rounded-full w-fit max-w-full text-xs font-semibold gap-1">
                            <X className="h-3 w-3" />
                            <span className="hidden sm:inline">Inactive</span>
                          </div>
                        )} */}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDeal ? "Edit Deal" : "Add New Deal"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subtitle: e.target.value,
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
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price in Cents *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      price: parseFloat(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      currency: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_amount">Credit Amount</Label>
                <Input
                  id="credit_amount"
                  type="number"
                  value={formData.credit_amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      credit_amount: parseFloat(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta_text">CTA Text</Label>
                <Input
                  id="cta_text"
                  value={formData.cta_text}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cta_text: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta_link">CTA Link</Label>
                <Input
                  id="cta_link"
                  value={formData.cta_link}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cta_link: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image"
                    value={formData.image}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        image: e.target.value,
                      }))
                    }
                    className="flex-1"
                  />
                  <div className="relative">
                    <Input
                      type="file"
                      className="hidden"
                      id="file-image"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setIsUploading("image");
                          const bucket = "Media";
                          const safeName = file.name.replace(/\s+/g, "_");
                          const path = `Deals/images/${Date.now()}-${safeName}`;
                          const publicUrl = await mediaService.uploadFile(
                            file,
                            bucket,
                            path,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            image: publicUrl,
                          }));
                          toast.success("Image uploaded successfully!");
                        } catch (error: any) {
                          toast.error(
                            `Image upload failed: ${
                              error?.message || "Unknown error"
                            }`,
                          );
                        } finally {
                          setIsUploading(null);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading === "image"}
                      onClick={() =>
                        document.getElementById("file-image")?.click()
                      }
                      className="h-10 px-3 bg-slate-50 border-dashed"
                    >
                      {isUploading === "image" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Upload</span>
                    </Button>
                  </div>
                </div>
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
                {selectedDeal ? "Save Changes" : "Create Deal"}
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
              This will permanently delete the deal. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedDeal && deleteMutation.mutate(selectedDeal.id)
              }
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Deal"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
