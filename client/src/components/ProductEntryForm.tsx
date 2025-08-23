import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRScanner from "./QRScanner";
import { Package, QrCode, Scan, Check } from "lucide-react";

const productSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  companyName: z.string().min(1, "Company name is required"),
  problemDescription: z.string().min(1, "Problem description is required"),
  isRepeatedItem: z.boolean().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductEntryFormProps {
  onProductCreated?: (product: any) => void;
}

export default function ProductEntryForm({ onProductCreated }: ProductEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [showQRResult, setShowQRResult] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productName: "",
      companyName: "",
      problemDescription: "",
      isRepeatedItem: false,
    },
  });

  const isRepeatedItem = watch("isRepeatedItem");

  const handleQRScan = (qrData: string) => {
    // Process QR scan to auto-fill product details
    apiRequest("POST", "/api/inventory/scan-qr", { qrCode: qrData, type: "product" })
      .then(response => response.json())
      .then(data => {
        if (data.result) {
          setValue("productName", data.result.productName || "");
          setValue("companyName", data.result.companyName || "");
          toast({
            title: "Product Details Loaded",
            description: "Product information has been auto-filled from QR code.",
          });
        }
        setShowQRScanner(false);
      })
      .catch(() => {
        toast({
          title: "QR Scan Failed",
          description: "Could not find product details for this QR code.",
          variant: "destructive",
        });
        setShowQRScanner(false);
      });
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/inventory/products", data);
      const result = await response.json();
      
      setGeneratedQR(result.qrCode);
      setShowQRResult(true);
      
      toast({
        title: "Product Created Successfully",
        description: `Unique ID: ${result.product.uniqueRepairId}`,
      });
      
      if (onProductCreated) {
        onProductCreated(result.product);
      }
      
      reset();
    } catch (error) {
      toast({
        title: "Product Creation Failed",
        description: "Failed to create product entry.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-dark-charcoal">
            <Package className="w-5 h-5 mr-2 text-industrial-blue" />
            New Product Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Name */}
            <div>
              <Label htmlFor="productName" className="text-sm font-semibold text-dark-charcoal">
                Product Name
              </Label>
              <Input
                id="productName"
                {...register("productName")}
                className="mt-1"
                placeholder="Enter product name"
                data-testid="input-product-name"
              />
              {errors.productName && (
                <div className="text-error-red text-sm mt-1" data-testid="error-product-name">
                  {errors.productName.message}
                </div>
              )}
            </div>

            {/* Company Name */}
            <div>
              <Label htmlFor="companyName" className="text-sm font-semibold text-dark-charcoal">
                Company Name
              </Label>
              <Input
                id="companyName"
                {...register("companyName")}
                className="mt-1"
                placeholder="Enter company name"
                data-testid="input-company-name"
              />
              {errors.companyName && (
                <div className="text-error-red text-sm mt-1" data-testid="error-company-name">
                  {errors.companyName.message}
                </div>
              )}
            </div>

            {/* Problem Description */}
            <div>
              <Label htmlFor="problemDescription" className="text-sm font-semibold text-dark-charcoal">
                Problem Description
              </Label>
              <Textarea
                id="problemDescription"
                {...register("problemDescription")}
                className="mt-1"
                placeholder="Describe the problem or repair needed"
                rows={3}
                data-testid="input-problem-description"
              />
              {errors.problemDescription && (
                <div className="text-error-red text-sm mt-1" data-testid="error-problem-description">
                  {errors.problemDescription.message}
                </div>
              )}
            </div>

            {/* Repeated Item Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRepeatedItem"
                {...register("isRepeatedItem")}
                data-testid="checkbox-repeated-item"
              />
              <Label htmlFor="isRepeatedItem" className="text-sm font-medium text-steel-gray">
                Is this a repeated item?
              </Label>
            </div>

            {/* QR Scanner for Repeated Items */}
            {isRepeatedItem && (
              <div className="bg-blue-50 border border-industrial-blue rounded-lg p-4">
                <p className="text-steel-gray text-sm mb-3">
                  Scan the existing product's QR code to auto-fill details
                </p>
                <Button
                  type="button"
                  onClick={() => setShowQRScanner(true)}
                  variant="outline"
                  className="w-full"
                  data-testid="button-scan-existing-product"
                >
                  <Scan className="w-4 h-4 mr-2" />
                  Scan Existing Product QR
                </Button>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-industrial-blue hover:bg-blue-700 text-white font-semibold"
              data-testid="button-create-product"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Product...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5 mr-2" />
                  Create Product Entry
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* QR Scanner Dialog */}
      <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Existing Product</DialogTitle>
          </DialogHeader>
          <QRScanner
            onScanResult={handleQRScan}
            scanType="product"
            title="Scan Product QR Code"
            description="Scan the QR code of an existing product to auto-fill details"
          />
        </DialogContent>
      </Dialog>

      {/* QR Result Dialog */}
      <Dialog open={showQRResult} onOpenChange={setShowQRResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Check className="w-5 h-5 mr-2 text-success-green" />
              Product Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-success-green rounded-2xl flex items-center justify-center">
              <QrCode className="text-white w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-dark-charcoal mb-4">QR Code Generated</h3>
            {generatedQR && (
              <div className="bg-white p-4 border rounded-lg mb-4">
                <img 
                  src={generatedQR} 
                  alt="Product QR Code" 
                  className="w-48 h-48 mx-auto"
                  data-testid="img-generated-qr-code"
                />
              </div>
            )}
            <p className="text-steel-gray text-sm mb-4">
              Print this QR code and attach it to the physical product for tracking.
            </p>
            <Button
              onClick={() => setShowQRResult(false)}
              className="w-full"
              data-testid="button-close-qr-result"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}