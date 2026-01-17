import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { PreviewBanner } from "@/components/preview-banner";
import { PreviewProvider, usePreview } from "@/contexts/preview-context";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLocations from "@/pages/admin/locations";
import LocationFormPage from "@/pages/admin/location-form-page";
import LocationDetail from "@/pages/admin/location-detail";
import AdminUsers from "@/pages/admin/users";
import UserFormPage from "@/pages/admin/user-form-page";
import BackupsPage from "@/pages/admin/backups";
import AdminTickets from "@/pages/admin/tickets";
import LocationDashboard from "@/pages/location/dashboard";
import StorageLocationsPage from "@/pages/location/storage";
import LocationUsersPage from "@/pages/location/users";
import UserTickets from "@/pages/location/tickets";
import { SidebarSkeleton } from "@/components/loading-skeleton";
import type { AppUserWithDetails, Location } from "@shared/schema";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userRole="admin" />
        <div className="flex flex-col flex-1 overflow-hidden">
          <PreviewBanner />
          <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PreviewLayout({ locationId, locationName, role }: { locationId: string; locationName: string; role: "manager" | "employee" }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          userRole={role} 
          locationId={locationId}
          locationName={locationName}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <PreviewBanner />
          <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/">
                <LocationDashboard locationId={locationId} />
              </Route>
              <Route path="/storage">
                <StorageLocationsPage locationId={locationId} />
              </Route>
              <Route path="/users">
                {role === "manager" ? <LocationUsersPage locationId={locationId} /> : <NotFound />}
              </Route>
              <Route path="/tickets">
                <UserTickets locationId={locationId} />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function LocationLayout({ children, locationId }: { children: React.ReactNode; locationId: string }) {
  const { data: appUser } = useQuery<AppUserWithDetails>({
    queryKey: ["/api/auth/app-user"],
  });

  const { data: location, error } = useQuery<Location>({
    queryKey: ["/api/locations", locationId],
  });

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Check if location is suspended
  if (location?.isSuspended) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Location Suspended</h2>
          <p className="text-muted-foreground mb-4">
            Your location <span className="font-medium">{location.name}</span> has been temporarily suspended. 
            Please contact an administrator for assistance.
          </p>
          <button 
            onClick={() => {
              fetch("/api/logout", { method: "POST", credentials: "include" })
                .then(() => window.location.href = "/");
            }}
            className="text-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          userRole={appUser?.role || "employee"} 
          locationId={locationId}
          locationName={location?.name}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthenticatedRouter() {
  const { data: appUser, isLoading, error } = useQuery<AppUserWithDetails>({
    queryKey: ["/api/auth/app-user"],
    retry: (failureCount, error: any) => {
      // Don't retry on LOCATION_SUSPENDED
      if (error?.message?.includes("LOCATION_SUSPENDED") || error?.code === "LOCATION_SUSPENDED") {
        return false;
      }
      return failureCount < 3;
    },
  });
  const { preview } = usePreview();

  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <SidebarSkeleton />
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-4 w-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Check for location suspended error
  if (error && (error as any)?.message?.includes("suspended")) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Location Suspended</h2>
          <p className="text-muted-foreground mb-4">
            Your location has been temporarily suspended. Please contact an administrator for assistance.
          </p>
          <button 
            onClick={() => {
              fetch("/api/logout", { method: "POST", credentials: "include" })
                .then(() => window.location.href = "/");
            }}
            className="text-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold mb-2">Access Pending</h2>
          <p className="text-muted-foreground mb-4">
            Your account is being set up. Please contact an administrator.
          </p>
          <button 
            onClick={() => {
              fetch("/api/logout", { method: "POST", credentials: "include" })
                .then(() => window.location.href = "/");
            }}
            className="text-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (appUser.role === "admin") {
    if (preview.isActive && preview.locationId && preview.locationName && preview.role) {
      return (
        <PreviewLayout 
          locationId={preview.locationId} 
          locationName={preview.locationName}
          role={preview.role}
        />
      );
    }

    return (
      <AdminLayout>
        <Switch>
          <Route path="/" component={AdminDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/locations" component={AdminLocations} />
          <Route path="/admin/locations/new" component={LocationFormPage} />
          <Route path="/admin/locations/:id/edit" component={LocationFormPage} />
          <Route path="/admin/locations/:id" component={LocationDetail} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/users/new" component={UserFormPage} />
          <Route path="/admin/backups" component={BackupsPage} />
          <Route path="/admin/tickets" component={AdminTickets} />
          <Route path="/location/:id">
            {(params) => (
              <LocationLayout locationId={params.id}>
                <LocationDashboard />
              </LocationLayout>
            )}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    );
  }

  const userLocationId = appUser.locationId;

  if (!userLocationId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6">
          <h2 className="text-xl font-semibold mb-2">No Location Assigned</h2>
          <p className="text-muted-foreground mb-4">
            You have not been assigned to a location yet. Please contact an administrator.
          </p>
          <button 
            onClick={() => {
              fetch("/api/logout", { method: "POST", credentials: "include" })
                .then(() => window.location.href = "/");
            }}
            className="text-primary hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <LocationLayout locationId={userLocationId}>
      <Switch>
        <Route path="/">
          <LocationDashboard locationId={userLocationId} />
        </Route>
        <Route path="/storage">
          <StorageLocationsPage locationId={userLocationId} />
        </Route>
        <Route path="/users">
          {appUser.role === "manager" ? <LocationUsersPage locationId={userLocationId} /> : <NotFound />}
        </Route>
        <Route path="/tickets">
          <UserTickets locationId={userLocationId} />
        </Route>
        <Route path="/location/:id">
          {(params) => <LocationDashboard locationId={params.id} />}
        </Route>
        <Route path="/location/:id/storage">
          {(params) => <StorageLocationsPage locationId={params.id} />}
        </Route>
        <Route path="/location/:id/users">
          {(params) => appUser.role === "manager" ? <LocationUsersPage locationId={params.id} /> : <NotFound />}
        </Route>
        <Route path="/location/:id/tickets">
          {(params) => <UserTickets locationId={params.id} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </LocationLayout>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (location === "/auth") {
    if (user) {
      return <AuthenticatedRouter />;
    }
    return <AuthPage />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return <AuthenticatedRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PreviewProvider>
          <Toaster />
          <Router />
        </PreviewProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
