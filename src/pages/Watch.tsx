import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Search, Plus, Edit, Trash2, Film, Tv, Loader2 } from "lucide-react";
import MediaDialog from "@/components/MediaDialog";
import type { Project, ProjectFormData, Response } from "@/types";
import { toast } from "sonner";
import { Projects } from "@/api";

export default function Watch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [loading,setLoading] = useState<boolean>(false);

  const queryClient = useQueryClient();

  // Fetch all media
  const { data: mediaList, isLoading, error } = useQuery<Response<Project[]>>({
    queryKey: ["media"],
    queryFn: Projects.get as any,
  });
  const deleteMutation = useMutation({
    mutationFn: Projects.deleteOneByIDPermanent as any,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Media deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete media: ${error.message}`);
    },
  });

  const filteredMedia = mediaList?.data?.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content_type.toLowerCase().includes(searchQuery.toLowerCase())
      // item.platform_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddNew = () => {
    setSelectedMedia(null);
    setIsMediaDialogOpen(true);
  };

  const handleEdit = (media: Project) => {
    setSelectedMedia(media);
    setIsMediaDialogOpen(true);
  };

  const handleDelete = (media: Project) => {
    setMediaToDelete(media);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: ProjectFormData) => {

    let res:{type:"UPDATED"|"CREATED",response:Response};
    if (selectedMedia) {  
      const response = await Projects.updateOneByID?.(selectedMedia.id, data, {onLoadingStateChange:(state:boolean)=>setLoading(state)})
      res = {type:"UPDATED",response}
    } else {
      const response = await Projects.createOne?.(data, {onLoadingStateChange:(state:boolean)=>setLoading(state)})
      res = {type:"CREATED",response}
    }
     if (!res.response.error) {
        setIsMediaDialogOpen(false);
        setSelectedMedia(null);
        if(res.type === "CREATED"){
          toast.success("Media created successfully!");
        }else{
          toast.success("Media updated successfully!");
        }
      }
  };

  const confirmDelete = async () => {
    if (mediaToDelete) {
      Projects.deleteOneByIDPermanent
      ?.(mediaToDelete.id,{onLoadingStateChange:(state:boolean)=>setLoading(state)})
    }
  };

  // Calculate stats
  const totalFilms = mediaList?.data?.filter((m) => m.content_type === "Film").length;
  const totalTVShows = mediaList?.data?.filter((m) => m.content_type === "TV Show").length;
  const avgRuntime = (mediaList?.data?.length || 0) > 0
    ? Math.round(
        (mediaList?.data || []).filter((m) => m.runtime_minutes)
          .reduce((acc, m) => acc + (m.runtime_minutes || 0), 0) /
          (mediaList?.data || []).filter((m) => m.runtime_minutes).length
      )
    : 0;

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error Loading Media</h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Watch Library</h1>
          <p className="text-muted-foreground">
            Manage films and TV shows in your catalog
          </p>
        </div>
        <Button className="w-full md:w-auto" onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Media
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Content</CardDescription>
            <CardTitle className="text-3xl">{(mediaList?.data?.length || 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Films</CardDescription>
            <CardTitle className="text-3xl">{totalFilms}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>TV Shows</CardDescription>
            <CardTitle className="text-3xl">{totalTVShows}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Runtime</CardDescription>
            <CardTitle className="text-3xl">
              {avgRuntime > 0 ? `${avgRuntime}m` : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle>Content Library</CardTitle>
          <CardDescription>
            Browse and manage your media content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title, type, or platform..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poster</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : !!filteredMedia?.length ? (
                  filteredMedia.map((media) => (
                    <TableRow key={media.id}>
                      <TableCell>
                        {media.poster_url ? (
                          <img
                            src={media.poster_url}
                            alt={media.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                            {media.content_type === "Film" ? (
                              <Film className="h-6 w-6 text-muted-foreground" />
                            ) : (
                              <Tv className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{media.title}</div>
                        {media.notes && (
                          <div className="text-xs text-muted-foreground truncate">
                            {media.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          {media.content_type === "Film" ? (
                            <Film className="h-3 w-3" />
                          ) : (
                            <Tv className="h-3 w-3" />
                          )}
                          {media.content_type}
                        </span>
                      </TableCell>
                      {/* <TableCell>{media.platform_name || "—"}</TableCell> */}
                      <TableCell>{media.release_year || "—"}</TableCell>
                      <TableCell>
                        {/* {media.rating ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                            {media.rating}
                          </span>
                        ) : (
                          "—"
                        )} */}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(media)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(media)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No media found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Media Dialog */}
      <MediaDialog
        open={isMediaDialogOpen}
        onOpenChange={setIsMediaDialogOpen}
        media={selectedMedia as any}
        onSubmit={handleSubmit}
        isLoading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{mediaToDelete?.title}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
