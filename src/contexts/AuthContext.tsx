import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AuthContextValue {
  isReady: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isReady: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there is an existing Supabase session on first load.
    // This is the source of truth — not what's in localStorage.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      let activeSession = session;

      if (activeSession) {
        const expiresAt = activeSession.expires_at ? activeSession.expires_at * 1000 : 0;
        const isExpired = Date.now() >= expiresAt;

        // "letting the supabase refresh the token first"
        if (isExpired) {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            activeSession = null;
          } else {
            activeSession = refreshData.session;
          }
        }
      }

      if (!activeSession) {
        // If there's no active session but Zustand says we're authenticated,
        // force a logout to sync the state.
        const isAuthenticated = useAuthStore.getState().isAuthenticated;
        if (isAuthenticated) {
          logout();
          navigate("/login", { replace: true });
        }
      }
      setIsReady(true);
    });

    // Subscribe to Supabase auth events for the lifetime of the app.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_OUT") {
          const isAuthenticated = useAuthStore.getState().isAuthenticated;
          if (isAuthenticated) {
            logout();
            toast.error("Your session has expired. Please log in again.");
            navigate("/login", { replace: true });
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [logout, navigate]);

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
