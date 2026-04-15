import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { admin } from "@/api/integrations/supabase/users/admin";
import { UserProfile } from "@/types/integrations/supabase/profiles";
import { X, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { supabase } from "@/lib/supabase";
import { StatsRow } from "@/components/StatsRow";

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingUserId, setCancellingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [error] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    is_verified: true,
  });

  useEffect(() => {
    async function fetchUsers() {
      const { users, error } = await admin.getAllUsers();

      if (error) {
        toast.error("Error occured while fetching users.");
      }
      setUsers(users);
      setLoading(false);
    }

    fetchUsers();
  }, []);

  const handleCancelSubscription = async (userId: string) => {
    try {
      setCancellingUserId(userId);
      toast.info("Canceling subscription...");
      const res = await admin.users.manageSubsctions.cancelImmediately(userId);
      if (res?.data && !res?.error && !res.data.error) {
        toast.success("Subscription cancelled successfully.");
        setUsers(
          users.map((user) => {
            if (user.id === userId) {
              return {
                ...user,
                profile: user.profile
                  ? { ...user.profile, tier: null, plan: null }
                  : null,
              };
            }
            return user;
          }),
        );
      } else {
        const errorMsg =
          (res?.error as any)?.message || "Failed to cancel subscription.";
        toast.error(errorMsg);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setCancellingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setDeletingUserId(userId);
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      toast.success("User deleted successfully.");
      setUsers(users.filter((user) => user.id !== userId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password) {
      toast.error("Please fill in email and password.");
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: createForm,
      });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      toast.success("User created successfully.");
      setIsCreateOpen(false);
      setCreateForm({
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
        is_verified: true,
      });

      // Refresh users
      setLoading(true);
      const fetchRes = await admin.getAllUsers();
      if (!fetchRes.error) {
        setUsers(fetchRes.users || []);
      }
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <StatsRow
        title="Users"
        description="Manage user accounts and permissions"
        handleNew={() => setIsCreateOpen(true)}
        buttonInnerText="Create New User"
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user using the Supabase Admin API.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="col-span-3"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  className="col-span-3"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="confirmPassword" className="text-right">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  className="col-span-3"
                  value={createForm.confirmPassword}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, role: val })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Verified toggle — hidden for now, hardcoded to true
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Verified</Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Switch
                    checked={createForm.is_verified}
                    onCheckedChange={(val) =>
                      setCreateForm({ ...createForm, is_verified: val })
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {createForm.is_verified ? "Yes" : "No"}
                  </span>
                </div>
              </div>
              */}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View all registered users and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
              role="alert"
            >
              Error fetching users: {error}
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Actions</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="w-[50px]">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingUserId === user.id}
                            >
                              {deletingUserId === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this user? This
                                action is permanent and will remove all
                                associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                      <TableCell
                        className="font-mono text-xs max-w-[120px] truncate"
                        title={user.id}
                      >
                        {user.id}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.profile?.name ? (
                          `${user.profile.name}`.trim()
                        ) : (
                          <span className="text-muted-foreground italic">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="relative inline-block mt-1">
                          {cancellingUserId === user.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                          ) : (
                            <>
                              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {user.profile?.plan?.name ?? "Free"}
                              </span>
                              {user.profile?.plan?.stripe_product_id && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full border border-red-500 bg-red-100/90 text-red-600 hover:bg-red-200 dark:border-red-800 dark:bg-red-900/90 dark:text-red-400 transition-colors backdrop-blur-sm shadow-sm"
                                      title="Cancel Subscription"
                                    >
                                      <X className="h-2.5 w-2.5 flex-shrink-0 stroke-[3]" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Are you absolutely sure?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will
                                        immediately cancel the active
                                        subscription for{" "}
                                        {user.profile?.name || user.email}.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() =>
                                          handleCancelSubscription(user.id)
                                        }
                                      >
                                        Confirm Cancel
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
