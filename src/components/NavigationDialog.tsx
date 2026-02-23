import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NavigationItem, NavigationItemFormData } from "@/types";

interface NavigationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: NavigationItemFormData) => void;
    initialData?: NavigationItem | null;
    mode: "add" | "edit";
}

export default function NavigationDialog({
    open,
    onOpenChange,
    onSubmit,
    initialData,
    mode,
}: NavigationDialogProps) {
    const [formData, setFormData] = useState<NavigationItemFormData>({
        label: "",
        href: "",
        order_index: 0,
        is_active: true,
    });

    useEffect(() => {
        if (initialData && mode === "edit") {
            setFormData({
                label: initialData.label,
                href: initialData.href,
                order_index: initialData.order_index,
                is_active: initialData.is_active,
            });
        } else {
            setFormData({
                label: "",
                href: "",
                order_index: 0,
                is_active: true,
            });
        }
    }, [initialData, mode, open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === "add" ? "Add Navigation Item" : "Edit Navigation Item"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="label">Label</Label>
                        <Input
                            id="label"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            placeholder="Home, Shop, etc."
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="href">Link (HREF)</Label>
                        <Input
                            id="href"
                            value={formData.href}
                            onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                            placeholder="/home, https://..."
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="order_index">Order Index</Label>
                        <Input
                            id="order_index"
                            type="number"
                            value={formData.order_index}
                            onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="is_active">Active</Label>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{mode === "add" ? "Create" : "Save Changes"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
