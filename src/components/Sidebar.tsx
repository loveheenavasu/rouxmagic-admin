import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Film,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Music,
  BookOpen,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ImagePlay,
  Utensils,
  Archive,
  PanelBottom,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  {
    name: "Home Page",
    href: "/home",
    icon: LayoutDashboard,
    subItems: [
      { name: "Content Library", href: "/home", icon: LayoutGrid },
      { name: "Carousel", href: "/home/carousel", icon: ImagePlay },
    ],
  },
  {
    name: "Watch Library",
    href: "/watch",
    icon: Film,
    subItems: [
      { name: "Content Library", href: "/watch", icon: LayoutGrid },
      { name: "Carousel", href: "/watch/carousel", icon: ImagePlay },
    ],
  },
  {
    name: "Recipes",
    href: "/recipes",
    icon: Utensils,
    subItems: [
      { name: "Content", href: "/recipes", icon: LayoutGrid },
      { name: "Carousel", href: "/recipes/carousel", icon: ImagePlay },
    ],
  },
  { name: "Listen Library", href: "/listen", icon: Music },
  { name: "Read Library", href: "/read", icon: BookOpen },
  { name: "Shop", href: "/shop", icon: ShoppingBag },
  { name: "Archive", href: "/archive", icon: Archive },
  { name: "Content Rows", href: "/content-rows", icon: PanelBottom },
  { name: "Footer", href: "/footer", icon: PanelBottom },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Home Page"]); // Home Page expanded by default

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300 ease-in-out lg:translate-x-0 overflow-visible",
          isMobileOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full lg:translate-x-0",
          sidebarCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <div className="flex flex-col h-full relative">
          {/* Logo/Brand */}
          <div
            className={cn(
              "p-6 border-b flex items-center justify-between min-h-[97px]",
              sidebarCollapsed ? "px-4 justify-center" : ""
            )}
          >
            {!sidebarCollapsed && (
              <div className="animate-in fade-in duration-300 overflow-hidden">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent truncate">
                  RouxMagic
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin Panel
                </p>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "hidden lg:flex transition-all hover:bg-slate-100 rounded-full",
                sidebarCollapsed ? "h-10 w-10" : "h-8 w-8"
              )}
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden -mr-2 h-8 w-8"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          <div className={cn("p-4 border-b", sidebarCollapsed ? "px-2" : "")}>
            <div
              className={cn(
                "flex items-center gap-3",
                sidebarCollapsed ? "justify-center" : ""
              )}
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                {user?.name.charAt(0) || "A"}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                  <p className="text-sm font-semibold truncate text-slate-900">
                    {user?.name || "Admin"}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {user?.email || ""}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav
            className={cn(
              "flex-1 p-4 space-y-1",
              sidebarCollapsed ? "px-2" : "overflow-y-auto"
            )}
          >
            {navigation.map((item) => {
              const isParentActive = location.pathname.startsWith(item.href);
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedItems.includes(item.name);

              return (
                <div key={item.name}>
                  {/* Parent Item */}
                  {hasSubItems && !sidebarCollapsed ? (
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={cn(
                        "w-full flex items-center rounded-xl text-sm font-medium transition-all group relative h-11 px-3 gap-3",
                        isParentActive
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                          isParentActive
                            ? "text-indigo-600"
                            : "text-slate-500 group-hover:text-indigo-600"
                        )}
                      />
                      <span className="truncate flex-1 text-left">
                        {item.name}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center rounded-xl text-sm font-medium transition-all group relative h-11",
                        sidebarCollapsed ? "justify-center px-0" : "px-3 gap-3",
                        isParentActive && !hasSubItems
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                          isParentActive && !hasSubItems
                            ? "text-white"
                            : "text-slate-500 group-hover:text-indigo-600"
                        )}
                      />

                      {!sidebarCollapsed && (
                        <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                          {item.name}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[9999] whitespace-nowrap shadow-xl translate-x-1 group-hover:translate-x-0">
                          {item.name}
                          <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 -ml-1" />
                        </div>
                      )}
                    </Link>
                  )}
                  {/* Sub Items */}
                  {hasSubItems && !sidebarCollapsed && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
                      {item.subItems!.map((subItem) => {
                        const isSubActive = location.pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center rounded-lg text-sm font-medium transition-all group relative h-10 px-3 gap-3",
                              isSubActive
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                                : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                            )}
                          >
                            <subItem.icon
                              className={cn(
                                "h-4 w-4 shrink-0",
                                isSubActive
                                  ? "text-white"
                                  : "text-slate-400 group-hover:text-indigo-600"
                              )}
                            />
                            <span className="truncate">{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className={cn("p-4 border-t", sidebarCollapsed ? "px-2" : "")}>
            <Button
              variant="ghost"
              className={cn(
                "w-full transition-all group relative h-11 rounded-xl",
                sidebarCollapsed
                  ? "justify-center px-0"
                  : "justify-start px-3 text-slate-600 hover:text-red-600 hover:bg-red-50"
              )}
              onClick={logout}
            >
              <LogOut
                className={cn(
                  "h-5 w-5",
                  !sidebarCollapsed
                    ? "mr-3 text-slate-500 group-hover:text-red-600"
                    : "text-slate-500 group-hover:text-red-600"
                )}
              />
              {!sidebarCollapsed && <span className="font-medium">Logout</span>}

              {sidebarCollapsed && (
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[9999] whitespace-nowrap shadow-xl translate-x-1 group-hover:translate-x-0">
                  Logout
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-red-600 rotate-45 -ml-1" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </aside >

      {/* Mobile overlay */}
      {
        isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )
      }
    </>
  );
}
