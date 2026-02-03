import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Loader2, Utensils, Film, Music, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pairings } from "@/api/integrations/supabase/pairings/pairings";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { Recipes } from "@/api/integrations/supabase/recipes/recipes";
import { Flag, Pairing, PairingSourceEnum, Project } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const pairingsAPI = Pairings as Required<typeof Pairings>;
const projectsAPI = Projects as Required<typeof Projects>;
const recipesAPI = Recipes as Required<typeof Recipes>;

interface PairingsSectionProps {
    sourceId: string;
    sourceRef: PairingSourceEnum;
}

export default function PairingsSection({ sourceId, sourceRef }: PairingsSectionProps) {
    const queryClient = useQueryClient();
    const [targetRef, setTargetRef] = useState<PairingSourceEnum>(PairingSourceEnum.Recipe);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // 1. Fetch existing pairings
    const { data: existingPairings = [], isLoading: pairingsLoading } = useQuery<Pairing[]>({
        queryKey: ["pairings", sourceId, sourceRef],
        queryFn: async () => {
            const response = await pairingsAPI.get({
                eq: [
                    { key: "source_id" as any, value: sourceId },
                    { key: "source_ref" as any, value: sourceRef },
                    { key: "is_deleted" as any, value: false },
                ],
            });
            if (response.flag !== Flag.Success || !response.data) return [] as Pairing[];
            const data = Array.isArray(response.data) ? response.data : [response.data];
            return data.filter(Boolean) as Pairing[];
        },
        enabled: !!sourceId,
    });

    // 2. Fetch details for paired items
    const { data: pairedItems = [], isLoading: itemsLoading } = useQuery<any[]>({
        queryKey: ["paired-items-details", existingPairings],
        queryFn: async () => {
            if (!existingPairings || existingPairings.length === 0) return [];

            const results: any[] = [];

            // Group by target type to minimize API calls
            const projectIds = existingPairings
                .filter((p: Pairing) => p.target_ref !== PairingSourceEnum.Recipe)
                .map((p: Pairing) => p.target_id);

            const recipeIds = existingPairings
                .filter((p: Pairing) => p.target_ref === PairingSourceEnum.Recipe)
                .map((p: Pairing) => p.target_id);

            if (projectIds.length > 0) {
                const res = await projectsAPI.get({
                    inValue: { key: "id" as any, value: projectIds }
                } as any);
                if (res.flag === Flag.Success && res.data) {
                    const projects = Array.isArray(res.data) ? res.data : [res.data];
                    results.push(...projects.map((p: any) => ({ ...p, type: p.content_type })));
                }
            }

            if (recipeIds.length > 0) {
                const res = await recipesAPI.get({
                    inValue: { key: "id" as any, value: recipeIds }
                } as any);
                if (res.flag === Flag.Success && res.data) {
                    const recipes = Array.isArray(res.data) ? res.data : [res.data];
                    results.push(...recipes.map((r: any) => ({ ...r, type: PairingSourceEnum.Recipe })));
                }
            }

            return results;
        },
        enabled: !!existingPairings && existingPairings.length > 0,
    });

    // 3. Search for new items to pair
    const { data: searchResults = [] } = useQuery({
        queryKey: ["pairing-search", targetRef, searchQuery],
        queryFn: async () => {
            if (!searchQuery || searchQuery.length < 2) return [];

            setIsSearching(true);
            try {
                if (targetRef === PairingSourceEnum.Recipe) {
                    const res = await recipesAPI.get({
                        search: searchQuery,
                        searchFields: ["title"],
                        eq: [{ key: "is_deleted" as any, value: false }]
                    });
                    if (res.flag === Flag.Success && res.data) {
                        const data = Array.isArray(res.data) ? res.data : [res.data];
                        return data.map((r: any) => ({ id: r.id, title: r.title, type: PairingSourceEnum.Recipe }));
                    }
                } else {
                    const res = await projectsAPI.get({
                        search: searchQuery,
                        searchFields: ["title"],
                        eq: [
                            { key: "content_type" as any, value: targetRef as any },
                            { key: "is_deleted" as any, value: false }
                        ]
                    } as any);
                    if (res.flag === Flag.Success && res.data) {
                        const data = Array.isArray(res.data) ? res.data : [res.data];
                        return data.map((p: any) => ({ id: p.id, title: (p as Project).title, type: targetRef }));
                    }
                }
                return [];
            } finally {
                setIsSearching(false);
            }
        },
        enabled: searchQuery.length >= 2,
    });

    const createPairingMutation = useMutation({
        mutationFn: async (targetId: string) => {
            // Prevent duplicate pairings
            if (existingPairings && existingPairings.some((p: Pairing) => p.target_id === targetId)) {
                throw new Error("Already paired");
            }

            const res = await pairingsAPI.createOne({
                source_id: sourceId,
                source_ref: sourceRef,
                target_id: targetId,
                target_ref: targetRef,
            });
            if (res.flag !== Flag.Success) throw new Error("Failed to create pairing");
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pairings", sourceId, sourceRef] });
            setSearchQuery("");
            toast.success("Pairing added");
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deletePairingMutation = useMutation({
        mutationFn: async (pairingId: string) => {
            const res = await pairingsAPI.toogleSoftDeleteOneByID(pairingId, true);
            if (res.flag !== Flag.Success) throw new Error("Failed to remove pairing");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pairings", sourceId, sourceRef] });
            toast.success("Pairing removed");
        },
        onError: (err: any) => toast.error(err.message),
    });

    const getSourceIcon = (type: string) => {
        switch (type) {
            case PairingSourceEnum.Recipe: return <Utensils className="h-4 w-4" />;
            case PairingSourceEnum.Film:
            case PairingSourceEnum.TvShow: return <Film className="h-4 w-4" />;
            case PairingSourceEnum.Song: return <Music className="h-4 w-4" />;
            case PairingSourceEnum.Audiobook:
            case PairingSourceEnum.Book:
            case PairingSourceEnum.Comic: return <BookOpen className="h-4 w-4" />;
            default: return <Film className="h-4 w-4" />;
        }
    };

    const getBadgeClass = (type: string) => {
        switch (type) {
            case PairingSourceEnum.Recipe: return "bg-orange-100 text-orange-800";
            case PairingSourceEnum.Film:
            case PairingSourceEnum.TvShow: return "bg-violet-100 text-violet-800";
            case PairingSourceEnum.Song: return "bg-emerald-100 text-emerald-800";
            case PairingSourceEnum.Audiobook:
            case PairingSourceEnum.Book:
            case PairingSourceEnum.Comic: return "bg-sky-100 text-sky-800";
            default: return "bg-slate-100 text-slate-800";
        }
    };

    return (
        <div className="mt-8 pt-8 border-t space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Pair Well With</h3>
                    <p className="text-sm text-muted-foreground">Manage recommendations and pairings for this content.</p>
                </div>
            </div>

            {/* Existing Pairings */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pairingsLoading || itemsLoading ? (
                    <div className="col-span-full py-8 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mr-2" />
                        <span className="text-sm text-slate-500">Loading pairings...</span>
                    </div>
                ) : !existingPairings || existingPairings.length === 0 ? (
                    <div className="col-span-full py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No pairings added yet.</p>
                    </div>
                ) : (
                    existingPairings.map((pairing: Pairing) => {
                        const item = pairedItems.find((i: any) => i.id === pairing.target_id);
                        return (
                            <Card key={pairing.id} className="overflow-hidden border-slate-200 hover:shadow-sm transition-shadow">
                                <CardContent className="p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm truncate" title={item?.title || "Unknown"}>
                                                {item?.title || "Unknown Item"}
                                            </p>
                                            <Badge variant="secondary" className={cn("mt-1.5 text-[10px] h-5", getBadgeClass(pairing.target_ref))}>
                                                {getSourceIcon(pairing.target_ref)}
                                                <span className="ml-1">{pairing.target_ref}</span>
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => deletePairingMutation.mutate(pairing.id)}
                                            disabled={deletePairingMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Add New Pairing */}
            <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add New Pairing
                </h4>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-48">
                        <Label className="text-xs font-semibold mb-1.5 block">Target Table</Label>
                        <Select value={targetRef} onValueChange={(v) => {
                            setTargetRef(v as PairingSourceEnum);
                            setSearchQuery("");
                        }}>
                            <SelectTrigger className="bg-white h-10">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(PairingSourceEnum).map((type) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 relative">
                        <Label className="text-xs font-semibold mb-1.5 block">Search by Title</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={`Search ${targetRef.toLowerCase()}s...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 bg-white"
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                </div>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchQuery.length >= 2 && (
                            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                                {searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-slate-500">
                                        {isSearching ? "Searching..." : "No results found"}
                                    </div>
                                ) : (
                                    searchResults.map((result: any) => (
                                        <div
                                            key={result.id}
                                            className="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer border-b last:border-0"
                                            onClick={() => createPairingMutation.mutate(result.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {getSourceIcon(result.type)}
                                                <span className="text-sm font-medium">{result.title}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                                <Plus className="h-4 w-4 mr-1" /> Add
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}