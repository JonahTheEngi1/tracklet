import type { RecipientSummary } from "@shared/schema";
import { format } from "date-fns";

interface PrintViewProps {
  summary: RecipientSummary;
  locationName: string;
  pricingEnabled: boolean;
}

export function PrintView({ summary, locationName, pricingEnabled }: PrintViewProps) {
  return (
    <div className="print-view p-8 bg-white text-black min-h-screen">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-view, .print-view * {
            visibility: visible;
          }
          .print-view {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      
      <div className="max-w-3xl mx-auto">
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Tracklet</h1>
              <p className="text-sm text-gray-600">{locationName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Date Printed</p>
              <p className="font-medium">{format(new Date(), "MMMM d, yyyy")}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Package Summary</h2>
          <p className="text-lg">
            Recipient: <span className="font-bold">{summary.recipientName}</span>
          </p>
          <p>Total Packages: {summary.totalPackages}</p>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 pr-4">Tracking Number</th>
              <th className="text-left py-2 pr-4">Weight (lbs)</th>
              <th className="text-left py-2 pr-4">Storage</th>
              {pricingEnabled && <th className="text-right py-2">Cost</th>}
            </tr>
          </thead>
          <tbody>
            {summary.packages.map((pkg, index) => (
              <tr key={pkg.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                <td className="py-2 pr-4 font-mono text-sm">{pkg.trackingNumber}</td>
                <td className="py-2 pr-4">{pkg.weight}</td>
                <td className="py-2 pr-4">{pkg.storageLocation?.name || "-"}</td>
                {pricingEnabled && (
                  <td className="py-2 text-right">${(pkg.calculatedCost || 0).toFixed(2)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {pricingEnabled && (
          <div className="border-t-2 border-black pt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Amount Due</p>
              <p className="text-2xl font-bold">${summary.totalCost.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="mt-12 pt-4 border-t text-center text-sm text-gray-500">
          <p>Thank you for using Tracklet</p>
        </div>
      </div>
    </div>
  );
}
