import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CardGridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import { Database, Key, Clock, Building2, CheckCircle, AlertCircle, Play, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { LocationWithDetails } from "@shared/schema";

type BackupSettings = {
  apiKeyConfigured: boolean;
  frequencyHours: number;
  enabled: boolean;
  lastBackupAt: string | null;
};

type LocationWithBackup = LocationWithDetails & {
  backupCount: number;
  lastBackup: string | null;
};

export default function BackupsPage() {
  const { toast } = useToast();
  const [frequency, setFrequency] = useState<number>(24);

  const { data: settings, isLoading: settingsLoading } = useQuery<BackupSettings>({
    queryKey: ["/api/admin/backup/settings"],
  });

  const { data: locations, isLoading: locationsLoading } = useQuery<LocationWithBackup[]>({
    queryKey: ["/api/admin/backup/locations"],
  });

  const validateKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/backup/validate-key", {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "API Key Validated", description: "Your JSONBin API key has been validated successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Validation Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<BackupSettings>) => {
      const res = await apiRequest("PATCH", "/api/admin/backup/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/settings"] });
    },
  });

  const toggleBackupsMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("POST", "/api/admin/backup/toggle", { enabled });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: data.enabled ? "Backups Enabled" : "Backups Disabled", 
        description: data.message 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/backup/run", {});
      return res.json();
    },
    onSuccess: (data) => {
      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;
      toast({ 
        title: "Backup Complete", 
        description: `${successCount} successful, ${failCount} failed` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup/settings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Backup Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFrequencyChange = () => {
    if (frequency < 1) {
      toast({ title: "Error", description: "Frequency must be at least 1 hour", variant: "destructive" });
      return;
    }
    updateSettingsMutation.mutate({ frequencyHours: frequency });
    toast({ title: "Frequency Updated", description: `Backups will run every ${frequency} hours` });
  };

  const isLoading = settingsLoading || locationsLoading;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Backups</h1>
        <p className="text-muted-foreground">Configure automated backups to JSONBin.io</p>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={2} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key Configuration
              </CardTitle>
              <CardDescription>
                Add your JSONBin.io API key as a Replit secret named <code className="bg-muted px-1 rounded">JSONBIN_API_KEY</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to the Secrets tab in your Replit workspace</li>
                    <li>Add a new secret with key: <code className="bg-muted px-1 rounded">JSONBIN_API_KEY</code></li>
                    <li>Paste your JSONBin.io API key as the value</li>
                    <li>Click the button below to validate</li>
                  </ol>
                </div>
                <Button 
                  onClick={() => validateKeyMutation.mutate()}
                  disabled={validateKeyMutation.isPending}
                  data-testid="button-validate-api-key"
                >
                  {validateKeyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Validate API Key
                </Button>
              </div>
              {settings?.apiKeyConfigured && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  API key validated
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Backup Schedule
              </CardTitle>
              <CardDescription>
                Set how often backups should run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency (hours)</Label>
                <div className="flex gap-2">
                  <Input
                    id="frequency"
                    type="number"
                    min={1}
                    value={frequency}
                    onChange={(e) => setFrequency(parseInt(e.target.value) || 24)}
                    data-testid="input-frequency"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleFrequencyChange}
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-frequency"
                  >
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: Every {settings?.frequencyHours || 24} hours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Enable Backups
            </CardTitle>
            <CardDescription>
              Toggle automatic backups for all locations
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => runBackupMutation.mutate()}
              disabled={!settings?.apiKeyConfigured || runBackupMutation.isPending}
              data-testid="button-run-backup"
            >
              {runBackupMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Now
            </Button>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(checked) => toggleBackupsMutation.mutate(checked)}
              disabled={!settings?.apiKeyConfigured || toggleBackupsMutation.isPending}
              data-testid="switch-enable-backups"
            />
          </div>
        </CardHeader>
        <CardContent>
          {settings?.enabled ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              Backups are enabled every {settings.frequencyHours} hours
              {settings.lastBackupAt && (
                <span className="text-muted-foreground ml-2">
                  Last backup: {format(new Date(settings.lastBackupAt), "PPp")}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              Backups are currently disabled
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Location Backups
          </CardTitle>
          <CardDescription>
            Each location maintains up to 5 backup snapshots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locationsLoading ? (
            <TableSkeleton rows={3} />
          ) : !locations?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No locations found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`backup-location-${loc.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{loc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {loc.packageCount || 0} packages
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={loc.backupCount > 0 ? "default" : "secondary"}>
                      {loc.backupCount}/5 backups
                    </Badge>
                    {loc.lastBackup && (
                      <span className="text-sm text-muted-foreground">
                        Last: {format(new Date(loc.lastBackup), "PP")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
