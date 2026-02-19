import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { EmailCaptureSettingsAPI } from "@/api/integrations/supabase/emailCapture/emailCaptureSettings";
import { toast } from "sonner";
import { Flag, EmailCaptureSettings } from "@/types";

const emailCaptureAPI = EmailCaptureSettingsAPI as Required<typeof EmailCaptureSettingsAPI>;

export function EmailCaptureSettingsCard() {
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

    return (
        <Card className="border-none shadow-sm bg-white mb-8">
            <div className="p-6 space-y-4">
                <div>
                    <h3 className="text-base font-semibold text-slate-800">
                        Email Capture Settings (Home Page)
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage the title, subtitle, and CTA text for the email signup section.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings...
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="capture_title" className="font-medium text-sm">
                                    Section Title
                                </Label>
                                <Input
                                    id="capture_title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Enter the World of RouxMagic"
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="capture_cta" className="font-medium text-sm">
                                    CTA Button Text
                                </Label>
                                <Input
                                    id="capture_cta"
                                    value={ctaText}
                                    onChange={(e) => setCtaText(e.target.value)}
                                    placeholder="e.g. Get Started"
                                    className="mt-1.5"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="capture_subtitle" className="font-medium text-sm">
                                Subtitle / Description
                            </Label>
                            <Textarea
                                id="capture_subtitle"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                placeholder="Be the first to experience..."
                                className="mt-1.5"
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="capture_footer" className="font-medium text-sm">
                                Footer Text (Small Print)
                            </Label>
                            <Input
                                id="capture_footer"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="No spam, just premium content updates..."
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
                        Save Email Capture Settings
                    </Button>
                </div>
            </div>
        </Card>
    );
}
