import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { AboutPageAPI } from "@/api/integrations/supabase/about/aboutSettings";
import { toast } from "sonner";
import { Flag, AboutPage } from "@/types";

const aboutPageAPI = AboutPageAPI as Required<typeof AboutPageAPI>;

function useAboutForm() {
  const [form, setForm] = useState<Partial<AboutPage>>({});

  const { isLoading, data } = useQuery<AboutPage | null>({
    queryKey: ["about_page"],
    queryFn: async () => {
      const response = await aboutPageAPI.get({
        eq: [],
        limit: 1,
        sort: "created_at",
        sortBy: "asc",
      });
      if (response.flag !== Flag.Success || !response.data) return null;
      const list = Array.isArray(response.data) ? response.data : [response.data];
      return (list[0] as AboutPage) ?? null;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        hero_title: data.hero_title ?? "",
        hero_subtitle: data.hero_subtitle ?? "",
        mission_heading: data.mission_heading ?? "",
        mission_text: data.mission_text ?? "",
        card1_title: data.card1_title ?? "",
        card1_text: data.card1_text ?? "",
        card2_title: data.card2_title ?? "",
        card2_text: data.card2_text ?? "",
        card3_title: data.card3_title ?? "",
        card3_text: data.card3_text ?? "",
        philosophy_heading: data.philosophy_heading ?? "",
        philosophy1_title: data.philosophy1_title ?? "",
        philosophy1_text: data.philosophy1_text ?? "",
        philosophy2_title: data.philosophy2_title ?? "",
        philosophy2_text: data.philosophy2_text ?? "",
        philosophy3_title: data.philosophy3_title ?? "",
        philosophy3_text: data.philosophy3_text ?? "",
        contact_heading: data.contact_heading ?? "",
        contact_subtitle: data.contact_subtitle ?? "",
        contact_button_text: data.contact_button_text ?? "",
      });
    }
  }, [data]);

  return { form, setForm, settingsId: data?.id ?? null, isLoading };
}

export default function AboutPageAdmin() {
  const queryClient = useQueryClient();
  const { form, setForm, settingsId, isLoading } = useAboutForm();

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!settingsId) {
        const response = await aboutPageAPI.createOne(form as AboutPage);
        if (response.flag !== Flag.Success) {
          const err = response.error?.output as { message?: string } | undefined;
          throw new Error(err?.message || response.error?.message || "Failed to create");
        }
        return { created: response.data as AboutPage, isCreate: true as const };
      }
      const response = await aboutPageAPI.updateOneByID(settingsId, form);
      if (response.flag !== Flag.Success) {
        const err = response.error?.output as { message?: string } | undefined;
        throw new Error(err?.message || response.error?.message || "Failed to update");
      }
      return { created: response.data as AboutPage, isCreate: false as const };
    },
    onSuccess: (result) => {
      if (result.isCreate && result.created) {
        queryClient.setQueryData(["about_page"], result.created);
      } else {
        queryClient.invalidateQueries({ queryKey: ["about_page"] });
      }
      toast.success("About page saved!");
    },
    onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
  });

  const update = (key: keyof AboutPage, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">About Page</h1>
        <p className="text-muted-foreground mt-1">
          Edit hero, mission, philosophy and contact content for the public About page.
        </p>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <div className="p-6 space-y-10">
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800">Hero</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="hero_title">Title</Label>
                <Input
                  id="hero_title"
                  value={form.hero_title ?? ""}
                  onChange={(e) => update("hero_title", e.target.value)}
                  placeholder="Title"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="hero_subtitle">Subtitle</Label>
                <Textarea
                  id="hero_subtitle"
                  value={form.hero_subtitle ?? ""}
                  onChange={(e) => update("hero_subtitle", e.target.value)}
                  placeholder="Subtitle"
                  className="mt-1.5"
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800">Mission</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="mission_heading">Heading</Label>
                <Input
                  id="mission_heading"
                  value={form.mission_heading ?? ""}
                  onChange={(e) => update("mission_heading", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="mission_text">Paragraph</Label>
                <Textarea
                  id="mission_text"
                  value={form.mission_text ?? ""}
                  onChange={(e) => update("mission_text", e.target.value)}
                  className="mt-1.5"
                  rows={4}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4 pt-2">
              {([1, 2, 3] as const).map((n) => (
                <div key={n} className="space-y-2 p-4 rounded-lg bg-muted/30">
                  <Label>Card {n} title</Label>
                  <Input
                    value={form[`card${n}_title` as keyof AboutPage] ?? ""}
                    onChange={(e) => update(`card${n}_title` as keyof AboutPage, e.target.value)}
                    placeholder={`Card ${n} title`}
                  />
                  <Label>Card {n} text</Label>
                  <Textarea
                    value={form[`card${n}_text` as keyof AboutPage] ?? ""}
                    onChange={(e) => update(`card${n}_text` as keyof AboutPage, e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800">Philosophy</h3>
            <div>
              <Label htmlFor="philosophy_heading">Section heading</Label>
              <Input
                id="philosophy_heading"
                value={form.philosophy_heading ?? ""}
                onChange={(e) => update("philosophy_heading", e.target.value)}
                className="mt-1.5"
              />
            </div>
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="grid gap-2 p-4 rounded-lg bg-muted/30">
                <Label>Philosophy {n} title</Label>
                <Input
                  value={form[`philosophy${n}_title` as keyof AboutPage] ?? ""}
                  onChange={(e) => update(`philosophy${n}_title` as keyof AboutPage, e.target.value)}
                />
                <Label>Philosophy {n} text</Label>
                <Textarea
                  value={form[`philosophy${n}_text` as keyof AboutPage] ?? ""}
                  onChange={(e) => update(`philosophy${n}_text` as keyof AboutPage, e.target.value)}
                  rows={2}
                />
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <h3 className="text-base font-semibold text-slate-800">Contact CTA</h3>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="contact_heading">Heading</Label>
                <Input
                  id="contact_heading"
                  value={form.contact_heading ?? ""}
                  onChange={(e) => update("contact_heading", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="contact_subtitle">Subtitle</Label>
                <Textarea
                  id="contact_subtitle"
                  value={form.contact_subtitle ?? ""}
                  onChange={(e) => update("contact_subtitle", e.target.value)}
                  className="mt-1.5"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="contact_button_text">Button text</Label>
                <Input
                  id="contact_button_text"
                  value={form.contact_button_text ?? ""}
                  onChange={(e) => update("contact_button_text", e.target.value)}
                  placeholder="Button text"
                  className="mt-1.5"
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
