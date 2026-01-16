import { Button } from "@/components/ui/button";
import { Package, Building2, BarChart3, Shield, Users, Printer } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-semibold">Tracklet</span>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="/auth"
                data-testid="link-login"
              >
                <Button variant="outline">Log In</Button>
              </a>
              <a 
                href="/auth"
                data-testid="link-get-started"
              >
                <Button>Get Started</Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Mail Parcel Tracking
                <span className="block text-primary mt-2">Made Simple</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Tracklet helps businesses organize, track, and manage mail parcels efficiently. 
                From small mailrooms to large distribution centers, we've got you covered.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <a href="/auth" data-testid="link-cta-primary">
                  <Button size="lg" className="text-base">
                    Start Tracking Today
                  </Button>
                </a>
                <a href="#features">
                  <Button size="lg" variant="outline" className="text-base">
                    Learn More
                  </Button>
                </a>
              </div>
              <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Secure & Reliable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Multi-user Support</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border">
                <div className="bg-card rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span className="font-medium">Package Dashboard</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Live Preview</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { tracking: "1Z999AA10123456784", name: "John Smith", status: "Pending" },
                      { tracking: "9400111899223456789012", name: "Sarah Johnson", status: "Ready" },
                      { tracking: "92748902113987654321", name: "Mike Brown", status: "Pending" },
                    ].map((pkg, i) => (
                      <div key={i} className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-mono text-xs">{pkg.tracking.slice(0, 15)}...</p>
                          <p className="text-sm">{pkg.name}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          pkg.status === "Ready" 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>
                          {pkg.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features to help you manage packages efficiently
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                title: "Package Tracking",
                description: "Track all incoming packages with unique tracking numbers, recipient names, and storage locations.",
              },
              {
                icon: Building2,
                title: "Multi-Location Support",
                description: "Manage multiple business locations from a single centralized dashboard.",
              },
              {
                icon: BarChart3,
                title: "Flexible Pricing",
                description: "Configure per-pound or range-based pricing models for each location.",
              },
              {
                icon: Users,
                title: "User Management",
                description: "Create managers and employees with role-based access control.",
              },
              {
                icon: Printer,
                title: "Print Receipts",
                description: "Generate printable package lists for recipients with cost breakdowns.",
              },
              {
                icon: Shield,
                title: "Secure Access",
                description: "Enterprise-grade security with encrypted passwords and session management.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-card p-6 rounded-xl border hover-elevate transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join businesses already using Tracklet to streamline their package management.
          </p>
          <a href="/auth" data-testid="link-cta-footer">
            <Button size="lg" className="text-base">
              Start Free Today
            </Button>
          </a>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="font-medium">Tracklet</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Tracklet. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
