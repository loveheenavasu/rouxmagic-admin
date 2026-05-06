import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, MessageSquare, AlertCircle } from "lucide-react";
import { PageSettingsAPI } from "@/api/integrations/supabase/pageSettings";
import { toast } from "sonner";
import { Flag, PageSettings } from "@/types";

const pageSettingsAPI = PageSettingsAPI as Required<typeof PageSettingsAPI>;
const PAGE_NAME = "pricing_alert_message";

export function AlertMessageSettings() {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { isLoading, data: settings } = useQuery<PageSettings | null>({
    queryKey: ["page_settings", PAGE_NAME],
    queryFn: async () => {
      const response = await pageSettingsAPI.get({
        eq: [{ key: "page_name", value: PAGE_NAME }],
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
      setMessage(settings.subtitle ?? "");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // First check if row with page_name exists
      const checkResponse = await pageSettingsAPI.get({
        eq: [{ key: "page_name", value: PAGE_NAME }],
      });

      if (checkResponse.flag !== Flag.Success) {
        throw new Error("Failed to check for existing alert message");
      }

      const existingRecord = Array.isArray(checkResponse.data)
        ? checkResponse.data[0]
        : checkResponse.data;

      if (existingRecord && existingRecord.id) {
        // Update existing row
        const response = await pageSettingsAPI.updateOneByID(
          existingRecord.id,
          {
            title: "",
            subtitle: message,
            cta_text: "",
          }
        );
        if (response.flag !== Flag.Success) {
          const supabaseError = response.error?.output as
            | { message?: string }
            | undefined;
          throw new Error(
            supabaseError?.message ||
              response.error?.message ||
              "Failed to update",
          );
        }
        return response.data;
      } else {
        // Insert new row
        const response = await pageSettingsAPI.createOne({
          page_name: PAGE_NAME,
          title: "",
          subtitle: message,
          cta_text: "",
        });
        if (response.flag !== Flag.Success) {
          const supabaseError = response.error?.output as
            | { message?: string }
            | undefined;
          throw new Error(
            supabaseError?.message ||
              response.error?.message ||
              "Failed to create",
          );
        }
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page_settings", PAGE_NAME] });
      toast.success("Alert message saved successfully!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const handleUpdate = () => {
    if (!message.trim()) {
      toast.error("Alert Message is required and cannot be empty.");
      return;
    }

    updateMutation.mutate();
  };

  return (
    <Card className="border-none shadow-sm bg-white mb-6">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="p-2 bg-amber-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Alert Message</h3>
            <p className="text-sm text-slate-500">
              Configure the alert message displayed on the pricing page
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium animate-pulse">
              Retrieving alert settings...
            </p>
          </div>
        ) : (
          <div className="space-y-2 group">
            <Label
              htmlFor="alert_message"
              className="flex items-center gap-2 font-semibold text-slate-700 text-sm"
            >
              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
              Alert Message *
            </Label>
            <Input
              id="alert_message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Get 50% off on all plans"
              className="h-10 border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-md"
            />
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button
            onClick={handleUpdate}
            disabled={updateMutation.isPending || isLoading}
            className="rounded-md bg-indigo-600 hover:bg-indigo-700 h-10 px-6 shadow-sm"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Alert Message
          </Button>
        </div>
      </div>
    </Card>
  );
}
