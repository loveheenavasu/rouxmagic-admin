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
import { Loader2 } from "lucide-react";

interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    itemName?: string;
    isDeleting?: boolean;
}

export default function DeleteConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    title = "Delete Content?",
    description,
    itemName,
    isDeleting = false,
}: DeleteConfirmationDialogProps) {
    const defaultDescription = itemName
        ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
        : "Are you sure you want to delete this item? This action cannot be undone.";

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500">
                        {description || defaultDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
