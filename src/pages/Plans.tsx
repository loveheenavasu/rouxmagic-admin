import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Power, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Plans } from "@/api/integrations/supabase/plans/plans";
import { Flag, Plan, PageName } from "@/types";
import { StatsRow } from "@/components/StatsRow";
import PlanDialog from "@/components/PlanDialog";
import { PageSettingsCard } from "@/components/PageSettingsCard";

const plansAPI = Plans as Required<typeof Plans>;

export default function PlansPage() {
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const queryClient = useQueryClient();

  // Fetch plans
  const {
    data: plansList = [],
    isLoading,
    error,
  } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const response = await plansAPI.get({
        eq: [],
        sort: "amount",
        sortBy: "asc",
      });

      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        const supabaseError = response.error?.output as any;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to fetch plans";
        throw new Error(errorMessage);
      }

      const data = Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as Plan[]);

      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await plansAPI.createOne(data);
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        throw new Error(response.error?.message || "Failed to create plan");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setIsPlanDialogOpen(false);
      toast.success("Plan created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create plan: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await plansAPI.updateOneByID(id, data);
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        throw new Error(response.error?.message || "Failed to update plan");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setIsPlanDialogOpen(false);
      setSelectedPlan(null);
      toast.success("Plan updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });

  // Toggle Active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const response = await plansAPI.updateOneByID(id, { is_active });
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        throw new Error(
          response.error?.message || "Failed to update plan status",
        );
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success(
        variables.is_active
          ? "Plan activated successfully!"
          : "Plan deactivated successfully!",
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to update plan status: ${error.message}`);
    },
  });

  const handleAddNew = () => {
    setSelectedPlan(null);
    setIsPlanDialogOpen(true);
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsPlanDialogOpen(true);
  };

  const handleToggleActive = async (plan: Plan) => {
    await toggleActiveMutation.mutateAsync({
      id: plan.id!,
      is_active: !plan.is_active,
    });
  };

  const handleSubmit = async (data: any) => {
    if (selectedPlan) {
      await updateMutation.mutateAsync({ id: selectedPlan.id!, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const activePlansCount = plansList.filter((p) => p.is_active).length;

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">
            Error Loading Plans
          </h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsRow
        items={[
          { label: "Total Plans", value: plansList?.length },
          { label: "Active Plans", value: activePlansCount },
        ]}
        title="Subscription Plans"
        description="Manage the pricing plans synced with Stripe."
        handleNew={handleAddNew}
      />

      <PageSettingsCard pageName={PageName.PricingMain} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] font-bold text-muted-foreground">
                Actions
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Price ID
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Interval
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Badge
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Features
              </TableHead>
              <TableHead className="font-bold text-muted-foreground">
                Active
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !!plansList?.length ? (
              plansList.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(plan)}
                        disabled={toggleActiveMutation.isPending}
                        title={plan.is_active ? "Deactivate" : "Activate"}
                      >
                        <Power
                          className={`h-4 w-4 ${plan.is_active ? "text-destructive" : "text-green-600"}`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {plan.stripe_price_id}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: plan.currency || "usd",
                    }).format((plan.amount || 0) / 100)}
                  </TableCell>
                  <TableCell className="capitalize">{plan.interval}</TableCell>
                  <TableCell>
                    {plan.badge ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {plan.badge}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic text-sm">
                        -
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div
                      className="max-w-[200px] truncate text-sm text-slate-600"
                      title={plan.description}
                    >
                      {plan.description || (
                        <span className="text-muted-foreground italic">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className="max-w-[150px] truncate text-sm text-slate-600"
                      title={plan.features?.join(", ")}
                    >
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.join(", ")
                      ) : (
                        <span className="text-muted-foreground italic">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.is_active ? (
                      <div className="flex items-center text-green-600 border border-green-200 bg-green-50 px-2 py-1 rounded-full w-fit max-w-full text-xs font-semibold gap-1">
                        <Check className="h-3 w-3" />
                        <span className="hidden sm:inline">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-500 border border-slate-200 bg-slate-50 px-2 py-1 rounded-full w-fit max-w-full text-xs font-semibold gap-1">
                        <X className="h-3 w-3" />
                        <span className="hidden sm:inline">Inactive</span>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No plans found. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PlanDialog
        open={isPlanDialogOpen}
        onOpenChange={setIsPlanDialogOpen}
        plan={selectedPlan}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
