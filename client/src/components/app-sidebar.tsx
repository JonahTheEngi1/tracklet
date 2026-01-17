import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Package,
  MapPin,
  Users,
  Settings,
  Home,
  LogOut,
  Building2,
  Warehouse,
  Database,
  Ticket,
} from "lucide-react";

interface AppSidebarProps {
  userRole: "admin" | "manager" | "employee";
  locationId?: string;
  locationName?: string;
}

export function AppSidebar({ userRole, locationId, locationName }: AppSidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Locations", url: "/admin/locations", icon: Building2 },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "Backups", url: "/admin/backups", icon: Database },
    { title: "Tickets", url: "/admin/tickets", icon: Ticket },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ];

  const locationItems = [
    { title: "Packages", url: "/", icon: Package },
    { title: "Storage", url: "/storage", icon: Warehouse },
    { title: "Users", url: "/users", icon: Users },
    { title: "Support", url: "/tickets", icon: Ticket },
  ];

  const isActive = (url: string) => {
    if (url === "/" && location === "/") return true;
    if (url === "/admin" && location === "/admin") return true;
    if (url !== "/" && url !== "/admin" && location.startsWith(url)) return true;
    return false;
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.email || "User";

  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href={userRole === "admin" ? "/admin" : "/"}>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-none">Tracklet</h1>
              {locationName && (
                <p className="text-xs text-muted-foreground mt-1">{locationName}</p>
              )}
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {userRole === "admin" ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Location</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {locationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
