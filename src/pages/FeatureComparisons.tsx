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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Edit, Trash2, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { FeatureComparisonsAPI } from "@/api";
import { Plans } from "@/api/integrations/supabase/plans/plans";
import {
  FeatureComparison,
  Flag,
  Plan,
  PageName,
  PlanMeta,
  FeatureValue,
} from "@/types";
import { PageSettingsCard } from "@/components/PageSettingsCard";

export default function FeatureComparisons() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] =
    useState<FeatureComparison | null>(null);

  // Form State
  const [featureKey, setFeatureKey] = useState("");
  const [featureName, setFeatureName] = useState("");
  const [order, setOrder] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);

  // Plans Selection & Values Tracking
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [planValues, setPlanValues] = useState<Record<string, FeatureValue>>(
    {},
  );

  const queryClient = useQueryClient();

  // Fetch Feature Comparisons
  const {
    data: featuresList = [],
    isLoading: isLoadingFeatures,
    error: featureError,
  } = useQuery<FeatureComparison[]>({
    queryKey: ["feature_comparisons"],
    queryFn: async () => {
      const response = await FeatureComparisonsAPI.get({
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
          response.error?.message || "Failed to fetch feature comparisons",
        );
      }

      return Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as FeatureComparison[]);
    },
  });

  // Fetch Available Plans (for the dropdown/checkbox selection)
  const { data: activePlans = [], isLoading: isLoadingPlans } = useQuery<
    Plan[]
  >({
    queryKey: ["plans_active"],
    queryFn: async () => {
      const response = await Plans.get({
        eq: [],
      });
      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        throw new Error("Failed to fetch plans");
      }
      const data = Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as Plan[]);
      // We only care about active plans to populate the checklist
      // return data.filter((p: Plan) => p.is_active);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<FeatureComparison>) => {
      const response = await FeatureComparisonsAPI.createOne(
        data as FeatureComparison,
      );
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to create feature");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature_comparisons"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Feature created successfully!");
    },
    onError: (err: Error) => toast.error(`Create failed: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<FeatureComparison>;
    }) => {
      const response = await FeatureComparisonsAPI.updateOneByID(id, data);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to update feature");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature_comparisons"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Feature updated successfully!");
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await FeatureComparisonsAPI.deleteOneByIDPermanent(id);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to delete feature");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature_comparisons"] });
      setIsDeleteDialogOpen(false);
      setSelectedFeature(null);
      toast.success("Feature deleted successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setSelectedFeature(null);
    setFeatureKey("");
    setFeatureName("");
    setOrder(
      featuresList.length > 0
        ? Math.max(...featuresList.map((f) => f.order || 0)) + 1
        : 0,
    );
    setSelectedPlanIds([]);
    setPlanValues({});
  };

  const handleOpenDialog = (feature?: FeatureComparison) => {
    if (feature) {
      setSelectedFeature(feature);
      setFeatureKey(feature.feature_key || "");
      setFeatureName(feature.feature || "");
      setOrder(feature.order || 0);

      // Restore plans state
      if (feature.plans && feature.plans.plan_meta) {
        setSelectedPlanIds(feature.plans.plan_meta.map((p) => p.id));
        setPlanValues(feature.plans.values || {});
      } else {
        setSelectedPlanIds([]);
        setPlanValues({});
      }
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (feature: FeatureComparison) => {
    setSelectedFeature(feature);
    setIsDeleteDialogOpen(true);
  };

  const handlePlanSelectionToggle = (planId: string, isChecked: boolean) => {
    setSelectedPlanIds((prev) =>
      isChecked ? [...prev, planId] : prev.filter((id) => id !== planId),
    );
  };

  const handlePlanValueChange = (planId: string, value: string | boolean) => {
    setPlanValues((prev) => ({
      ...prev,
      [planId]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureKey || !featureName) {
      toast.error("Feature Key and Feature Name are required");
      return;
    }

    try {
      setIsSwapping(true);
      // Check for order collision
      const conflictFeature = featuresList.find(
        (f) => f.order === order && f.id !== selectedFeature?.id
      );

      if (conflictFeature && conflictFeature.id) {
        // We have a collision. We need to swap/shift it.
        let newOrderForConflict = 0;
        if (selectedFeature && selectedFeature.order !== undefined) {
          // Swap: conflicting item takes the old order of the item we are updating
          newOrderForConflict = selectedFeature.order;
        } else {
          // Shift to end: conflicting item is pushed to a new highest index
          newOrderForConflict =
            featuresList.length > 0
              ? Math.max(...featuresList.map((f) => f.order || 0)) + 1
              : 0;
        }

        const response = await FeatureComparisonsAPI.updateOneByID(conflictFeature.id, {
          order: newOrderForConflict,
        });

        if (response.flag !== Flag.Success) {
          toast.error("Failed to reorder the conflicting feature.");
          setIsSwapping(false);
          return;
        }
      }
    } catch (err: any) {
      toast.error("Failed to process order swap.");
      setIsSwapping(false);
      return;
    } finally {
      setIsSwapping(false);
    }

    // Build the JSON structure perfectly matching the schema requirement
    const plan_meta: PlanMeta[] = selectedPlanIds.map((id) => {
      const planItem = activePlans.find((ap) => ap.id === id);
      return {
        id,
        name: planItem?.name || "Unknown Plan",
      };
    });

    const values = Object.fromEntries(
      selectedPlanIds.map((id) => [id, planValues[id] ?? null]), // convert undefined to null to respect requirement
    );

    const formData: Partial<FeatureComparison> = {
      feature_key: featureKey,
      feature: featureName,
      order,
      plans: {
        plan_meta,
        values,
      },
    };

    if (selectedFeature) {
      updateMutation.mutate({ id: selectedFeature.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = isSwapping || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Feature Comparisons
          </h1>
          <p className="text-muted-foreground mt-1">
            Build the feature comparison matrix displayed on the pricing page.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Feature Row
        </Button>
      </div>

      <PageSettingsCard
        pageName={PageName.PricingFeatureComparison}
        shouldAcceptSubtitle={false}
      />

      <Card>
        <CardHeader>
          <CardTitle>Feature Rows</CardTitle>
          <CardDescription>
            Map features across different subscription plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {featureError && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">
              Error fetching features: {(featureError as Error).message}
            </div>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] font-bold text-muted-foreground">
                    Actions
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground w-[80px]">
                    Order
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Feature Key
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Feature Name
                  </TableHead>
                  <TableHead className="font-bold text-muted-foreground">
                    Linked Plans
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingFeatures ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !featuresList || featuresList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No feature rows found. Click 'Add New Feature Row' to
                      create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  featuresList.map((feature) => (
                    <TableRow key={feature.id}>
                      <TableCell className="align-top py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(feature)}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(feature)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4 text-center font-mono text-sm text-muted-foreground border-r bg-slate-50/30">
                        {feature.order}
                      </TableCell>
                      <TableCell className="font-mono text-sm align-top py-4">
                        {feature.feature_key}
                      </TableCell>
                      <TableCell className="font-medium align-top py-4">
                        {feature.feature}
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div className="flex flex-wrap gap-1">
                          {feature.plans?.plan_meta?.map((pm) => (
                            <span
                              key={pm.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                            >
                              {pm.name}
                            </span>
                          ))}
                        </div>
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
              {selectedFeature ? "Edit Feature Row" : "Add New Feature Row"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Meta Info Section */}
            <div className="bg-slate-50 p-4 rounded-lg border space-y-4">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-slate-400" />
                Row Metadata
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feature_key">
                    Feature Key (Unique programmatic name) *
                  </Label>
                  <Input
                    id="feature_key"
                    value={featureKey}
                    onChange={(e) => setFeatureKey(e.target.value)}
                    placeholder="e.g. max_resolution"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feature_name">
                    Feature Title (Display Name) *
                  </Label>
                  <Input
                    id="feature_name"
                    value={featureName}
                    onChange={(e) => setFeatureName(e.target.value)}
                    placeholder="e.g. Video Quality"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value, 10))}
                  />
                </div>
              </div>
            </div>

            {/* Plan Selection and Values Section */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-medium text-slate-900 border-b pb-2">
                  Plan Matrix Properties
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select the plans this feature applies to, then specify its
                  value for each plan.
                </p>
              </div>

              <div className="space-y-4">
                {isLoadingPlans ? (
                  <div className="flex h-20 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : activePlans.length === 0 ? (
                  <p className="text-sm text-red-500 italic">
                    No active pricing plans found. You must create plans first.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Selectable Plans */}
                    <div className="flex flex-wrap gap-4 bg-white border rounded-lg p-3 shadow-sm">
                      {activePlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`plan_select_${plan.id}`}
                            checked={selectedPlanIds.includes(plan.id!)}
                            onCheckedChange={(c) =>
                              handlePlanSelectionToggle(plan.id!, !!c)
                            }
                          />
                          <Label
                            htmlFor={`plan_select_${plan.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {plan.name}
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Matrix Inputs */}
                    {selectedPlanIds.length > 0 && (
                      <div className="bg-slate-50 border rounded-lg p-4 space-y-4 shadow-sm">
                        <Label className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                          Plan Values
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedPlanIds.map((planId) => {
                            const planMeta = activePlans.find(
                              (p) => p.id === planId,
                            );
                            const val = planValues[planId];
                            const isBoolean = typeof val === "boolean";

                            return (
                              <div
                                key={planId}
                                className="space-y-2 border rounded-md p-3 bg-white"
                              >
                                <Label className="text-indigo-700 font-semibold">
                                  {planMeta?.name || "Unknown Plan"}
                                </Label>
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded">
                                    <Switch
                                      id={`mode_${planId}`}
                                      checked={isBoolean}
                                      onCheckedChange={(c) => {
                                        // Reset value tightly based on type change
                                        handlePlanValueChange(
                                          planId,
                                          c ? false : "",
                                        );
                                      }}
                                    />
                                    <Label
                                      htmlFor={`mode_${planId}`}
                                      className="text-xs font-medium text-slate-500 cursor-pointer"
                                    >
                                      {isBoolean
                                        ? "Boolean Toggle"
                                        : "Text Input"}
                                    </Label>
                                  </div>

                                  {isBoolean ? (
                                    <div className="flex items-center space-x-2 h-10 px-3 bg-white border rounded-md">
                                      <Switch
                                        id={`val_${planId}`}
                                        checked={val as boolean}
                                        onCheckedChange={(c) =>
                                          handlePlanValueChange(planId, c)
                                        }
                                      />
                                      <Label
                                        htmlFor={`val_${planId}`}
                                        className={`text-sm ${val ? "text-green-600 font-bold" : "text-slate-400"}`}
                                      >
                                        {val
                                          ? "Included / Supported (✓)"
                                          : "Not Included / Unsupported (✗)"}
                                      </Label>
                                    </div>
                                  ) : (
                                    <Input
                                      value={(val as string) || ""}
                                      onChange={(e) =>
                                        handlePlanValueChange(
                                          planId,
                                          e.target.value,
                                        )
                                      }
                                      placeholder="e.g. 4K, Unlimited, etc."
                                      className="h-10"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                {selectedFeature ? "Save Changes" : "Create Row"}
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
            <AlertDialogTitle>Delete Feature Comparison?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this feature
              comparison row? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedFeature && deleteMutation.mutate(selectedFeature.id)
              }
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Feature"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
