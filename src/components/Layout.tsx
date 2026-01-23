import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar />
      <main className={cn(
        "transition-all duration-300 ease-in-out min-h-screen",
        sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
      )}>
        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
