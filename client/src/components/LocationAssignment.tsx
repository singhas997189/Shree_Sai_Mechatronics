import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRScanner from "./QRScanner";
import { MapPin, Scan, Package, CheckCircle } from "lucide-react";

interface LocationAssignmentProps {
  onLocationAssigned?: (result: any) => void;
}

export default function LocationAssignment({ onLocationAssigned }: LocationAssignmentProps) {
  const [productId, setProductId] = useState("");
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [showLocationScanner, setShowLocationScanner] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleProductScan = (qrData: string) => {
    setIsLoading(true);
    
    apiRequest("POST", "/api/inventory/scan-qr", { qrCode: qrData, type: "product" })
      .then(response => response.json())
      .then(data => {
        if (data.result) {
          setScannedProduct(data.result);
          setProductId(data.result.id);
          toast({
            title: "Product Scanned",
            description: `Product: ${data.result.productName} (${data.result.uniqueRepairId})`,
          });
          setShowProductScanner(false);
          setShowLocationScanner(true);
        }
      })
      .catch(() => {
        toast({
          title: "Product Scan Failed",
          description: "Could not find product for this QR code.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
        setShowProductScanner(false);
      });
  };

  const handleLocationScan = (qrData: string) => {
    if (!productId) {
      toast({
        title: "No Product Selected",
        description: "Please scan a product first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    apiRequest("POST", "/api/inventory/assign-location", {
      productId,
      locationQR: qrData,
    })
      .then(response => response.json())
      .then(data => {
        toast({
          title: "Location Assigned",
          description: `Product assigned to ${data.location.locationName}`,
        });
        
        if (onLocationAssigned) {
          onLocationAssigned(data);
        }
        
        // Reset form
        setScannedProduct(null);
        setProductId("");
        setShowLocationScanner(false);
      })
      .catch((error) => {
        toast({
          title: "Location Assignment Failed",
          description: "Could not assign location to product.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
        setShowLocationScanner(false);
      });
  };

  const startProductScan = () => {
    setShowProductScanner(true);
  };

  const startLocationScan = () => {
    if (!productId) {
      toast({
        title: "Select Product First",
        description: "Please scan or select a product before assigning location.",
        variant: "destructive",
      });
      return;
    }
    setShowLocationScanner(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-dark-charcoal">
            <MapPin className="w-5 h-5 mr-2 text-safety-orange" />
            Location Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Product Selection */}
            <div>
              <Label className="text-sm font-semibold text-dark-charcoal mb-3 block">
                Step 1: Select Product
              </Label>
              
              {scannedProduct ? (
                <div className="bg-green-50 border border-success-green rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-dark-charcoal">
                        {scannedProduct.productName}
                      </h4>
                      <p className="text-sm text-steel-gray">
                        ID: {scannedProduct.uniqueRepairId}
                      </p>
                      <p className="text-sm text-steel-gray">
                        Company: {scannedProduct.companyName}
                      </p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-success-green" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder="Enter Product ID manually (optional)"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    data-testid="input-product-id"
                  />
                  <Button
                    onClick={startProductScan}
                    variant="outline"
                    className="w-full"
                    data-testid="button-scan-product"
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    Scan Product QR Code
                  </Button>
                </div>
              )}
            </div>

            {/* Location Assignment */}
            <div>
              <Label className="text-sm font-semibold text-dark-charcoal mb-3 block">
                Step 2: Assign Shelf Location
              </Label>
              
              <Button
                onClick={startLocationScan}
                disabled={!productId || isLoading}
                className="w-full py-3 bg-safety-orange hover:bg-orange-600 text-white font-semibold"
                data-testid="button-scan-shelf-location"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Assigning Location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 mr-2" />
                    Scan Shelf Location QR
                  </>
                )}
              </Button>
              
              <p className="text-xs text-steel-gray mt-2 text-center">
                Scan the QR code stuck on a shelf/rack in the workshop
              </p>
            </div>

            {/* Reset Button */}
            {scannedProduct && (
              <Button
                onClick={() => {
                  setScannedProduct(null);
                  setProductId("");
                }}
                variant="outline"
                className="w-full"
                data-testid="button-reset-selection"
              >
                Select Different Product
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Scanner Dialog */}
      <Dialog open={showProductScanner} onOpenChange={setShowProductScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product QR Code</DialogTitle>
          </DialogHeader>
          <QRScanner
            onScanResult={handleProductScan}
            scanType="product"
            title="Scan Product QR Code"
            description="Scan the QR code attached to the product you want to assign a location to"
          />
        </DialogContent>
      </Dialog>

      {/* Location Scanner Dialog */}
      <Dialog open={showLocationScanner} onOpenChange={setShowLocationScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Shelf Location QR Code</DialogTitle>
          </DialogHeader>
          {scannedProduct && (
            <div className="mb-4 p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-dark-charcoal mb-2">
                Assigning location for:
              </h4>
              <p className="text-sm text-steel-gray">
                <strong>Product:</strong> {scannedProduct.productName}
              </p>
              <p className="text-sm text-steel-gray">
                <strong>ID:</strong> {scannedProduct.uniqueRepairId}
              </p>
            </div>
          )}
          <QRScanner
            onScanResult={handleLocationScan}
            scanType="location"
            title="Scan Shelf Location"
            description="Scan the QR code on the shelf or rack where this product will be stored"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}