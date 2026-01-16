import { usePreview } from "@/contexts/preview-context";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export function PreviewBanner() {
  const { preview, endPreview } = usePreview();

  if (!preview.isActive) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="font-medium">
          Preview Mode: Viewing "{preview.locationName}" as {preview.role}
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={endPreview}
        className="bg-amber-50 border-amber-700 text-amber-900 hover:bg-amber-100"
        data-testid="button-exit-preview"
      >
        <X className="w-3 h-3 mr-1" />
        Exit Preview
      </Button>
    </div>
  );
}
