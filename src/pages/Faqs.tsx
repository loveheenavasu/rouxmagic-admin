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
import { CommonFaqsAPI } from "@/api";
import { CommonFaq, Flag, PageName } from "@/types";
import { PageSettingsCard } from "@/components/PageSettingsCard";

export default function Faqs() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFaq, setSelectedFaq] = useState<CommonFaq | null>(null);
  const [formData, setFormData] = useState<Partial<CommonFaq>>({
    question: "",
    answer: "",
  });

  const queryClient = useQueryClient();

  const {
    data: faqs,
    isLoading,
    error,
  } = useQuery<CommonFaq[]>({
    queryKey: ["common_faqs"],
    queryFn: async () => {
      const response = await CommonFaqsAPI.get({
        eq: [],
        sort: "created_at",
        sortBy: "desc",
      });

      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        throw new Error(response.error?.message || "Failed to fetch FAQs");
      }

      return Array.isArray(response.data)
        ? response.data
        : response.data
          ? [response.data]
          : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CommonFaq>) => {
      const response = await CommonFaqsAPI.createOne(data as CommonFaq);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to create FAQ");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common_faqs"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("FAQ created successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CommonFaq>;
    }) => {
      const response = await CommonFaqsAPI.updateOneByID(id, data);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to update FAQ");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common_faqs"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("FAQ updated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await CommonFaqsAPI.deleteOneByIDPermanent(id);
      if (response.flag !== Flag.Success) {
        throw new Error(response.error?.message || "Failed to delete FAQ");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common_faqs"] });
      setIsDeleteDialogOpen(false);
      setSelectedFaq(null);
      toast.success("FAQ deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenDialog = (faq?: CommonFaq) => {
    if (faq) {
      setSelectedFaq(faq);
      setFormData({ question: faq.question, answer: faq.answer });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (faq: CommonFaq) => {
    setSelectedFaq(faq);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedFaq(null);
    setFormData({ question: "", answer: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question || !formData.answer) {
      toast.error("Both question and answer are required");
      return;
    }

    if (selectedFaq) {
      updateMutation.mutate({ id: selectedFaq.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Common FAQs</h1>
          <p className="text-muted-foreground mt-1">
            Manage frequently asked questions displayed on the pricing page.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New FAQ
        </Button>
      </div>

      <PageSettingsCard
        pageName={PageName.PricingFAQs}
        shouldAcceptSubtitle={false}
      />

      <Card>
        <CardHeader>
          <CardTitle>FAQ List</CardTitle>
          <CardDescription>
            All your common FAQs. They are generally displayed in order of
            creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
              Error fetching FAQs: {(error as Error).message}
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Actions</TableHead>
                  <TableHead className="w-[30%]">Question</TableHead>
                  <TableHead className="w-[45%]">Answer</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !faqs || faqs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No FAQs found. Click 'Add New FAQ' to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="align-top py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(faq)}
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDelete(faq)}
                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium align-top py-4">
                        {faq.question}
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div
                          className="line-clamp-3 text-muted-foreground"
                          title={faq.answer}
                        >
                          {faq.answer}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4 text-sm text-muted-foreground">
                        {format(new Date(faq.created_at), "MMM d, yyyy")}
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
              {selectedFaq ? "Edit FAQ" : "Add New FAQ"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="e.g. Can I cancel my subscription at any time?"
                value={formData.question}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, question: e.target.value }))
                }
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">Answer</Label>
              <Textarea
                id="answer"
                placeholder="e.g. Yes, you can cancel your subscription anytime from your account settings..."
                value={formData.answer}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, answer: e.target.value }))
                }
                rows={5}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedFaq ? "Save Changes" : "Create FAQ"}
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
              This will permanently delete the FAQ. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedFaq && deleteMutation.mutate(selectedFaq.id)
              }
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete FAQ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
