import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, X, Search } from "lucide-react";
import { Plan, PlanFormData } from "@/types";

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
  onSubmit: (data: PlanFormData) => Promise<void>;
  isLoading?: boolean;
}

const emptyForm: PlanFormData = {
  name: "",
  stripe_price_id: "",
  stripe_product_id: "",
  amount: 0,
  currency: "usd",
  interval: "month",
  is_active: true,
  features: [],
  featuresString: "",
  description: "",
  badge: "",
  default_cta_text: "Subscribe",
};

export default function PlanDialog({
  open,
  onOpenChange,
  plan,
  onSubmit,
  isLoading = false,
}: PlanDialogProps) {
  const [formData, setFormData] = useState<PlanFormData>(emptyForm);
  const [newFeature, setNewFeature] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dontLinkProduct, setDontLinkProduct] = useState(false);
  const [featureToRemove, setFeatureToRemove] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...(prev.features || []), newFeature.trim()],
    }));
    setNewFeature("");
  };

  const handleRemoveFeature = (index: number) => {
    setFeatureToRemove(index);
  };

  const confirmRemoveFeature = () => {
    if (featureToRemove === null) return;
    setFormData((prev) => ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== featureToRemove),
    }));
    setFeatureToRemove(null);
  };

  const handleDontLinkProductChange = (checked: boolean) => {
    setDontLinkProduct(checked);
    if (checked) {
      handleChange("stripe_product_id", "");
      handleChange("stripe_price_id", "");
    }
  };

  useEffect(() => {
    if (open) {
      if (plan) {
        setFormData({
          name: plan.name,
          stripe_price_id: plan.stripe_price_id,
          stripe_product_id: plan.stripe_product_id || "",
          amount: plan.amount,
          currency: plan.currency,
          interval: plan.interval,
          is_active: plan.is_active,
          features: plan.features,
          featuresString: plan.features?.join("\n") || "",
          description: plan.description || "",
          badge: plan.badge || "",
          default_cta_text: plan.default_cta_text || "Subscribe",
        });
        setDontLinkProduct(!plan.stripe_product_id && !plan.stripe_price_id);
      } else {
        setFormData(emptyForm);
        setDontLinkProduct(false);
      }
      setValidationError(null);
    }
  }, [open, plan]);

  const handleChange = (field: keyof PlanFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      return;
    }

    if (formData.amount < 0) {
      setValidationError("Amount cannot be less than zero.");
      return;
    }

    if (
      !dontLinkProduct &&
      formData.stripe_product_id?.trim() &&
      !formData.stripe_price_id?.trim()
    ) {
      setValidationError(
        "Stripe Price ID is required when Stripe Product ID is provided.",
      );
      return;
    }

    const submissionData = { ...formData };
    delete submissionData.featuresString;

    await onSubmit(submissionData);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{plan ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manage subscription plan details mapped to Stripe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="font-medium">
                Plan Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g. All Access Monthly"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="stripe_product_id" className="font-medium">
                Stripe Product ID
              </Label>
              <Input
                id="stripe_product_id"
                value={formData.stripe_product_id ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  handleChange("stripe_product_id", val);
                  if (!val.trim()) {
                    handleChange("stripe_price_id", "");
                  }
                }}
                placeholder="prod_..."
                className="mt-1.5"
                disabled={dontLinkProduct}
              />
            </div>

            <div>
              <Label htmlFor="stripe_price_id" className="font-medium">
                Stripe Price ID{" "}
                {!dontLinkProduct &&
                  !!formData.stripe_product_id?.trim() &&
                  "*"}
              </Label>
              <Input
                id="stripe_price_id"
                value={formData.stripe_price_id}
                onChange={(e) =>
                  handleChange("stripe_price_id", e.target.value)
                }
                placeholder="price_1..."
                className="mt-1.5"
                required={
                  !dontLinkProduct && !!formData.stripe_product_id?.trim()
                }
                disabled={
                  dontLinkProduct || !formData.stripe_product_id?.trim()
                }
              />
            </div>

            <div className="flex items-center gap-2 mt-1 mb-4">
              <Checkbox
                id="dontLinkProduct"
                checked={dontLinkProduct}
                onCheckedChange={handleDontLinkProductChange}
              />
              <Label
                htmlFor="dontLinkProduct"
                className="text-sm cursor-pointer text-muted-foreground font-medium"
              >
                Don't link any product with this plan
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount" className="font-medium">
                  Amount (Cents) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    handleChange("amount", parseInt(e.target.value) || 0)
                  }
                  placeholder="499"
                  className="mt-1.5"
                  required
                />
              </div>
              <div>
                <Label htmlFor="currency" className="font-medium">
                  Currency
                </Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  placeholder="usd"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="interval" className="font-medium">
                Interval
              </Label>
              <Input
                id="interval"
                value={formData.interval}
                onChange={(e) => handleChange("interval", e.target.value)}
                placeholder="month or year"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="badge" className="font-medium">
                  Badge Text
                </Label>
                <Input
                  id="badge"
                  value={formData.badge ?? ""}
                  onChange={(e) => handleChange("badge", e.target.value)}
                  placeholder="e.g. Most Popular"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="default_cta_text" className="font-medium">
                  Default CTA Text
                </Label>
                <Input
                  id="default_cta_text"
                  value={formData.default_cta_text || ""}
                  onChange={(e) =>
                    handleChange("default_cta_text", e.target.value)
                  }
                  placeholder="e.g. Subscribe"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description" className="font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Great for teams and businesses!"
                className="mt-1.5"
                rows={3}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label className="font-medium">Features</Label>
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="e.g. Ad-free playback"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddFeature}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.features && formData.features.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search features..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.features
                      .map((feature, index) => ({ feature, index }))
                      .filter(({ feature }) =>
                        feature
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                      )
                      .map(({ feature, index }) => (
                        <li
                          key={index}
                          className="flex items-center justify-between p-2 text-sm bg-slate-50 border rounded-md"
                        >
                          <span>{feature}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-500 hover:text-destructive"
                            onClick={() => handleRemoveFeature(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/30">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) =>
                  handleChange("is_active", checked)
                }
              />
              <Label
                htmlFor="is_active"
                className="font-bold cursor-pointer text-sm"
              >
                Is Active
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {plan ? "Save changes" : "Add Plan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={featureToRemove !== null}
        onOpenChange={(open) => !open && setFeatureToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Feature?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this feature from the plan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveFeature}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!validationError}
        onOpenChange={(open) => !open && setValidationError(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid Plan Data</AlertDialogTitle>
            <AlertDialogDescription>{validationError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setValidationError(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
