import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Edit, Loader2 } from "lucide-react";
import { ShopRow, ShopTag, Flag } from "@/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShopAPI } from "@/api/integrations/supabase/shop/shop";

const shopAPI = ShopAPI as Required<typeof ShopAPI>;

const Shop = () => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const {
        data: shop,
        isLoading,
        error,
    } = useQuery<ShopRow | null>({
        queryKey: ["shop"],
        queryFn: async () => {
            const response = await shopAPI.get({
                limit: 1,
                maybeSingle: true,
            });

            if (response.flag !== Flag.Success) {
                throw new Error(response.error?.message || "Failed to load shop");
            }

            return response.data as ShopRow | null;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string | number; data: Partial<ShopRow> }) => {
            const response = await shopAPI.updateOneByID(String(id), data);
            if (response.flag !== Flag.Success) {
                throw new Error(response.error?.message || "Failed to update shop");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["shop"] });
            setIsDialogOpen(false);
            toast.success("Shop details updated successfully");
        },
        onError: (err: Error) => {
            console.error("Error updating shop:", err);
            toast.error(`Failed to update: ${err.message}`);
        },
    });

    const tags =
        shop?.shopTags && Array.isArray(shop.shopTags) && shop.shopTags.length > 0
            ? [...shop.shopTags].sort((a, b) => a.order - b.order)
            : [];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-destructive font-ui">
                    Could not load shop: {(error as Error).message}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section matching StatsRow design */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Shop Configuration
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage shop page content, subtitles, and coming soon details.
                    </p>
                </div>
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
                >
                    <Edit className="mr-2 h-5 w-5" />
                    Edit Details
                </Button>
            </div>

            {/* Table Section */}
            <div className="rounded-xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-1/4 text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-6" sticky="left">
                                Field Key
                            </TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 px-6">
                                Content
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="p-6 font-medium text-slate-600 border-r border-slate-50" sticky="left">
                                Page Title
                            </TableCell>
                            <TableCell className="p-6 text-slate-900 font-medium">
                                {shop?.pageTitle}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="p-6 font-medium text-slate-600 border-r border-slate-50" sticky="left">
                                Page Subtitle
                            </TableCell>
                            <TableCell className="p-6 text-slate-600 line-clamp-2">
                                {shop?.pageSubtitle}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="p-6 font-medium text-slate-600 border-r border-slate-50" sticky="left">
                                Coming Soon Title
                            </TableCell>
                            <TableCell className="p-6 text-slate-900 font-medium">
                                {shop?.comingSoonTitle}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="p-6 font-medium text-slate-600 border-r border-slate-50" sticky="left">
                                Coming Soon Description
                            </TableCell>
                            <TableCell className="p-6 text-slate-600 line-clamp-2">
                                {shop?.comingSoonDescription}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="p-6 font-medium text-slate-600 border-r border-slate-50" sticky="left">
                                CTA Text
                            </TableCell>
                            <TableCell className="p-6 text-slate-900 font-medium">
                                {shop?.ctaText}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="p-6 font-medium text-slate-600 border-r border-slate-50 align-top" sticky="left">
                                Shop Tags
                            </TableCell>
                            <TableCell className="p-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    {tags.map((tag) => (
                                        <div
                                            key={tag.id}
                                            className="flex flex-col p-4 rounded-xl bg-slate-50 border border-slate-100"
                                        >
                                            <span className="font-semibold text-slate-900">
                                                {tag.title}
                                            </span>
                                            <span className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                {tag.description}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {shop && (
                <ShopEditDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    shop={shop}
                    onSave={(updatedData) =>
                        updateMutation.mutate({ id: shop.id, data: updatedData })
                    }
                    isSaving={updateMutation.isPending}
                />
            )}
        </div>
    );
};

// Edit Dialog Component
interface ShopEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shop: ShopRow;
    onSave: (data: Partial<ShopRow>) => void;
    isSaving: boolean;
}

const ShopEditDialog = ({ open, onOpenChange, shop, onSave, isSaving }: ShopEditDialogProps) => {
    const [formData, setFormData] = useState<Partial<ShopRow>>({});
    const [tags, setTags] = useState<ShopTag[]>([]);

    useEffect(() => {
        if (shop && open) {
            setFormData({
                pageTitle: shop.pageTitle,
                pageSubtitle: shop.pageSubtitle,
                comingSoonTitle: shop.comingSoonTitle,
                comingSoonDescription: shop.comingSoonDescription,
                ctaText: shop.ctaText,
            });
            setTags(shop.shopTags ? JSON.parse(JSON.stringify(shop.shopTags)) : []);
        }
    }, [shop, open]);

    const handleChange = (field: keyof ShopRow, value: string) => {
        setFormData((prev: Partial<ShopRow>) => ({ ...prev, [field]: value }));
    };

    const handleTagChange = (index: number, field: keyof ShopTag, value: string) => {
        const newTags = [...tags];
        newTags[index] = { ...newTags[index], [field]: value };
        setTags(newTags);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            shopTags: tags,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Shop Details</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid gap-4">
                        <h3 className="text-lg font-semibold">Page Header</h3>
                        <div className="grid gap-2">
                            <Label htmlFor="pageTitle">Page Title</Label>
                            <Input
                                id="pageTitle"
                                value={formData.pageTitle || ""}
                                onChange={(e) => handleChange("pageTitle", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="pageSubtitle">Page Subtitle</Label>
                            <Textarea
                                id="pageSubtitle"
                                value={formData.pageSubtitle || ""}
                                onChange={(e) => handleChange("pageSubtitle", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <h3 className="text-lg font-semibold">Coming Soon Section</h3>
                        <div className="grid gap-2">
                            <Label htmlFor="comingSoonTitle">Title</Label>
                            <Input
                                id="comingSoonTitle"
                                value={formData.comingSoonTitle || ""}
                                onChange={(e) => handleChange("comingSoonTitle", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="comingSoonDescription">Description</Label>
                            <Textarea
                                id="comingSoonDescription"
                                value={formData.comingSoonDescription || ""}
                                onChange={(e) => handleChange("comingSoonDescription", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="ctaText">Button Text</Label>
                            <Input
                                id="ctaText"
                                value={formData.ctaText || ""}
                                onChange={(e) => handleChange("ctaText", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <h3 className="text-lg font-semibold">Shop Tags</h3>
                        {tags.map((tag, index) => (
                            <div key={tag.id} className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                                <div className="col-span-2 font-medium capitalize text-sm text-muted-foreground">
                                    {tag.id.replace("_", " ")}
                                </div>
                                <div className="grid gap-2">
                                    <Label>Title</Label>
                                    <Input
                                        value={tag.title || ""}
                                        onChange={(e) => handleTagChange(index, "title", e.target.value)}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Description</Label>
                                    <Input
                                        value={tag.description || ""}
                                        onChange={(e) => handleTagChange(index, "description", e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default Shop;
