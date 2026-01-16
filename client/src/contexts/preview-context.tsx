import { createContext, useContext, useState, useCallback } from "react";
import { useLocation } from "wouter";

interface PreviewState {
  isActive: boolean;
  locationId: string | null;
  locationName: string | null;
  role: "manager" | "employee" | null;
  returnPath: string | null;
}

interface PreviewContextType {
  preview: PreviewState;
  startPreview: (locationId: string, locationName: string, role: "manager" | "employee") => void;
  endPreview: () => void;
}

const PreviewContext = createContext<PreviewContextType | null>(null);

export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [preview, setPreview] = useState<PreviewState>({
    isActive: false,
    locationId: null,
    locationName: null,
    role: null,
    returnPath: null,
  });

  const startPreview = useCallback((locationId: string, locationName: string, role: "manager" | "employee") => {
    setPreview({
      isActive: true,
      locationId,
      locationName,
      role,
      returnPath: location,
    });
    setLocation("/");
  }, [location, setLocation]);

  const endPreview = useCallback(() => {
    const returnTo = preview.returnPath || "/admin/locations";
    setPreview({
      isActive: false,
      locationId: null,
      locationName: null,
      role: null,
      returnPath: null,
    });
    setLocation(returnTo);
  }, [preview.returnPath, setLocation]);

  return (
    <PreviewContext.Provider value={{ preview, startPreview, endPreview }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) {
    throw new Error("usePreview must be used within a PreviewProvider");
  }
  return context;
}
