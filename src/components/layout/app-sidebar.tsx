import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Calendar, Briefcase, Heart,
  MessagesSquare, Settings, Sun, Moon, Flag,
  LogOut, ChevronLeft, ChevronRight, BarChart3,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/ApiServices";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─── Nav definitions ────────────────────────────────── */
const userNav = [
  { title: "Dashboard",      url: "/",              icon: LayoutDashboard },
  { title: "Alumni",         url: "/alumni",        icon: Users           },
  { title: "Events",         url: "/events",        icon: Calendar        },
  { title: "Jobs",           url: "/jobs",          icon: Briefcase       },
  { title: "Donations",      url: "/donations",     icon: Heart           },
  { title: "Community",      url: "/communications",icon: MessagesSquare  },
];

const adminNav = [
  { title: "Dashboard",      url: "/admin",                icon: LayoutDashboard },
  { title: "Users",          url: "/admin/alumni",         icon: Users           },
  { title: "Events",         url: "/admin/events",         icon: Calendar        },
  { title: "Jobs",           url: "/admin/jobs",           icon: Briefcase       },
  { title: "Donations",      url: "/admin/donations",      icon: Heart           },
  { title: "Communications", url: "/admin/communications", icon: MessagesSquare  },
  { title: "Reports",        url: "/admin/reports",        icon: Flag            },
];

/* ─── Single NavItem ─────────────────────────────────── */
function NavItem({
  item, active, expanded, isMobile,
}: {
  item: { title: string; url: string; icon: React.ElementType };
  active: boolean;
  expanded: boolean;
  isMobile: boolean;
}) {
  const inner = (
    <Link
      to={item.url}
      className={cn(
        "sidebar-nav-item w-full",
        active && "active",
        !expanded && "justify-center px-2",
        isMobile && "py-2.5 text-sm"
      )}
    >
      <item.icon className={cn(
        "shrink-0",
        isMobile ? "w-[18px] h-[18px]" : "w-4 h-4"
      )} />
      {expanded && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (!expanded && !isMobile) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }
  return inner;
}

/* ─── Main Sidebar ───────────────────────────────────── */
export function AppSidebar() {
  const { open, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, admin, logout, userType } = useAuth();
  const isAdminMode = location.pathname.startsWith("/admin");

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  /* Close mobile menu on route change */
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  /* Sync theme on mount */
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved ? saved === "dark" : document.documentElement.classList.contains("dark");
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    if (!saved) localStorage.setItem("theme", dark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {}
    logout();
    toast.success("Signed out");
    navigate("/auth/login");
  };

  const isActive = (path: string) => {
    if (path === "/" ) return location.pathname === "/" && !isAdminMode;
    if (path === "/admin") return ["/admin", "/admin/dashboard"].includes(location.pathname);
    return location.pathname === path;
  };

  const currentUser   = user || admin;
  const displayName   = currentUser?.name  || "User";
  const displayEmail  = currentUser?.email || "";
  const avatarSrc     = currentUser?.avatar || "";
  const avatarFallback = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const nav = isAdminMode ? adminNav : userNav;

  return (
    <Sidebar collapsible="icon" className="border-r h-screen sticky top-0">
      <SidebarContent className="p-0 h-full flex flex-col overflow-hidden">

        {/* ── Logo / Brand ── */}
        <div className={cn(
          "flex items-center shrink-0 border-b",
          open ? "h-[56px] px-3 justify-between" : "h-[56px] px-0 justify-center"
        )}>
          {open ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 flex items-center justify-center">
                  <img src="/ANlogo.png" alt="AllyNet" className="w-full h-full object-contain" />
                </div>
                <span className="text-sm font-bold tracking-tight text-foreground truncate">
                  AllyNet
                  {isAdminMode && (
                    <span className="ml-1.5 text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </span>
              </div>
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground shrink-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* ── Navigation ── */}
        <SidebarGroup className={cn("flex-1 overflow-y-auto py-2", open ? "px-2" : "px-1.5")}>
          {open && (
            <SidebarGroupLabel className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest px-1 mb-1">
              {isAdminMode ? "Admin" : "Navigation"}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {nav.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavItem
                      item={item}
                      active={isActive(item.url)}
                      expanded={open}
                      isMobile={isMobile}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Bottom: Settings + Theme + User ── */}
        <div className={cn("shrink-0 border-t", open ? "px-2 py-2" : "px-1.5 py-2")}>
          <SidebarMenu className="space-y-0.5">
            {/* Settings */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavItem
                  item={{
                    title: "Settings",
                    url: isAdminMode ? "/admin/settings" : "/settings",
                    icon: Settings,
                  }}
                  active={isActive(isAdminMode ? "/admin/settings" : "/settings")}
                  expanded={open}
                  isMobile={isMobile}
                />
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Theme toggle */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                {!open && !isMobile ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleTheme}
                        className="sidebar-nav-item justify-center px-2 w-full"
                      >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs font-medium">
                      {isDark ? "Light mode" : "Dark mode"}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    onClick={toggleTheme}
                    className={cn(
                      "sidebar-nav-item w-full",
                      isMobile && "py-2.5 text-sm"
                    )}
                  >
                    {isDark
                      ? <Sun className={cn("shrink-0", isMobile ? "w-[18px] h-[18px]" : "w-4 h-4")} />
                      : <Moon className={cn("shrink-0", isMobile ? "w-[18px] h-[18px]" : "w-4 h-4")} />
                    }
                    {open && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
                  </button>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* User row */}
          {currentUser && (
            <>
              <Separator className="my-2" />
              {open ? (
                <div className="flex items-center gap-2 px-1 py-1 rounded-md hover:bg-accent/60 transition-colors group">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                      {avatarFallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold leading-tight truncate text-foreground">{displayName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{displayEmail}</p>
                  </div>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleLogout}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <LogOut className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">Sign out</TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="flex justify-center pt-0.5">
                      <Avatar className="h-6 w-6 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all rounded-full">
                        <AvatarImage src={avatarSrc} />
                        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                          {avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <div className="font-semibold">{displayName}</div>
                    <div className="text-muted-foreground">{displayEmail}</div>
                  </TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}