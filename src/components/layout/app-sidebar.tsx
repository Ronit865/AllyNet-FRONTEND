import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Briefcase,
  Heart,
  MessagesSquare,
  Mail,
  Settings,
  Sun,
  Moon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Flag,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

// Base navigation for all users
const baseNavigation = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, color: "text-sky-500", activeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  { title: "Alumni Directory", url: "/alumni", icon: Users, color: "text-purple-500", activeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { title: "Events", url: "/events", icon: Calendar, color: "text-blue-500", activeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { title: "Jobs", url: "/jobs", icon: Briefcase, color: "text-orange-500", activeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { title: "Donations", url: "/donations", icon: Heart, color: "text-emerald-500", activeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { title: "Community Chat", url: "/communications", icon: MessagesSquare, color: "text-indigo-500", activeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
];

const adminNavigation = [
  { title: "Admin Dashboard", url: "/admin", icon: LayoutDashboard, color: "text-sky-500", activeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  { title: "Manage Users", url: "/admin/alumni", icon: Users, color: "text-purple-500", activeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  { title: "Manage Events", url: "/admin/events", icon: Calendar, color: "text-blue-500", activeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { title: "Manage Jobs", url: "/admin/jobs", icon: Briefcase, color: "text-orange-500", activeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { title: "Manage Donations", url: "/admin/donations", icon: Heart, color: "text-emerald-500", activeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { title: "Communications", url: "/admin/communications", icon: Mail, color: "text-indigo-500", activeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  { title: "Reports", url: "/admin/reports", icon: Flag, color: "text-amber-500", activeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
];

export function AppSidebar() {
  const { open, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const { user, userType } = useAuth();

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        return savedTheme === "dark";
      }
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  // Auto-close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  // Determine if we're in admin mode
  const isAdminMode = location.pathname.startsWith('/admin');

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      const isDarkTheme = savedTheme === "dark";
      setIsDark(isDarkTheme);
      document.documentElement.classList.toggle("dark", isDarkTheme);
    } else {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };


  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" && !isAdminMode;
    }
    if (path === "/admin") {
      return location.pathname === "/admin" || location.pathname === "/admin/dashboard";
    }
    return location.pathname === path;
  };

  const getNavClasses = (item: any) => {
    const mobileClasses = isMobile ? "h-12 px-4 text-base" : "h-9 sm:h-11 px-2 sm:px-3 text-sm sm:text-base";
    const baseClasses = `sidebar-nav-item w-full justify-start gap-3 ${mobileClasses} font-medium`;
    const active = isActive(item.url);
    return active
      ? `${baseClasses} active bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold`
      : `${baseClasses} text-muted-foreground hover:text-foreground hover:bg-accent`;
  };

  return (
    <Sidebar className="border-r h-screen sticky top-0" collapsible="icon">
      <SidebarContent className="p-0 h-full">
        {/* Logo Section */}
        <div className={`border-b ${isMobile ? 'h-16' : 'h-14 sm:h-16'} flex items-center ${open ? "justify-between px-4" : "justify-center p-2"}`}>
          <div className={`flex items-center ${open ? "gap-3" : "justify-center"}`}>
            <div className={`flex items-center justify-center shrink-0 ${open ? (isMobile ? 'w-10 h-10' : 'w-10 h-10 sm:w-12 sm:h-12') : 'w-8 h-8'}`}>
              <img
                src="/ANlogo.png"
                alt="AllyNet Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {open && (
              <div className="min-w-0">
                <h1 className={`font-bold gradient-text truncate ${isMobile ? 'text-xl' : 'text-lg sm:text-xl md:text-2xl'}`}>AllyNet</h1>
              </div>
            )}
          </div>
          {open && !isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Toggle Button for Collapsed State */}
        {!open && (
          <div className="flex items-center justify-center py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup className={open ? (isMobile ? "px-3 py-2" : "px-2 sm:px-3") : "px-2"}>
          <SidebarGroupLabel className={!open ? "sr-only" : (isMobile ? "text-sm font-semibold mb-2" : "text-xs sm:text-sm")}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={isMobile ? "space-y-1" : "space-y-0.5 sm:space-y-1"}>
              {(isAdminMode ? adminNavigation : baseNavigation).map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link to={item.url} className={getNavClasses(item)}>
                        <item.icon
                          className={`${isMobile ? "w-5 h-5 shrink-0" : "w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                            } ${active ? "text-sky-600 dark:text-sky-400" : item.color}`}
                        />
                        {open && <span className="truncate">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Section */}
        <div className={`mt-auto border-t ${open ? (isMobile ? "p-3" : "p-2 sm:p-3") : "p-2"}`}>
          <SidebarMenu className={isMobile ? "space-y-1" : "space-y-0.5 sm:space-y-1"}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to={isAdminMode ? "/admin/settings" : "/settings"} className={getNavClasses({ url: isAdminMode ? "/admin/settings" : "/settings", activeColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400" })}>
                  <Settings className={isMobile ? "w-5 h-5 shrink-0" : "w-4 h-4 sm:w-5 sm:h-5 shrink-0"} />
                  {open && <span className="truncate">Settings</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>


            {/* Theme Toggle */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Button
                  variant="ghost"
                  size={!open ? "icon" : "default"}
                  onClick={toggleTheme}
                  className={`${!open ? (isMobile ? "w-10 h-10 justify-center" : "w-9 h-9 sm:w-11 sm:h-11 justify-center") : (isMobile ? "w-full justify-start gap-3 h-12" : "w-full justify-start gap-2 sm:gap-3 h-9 sm:h-11")} text-muted-foreground hover:text-foreground hover:bg-accent`}
                >
                  {isDark ? <Sun className={isMobile ? "w-5 h-5 shrink-0" : "w-4 h-4 sm:w-5 sm:h-5 shrink-0"} /> : <Moon className={isMobile ? "w-5 h-5 shrink-0" : "w-4 h-4 sm:w-5 sm:h-5 shrink-0"} />}
                  {open && <span className="truncate">{isDark ? "Light Mode" : "Dark Mode"}</span>}
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}