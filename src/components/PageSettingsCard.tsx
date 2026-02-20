import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Type, MessageSquare } from "lucide-react";
import { PageSettingsAPI } from "@/api/integrations/supabase/pageSettings";
import { toast } from "sonner";
import { Flag, PageSettings } from "@/types";

interface PageSettingsCardProps {
    pageName: string;
    hideCard?: boolean;
}

const pageSettingsAPI = PageSettingsAPI as Required<typeof PageSettingsAPI>;

export function PageSettingsCard({ pageName, hideCard = false }: PageSettingsCardProps) {
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { isLoading, data: settings } = useQuery<PageSettings | null>({
        queryKey: ["page_settings", pageName],
        queryFn: async () => {
            const response = await pageSettingsAPI.get({
                eq: [{ key: "page_name", value: pageName }],
            });
            if (response.flag !== Flag.Success) return null;
            if (Array.isArray(response.data) && response.data.length > 0) {
                return response.data[0] as PageSettings;
            }
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
            if (settingsId) {
            const response = await pageSettingsAPI.updateOneByID(settingsId, {
                title,
                subtitle,
            });
            if (response.flag !== Flag.Success) {
                const supabaseError = response.error?.output as { message?: string } | undefined;
                throw new Error(supabaseError?.message || response.error?.message || "Failed to update");
            }
            return response.data;
            } else {
                const response = await pageSettingsAPI.createOne({
                    page_name: pageName,
                    title,
                    subtitle,
                });
                if (response.flag !== Flag.Success) {
                    const supabaseError = response.error?.output as { message?: string } | undefined;
                    throw new Error(supabaseError?.message || response.error?.message || "Failed to create");
                }
                return response.data;
            }

        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["page_settings", pageName] });
            toast.success(`${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page settings saved!`);
        },
        onError: (err: Error) => {
            toast.error(`Failed to save: ${err.message}`);
        },
    });

    const content = (
            <div className="p-6 space-y-6">


                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium animate-pulse">Retrieving settings...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 group">
                            <Label htmlFor="page_title" className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                                <Type className="h-3.5 w-3.5 text-slate-400" />
                                Page Title
                            </Label>
                            <Input
                                id="page_title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={`e.g. ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`}
                                className="h-10 border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-md"
                            />
                        </div>
                        <div className="space-y-2 group">
                            <Label htmlFor="page_subtitle" className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                                Page Subtitle
                            </Label>
                            <Input
                                id="page_subtitle"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="e.g. Explore digital narratives..."
                                className="h-10 border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-md"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending || isLoading}
                        className="rounded-md bg-indigo-600 hover:bg-indigo-700 h-10 px-6 shadow-sm"
                    >
                        {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        Update Header
                    </Button>
                </div>
            </div>
    );

    if (hideCard) return content;

    return (
        <Card className="border-none shadow-sm bg-white mb-8">
            {content}
        </Card>
    );
}
