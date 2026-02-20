import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, MessageSquare, Type, MousePointer2, Info } from "lucide-react";
import { EmailCaptureSettingsAPI } from "@/api/integrations/supabase/emailCapture/emailCaptureSettings";
import { toast } from "sonner";
import { Flag, EmailCaptureSettings } from "@/types";

const emailCaptureAPI = EmailCaptureSettingsAPI as Required<typeof EmailCaptureSettingsAPI>;

interface EmailCaptureSettingsCardProps {
    hideCard?: boolean;
}
export function EmailCaptureSettingsCard({ hideCard = false }: EmailCaptureSettingsCardProps) {
    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [ctaText, setCtaText] = useState("");
    const [footerText, setFooterText] = useState("");
    const [settingsId, setSettingsId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { isLoading, data: settings } = useQuery<EmailCaptureSettings | null>({
        queryKey: ["email_capture_settings"],
        queryFn: async () => {
            const response = await emailCaptureAPI.get({
                maybeSingle: true,
            });
            if (response.flag !== Flag.Success) return null;
            return (response.data as EmailCaptureSettings | null) ?? null;
        },
    });

    useEffect(() => {
        if (settings) {
            setSettingsId(settings.id);
            setTitle(settings.title ?? "");
            setSubtitle(settings.subtitle ?? "");
            setCtaText(settings.cta_text ?? "");
            setFooterText(settings.footer_text ?? "");
        }
    }, [settings]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!settingsId) throw new Error("No settings record found");
            const response = await emailCaptureAPI.updateOneByID(settingsId, {
                title,
                subtitle,
                cta_text: ctaText,
                footer_text: footerText,
            });
            if (response.flag !== Flag.Success) {
                const supabaseError = response.error?.output as { message?: string } | undefined;
                throw new Error(supabaseError?.message || response.error?.message || "Failed to update");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["email_capture_settings"] });
            toast.success("Email capture settings saved!");
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
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 group">
                            <Label htmlFor="capture_title" className="flex items-center gap-2 font-semibold text-slate-700">
                                <Type className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    Section Title
                                </Label>
                                <Input
                                    id="capture_title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Enter the World of RouxMagic"
                                    className="h-10 border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-md"
                                />
                            </div>
                            <div className="space-y-2 group">
                                <Label htmlFor="capture_cta" className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                                    <MousePointer2 className="h-3.5 w-3.5 text-slate-400" />
                                    CTA Button Text
                                </Label>
                                <Input
                                    id="capture_cta"
                                    value={ctaText}
                                    onChange={(e) => setCtaText(e.target.value)}
                                    placeholder="e.g. Get Started"
                                    className="h-10 border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-md"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <Label htmlFor="capture_subtitle" className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                                <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                                Subtitle / Description
                            </Label>
                            <Textarea
                                id="capture_subtitle"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="Be the first to experience..."
                                className="border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-md min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="space-y-2 group">
                            <Label htmlFor="capture_footer" className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                                <Info className="h-3.5 w-3.5 text-slate-400" />
                                Footer Text
                            </Label>
                            <Input
                                id="capture_footer"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="No spam, just premium content updates..."
                                className="h-10 border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-md"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <Button
                        onClick={() => updateMutation.mutate()}
                        disabled={updateMutation.isPending || isLoading || !settingsId}
                        className="rounded-md bg-indigo-600 hover:bg-indigo-700 h-10 px-6 shadow-sm"
                    >
                        {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                             <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
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
