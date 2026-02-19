import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { PageSettingsAPI } from "@/api/integrations/supabase/pageSettings";
import { toast } from "sonner";
import { Flag, PageSettings } from "@/types";

interface PageSettingsCardProps {
    pageName: string;
}

const pageSettingsAPI = PageSettingsAPI as Required<typeof PageSettingsAPI>;

export function PageSettingsCard({ pageName }: PageSettingsCardProps) {
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { isLoading, data: settings } = useQuery<PageSettings | null>({
        queryKey: ["page_settings", pageName],
        queryFn: async () => {
            const response = await pageSettingsAPI.get({
                eq: [{ key: "page_name", value: pageName }],
                maybeSingle: true,
            });
            if (response.flag !== Flag.Success) return null;
            return (response.data as PageSettings | null) ?? null;
        },
    });

    useEffect(() => {
        if (settings) {
            setSettingsId(settings.id);
            setTitle(settings.title ?? "");
            setSubtitle(settings.subtitle ?? "");
        }
    }, [settings]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!settingsId) throw new Error("No settings record found");
            const response = await pageSettingsAPI.updateOneByID(settingsId, {
                title,
                subtitle,
            });
            if (response.flag !== Flag.Success) {
                const supabaseError = response.error?.output as { message?: string } | undefined;
                throw new Error(supabaseError?.message || response.error?.message || "Failed to update");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["page_settings", pageName] });
            toast.success(`${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page settings saved!`);
        },
        onError: (err: Error) => {
            toast.error(`Failed to save: ${err.message}`);
        },
    });

    return (
        <Card className="border-none shadow-sm bg-white mb-8">
            <div className="p-6 space-y-4">

                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="page_title" className="font-medium text-sm">
                                Page Title
                            </Label>
                            <Input
                                id="page_title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Read"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="page_subtitle" className="font-medium text-sm">
                                Page Subtitle
                            </Label>
                            <Input
                                id="page_subtitle"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="e.g. Explore digital narratives..."
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending || isLoading || !settingsId}
                        className="gap-2"
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Save Page Header
                    </Button>
                </div>
            </div>
        </Card>
    );
}
