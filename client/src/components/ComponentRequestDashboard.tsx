import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRScanner from "./QRScanner";
import { Package, MapPin, Hash, Scan, CheckCircle, Clock } from "lucide-react";

interface ComponentRequest {
  id: string;
  requestedQuantity: number;
  status: string;
  createdAt: string;
  product: {
    uniqueRepairId: string;
    productName: string;
  };
  component: {
    componentName: string;
    imageUrl?: string;
    shelfLocationId?: string;
  };
}

export default function ComponentRequestDashboard() {
  const [selectedRequest, setSelectedRequest] = useState<ComponentRequest | null>(null);
  const [showFulfillScanner, setShowFulfillScanner] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<ComponentRequest[]>({
    queryKey: ["/api/inventory/component-requests"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const fulfillMutation = useMutation({
    mutationFn: async ({ requestId, componentQR }: { requestId: string; componentQR: string }) => {
      const response = await apiRequest("POST", "/api/inventory/fulfill-request", {
        requestId,
        componentQR,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/component-requests"] });
      toast({
        title: "Request Fulfilled",
        description: `Component request has been successfully fulfilled.`,
      });
      setShowFulfillScanner(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fulfillment Failed",
        description: error.message || "Failed to fulfill component request.",
        variant: "destructive",
      });
    },
  });

  const handleFulfillScan = (qrData: string) => {
    if (selectedRequest) {
      fulfillMutation.mutate({
        requestId: selectedRequest.id,
        componentQR: qrData,
      });
    }
  };

  const startFulfillment = (request: ComponentRequest) => {
    setSelectedRequest(request);
    setShowFulfillScanner(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-dark-charcoal">
            <Package className="w-5 h-5 mr-2 text-industrial-blue" />
            Component Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-industrial-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-steel-gray">Loading component requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-dark-charcoal">
            <div className="flex items-center">
              <Package className="w-5 h-5 mr-2 text-industrial-blue" />
              Component Requests
            </div>
            <Badge variant="secondary" data-testid="badge-pending-requests">
              {requests.length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success-green mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-dark-charcoal mb-2">All Caught Up!</h3>
              <p className="text-steel-gray">No pending component requests at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-industrial-blue transition-colors"
                  data-testid={`request-card-${request.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Product Info */}
                      <div className="flex items-center mb-2">
                        <Hash className="w-4 h-4 text-steel-gray mr-1" />
                        <span className="font-mono text-sm font-semibold text-dark-charcoal">
                          {request.product.uniqueRepairId}
                        </span>
                        <span className="text-steel-gray text-sm ml-2">
                          ({request.product.productName})
                        </span>
                      </div>

                      {/* Component Info */}
                      <div className="flex items-center space-x-4 mb-3">
                        {request.component.imageUrl && (
                          <img
                            src={request.component.imageUrl}
                            alt={request.component.componentName}
                            className="w-12 h-12 rounded-lg object-cover border"
                            data-testid={`img-component-${request.id}`}
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-dark-charcoal">
                            {request.component.componentName}
                          </h4>
                          <p className="text-sm text-steel-gray">
                            Quantity: {request.requestedQuantity}
                          </p>
                          {request.component.shelfLocationId && (
                            <div className="flex items-center text-sm text-steel-gray mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              Shelf: {request.component.shelfLocationId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Request Time */}
                      <div className="flex items-center text-xs text-steel-gray">
                        <Clock className="w-3 h-3 mr-1" />
                        Requested: {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Fulfill Button */}
                    <Button
                      onClick={() => startFulfillment(request)}
                      disabled={fulfillMutation.isPending}
                      className="bg-success-green hover:bg-green-700 text-white font-semibold"
                      data-testid={`button-fulfill-${request.id}`}
                    >
                      {fulfillMutation.isPending && selectedRequest?.id === request.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4 mr-2" />
                          Fulfill
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fulfill Scanner Dialog */}
      <Dialog open={showFulfillScanner} onOpenChange={setShowFulfillScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Component QR Code</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-dark-charcoal mb-2">
                Fulfilling Request for:
              </h4>
              <p className="text-sm text-steel-gray">
                <strong>Product:</strong> {selectedRequest.product.uniqueRepairId}
              </p>
              <p className="text-sm text-steel-gray">
                <strong>Component:</strong> {selectedRequest.component.componentName}
              </p>
              <p className="text-sm text-steel-gray">
                <strong>Quantity:</strong> {selectedRequest.requestedQuantity}
              </p>
            </div>
          )}
          <QRScanner
            onScanResult={handleFulfillScan}
            scanType="component"
            title="Scan Component QR Code"
            description="Scan the QR code on the component to fulfill this request"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}