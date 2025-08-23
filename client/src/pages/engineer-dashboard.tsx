import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRScanner from "@/components/QRScanner";
import { 
  HardHat, 
  Scan, 
  Search, 
  Package, 
  Clock, 
  MapPin, 
  Download, 
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Image,
  LogOut
} from "lucide-react";

interface Product {
  id: string;
  uniqueRepairId: string;
  productName: string;
  companyName: string;
  problemDescription: string;
  status: string;
  estimatedCompletionTime?: number;
  reward?: number;
  schematicUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Component {
  id: string;
  componentName: string;
  stockQuantity: number;
  imageUrl?: string;
  datasheetUrl?: string;
  shelfLocationId?: string;
  qrCode: string;
}

interface ComponentRequest {
  id: string;
  requestedQuantity: number;
  status: string;
  createdAt: string;
  product: Product;
  component: Component;
}

interface ProductEvent {
  id: string;
  eventType: string;
  description: string;
  createdAt: string;
}

export default function EngineerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("scan");
  const [showProductScanner, setShowProductScanner] = useState(false);
  const [showComponentRequest, setShowComponentRequest] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestQuantity, setRequestQuantity] = useState(1);

  // Get assigned products
  const { data: assignedProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/engineer/products"],
  });

  // Get component requests
  const { data: componentRequests = [] } = useQuery<ComponentRequest[]>({
    queryKey: ["/api/engineer/component-requests"],
  });

  // Search components
  const { data: searchResults = [], isLoading: isSearching } = useQuery<Component[]>({
    queryKey: ["/api/engineer/components/search", searchQuery],
    enabled: searchQuery.length > 2,
  });

  // Product timeline query
  const { data: timeline = [] } = useQuery<ProductEvent[]>({
    queryKey: ["/api/engineer/products", selectedProduct?.id, "timeline"],
    enabled: !!selectedProduct?.id,
  });

  // Scan product mutation
  const scanProductMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const response = await apiRequest("POST", "/api/inventory/scan-qr", { qrCode: qrData, type: "product" });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.result) {
        setSelectedProduct(data.result);
        setActiveTab("details");
        toast({
          title: "Product Scanned",
          description: `Loaded details for ${data.result.productName}`,
        });
      }
      setShowProductScanner(false);
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Could not find product for this QR code.",
        variant: "destructive",
      });
      setShowProductScanner(false);
    },
  });

  // Component request mutation
  const requestComponentMutation = useMutation({
    mutationFn: async (data: { productId: string; componentId: string; requestedQuantity: number }) => {
      const response = await apiRequest("POST", "/api/inventory/request-component", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engineer/component-requests"] });
      toast({
        title: "Component Requested",
        description: "Your component request has been sent to inventory.",
      });
      setShowComponentRequest(false);
      setSelectedComponent(null);
      setRequestQuantity(1);
    },
    onError: () => {
      toast({
        title: "Request Failed",
        description: "Failed to create component request.",
        variant: "destructive",
      });
    },
  });

  // Update product status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ productId, status }: { productId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/engineer/products/${productId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engineer/products"] });
      toast({
        title: "Status Updated",
        description: "Product status has been updated.",
      });
    },
  });

  const handleProductScan = (qrData: string) => {
    scanProductMutation.mutate(qrData);
  };

  const handleRequestComponent = () => {
    if (!selectedComponent || !selectedProduct) return;
    
    requestComponentMutation.mutate({
      productId: selectedProduct.id,
      componentId: selectedComponent.id,
      requestQuantity,
    });
  };

  const openComponentRequest = (component: Component) => {
    if (!selectedProduct) {
      toast({
        title: "Select Product First",
        description: "Please scan a product before requesting components.",
        variant: "destructive",
      });
      return;
    }
    setSelectedComponent(component);
    setShowComponentRequest(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-success-green";
      case "in_progress": return "text-industrial-blue";
      case "pending": return "text-safety-orange";
      default: return "text-steel-gray";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "pending": return "outline";
      default: return "outline";
    }
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-safety-orange rounded-lg flex items-center justify-center mr-4">
                <HardHat className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-charcoal">Engineer Dashboard</h1>
                <p className="text-steel-gray text-sm">Product repairs and component management</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="scan" data-testid="tab-scan">
              <Scan className="w-4 h-4 mr-2" />
              Scan Product
            </TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-search">
              <Search className="w-4 h-4 mr-2" />
              Component Search
            </TabsTrigger>
            <TabsTrigger value="details" data-testid="tab-details">
              <FileText className="w-4 h-4 mr-2" />
              Product Details
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              <Calendar className="w-4 h-4 mr-2" />
              Task Timeline
            </TabsTrigger>
          </TabsList>

          {/* FR3.1: Product Access via QR Scan */}
          <TabsContent value="scan" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dark-charcoal">
                  <Scan className="w-5 h-5 mr-2 text-safety-orange" />
                  Scan Product QR Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-24 h-24 mx-auto mb-6 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Scan className="text-safety-orange w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-bold text-dark-charcoal mb-4">Scan Product QR Code</h3>
                  <p className="text-steel-gray mb-6">
                    Point your camera at a product QR code to view detailed information including schematics, completion time, and rewards.
                  </p>
                  <Button
                    onClick={() => setShowProductScanner(true)}
                    disabled={scanProductMutation.isPending}
                    className="bg-safety-orange hover:bg-orange-600 text-white font-semibold px-8 py-3"
                    data-testid="button-start-scan"
                  >
                    {scanProductMutation.isPending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Scan className="w-5 h-5 mr-2" />
                        Start Scanning
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FR3.2: Component Inventory Search */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dark-charcoal">
                  <Search className="w-5 h-5 mr-2 text-industrial-blue" />
                  Component Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="search" className="text-sm font-semibold text-dark-charcoal">
                      Search Components
                    </Label>
                    <Input
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for components (e.g., Arduino Nano, 10k Ohm Resistor)"
                      className="mt-1"
                      data-testid="input-component-search"
                    />
                  </div>
                  
                  {searchQuery.length > 2 && (
                    <div className="space-y-4">
                      {isSearching ? (
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-2 border-industrial-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-steel-gray">Searching components...</p>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="w-12 h-12 text-steel-gray mx-auto mb-4" />
                          <p className="text-steel-gray">No components found for "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {searchResults.map((component) => (
                            <div
                              key={component.id}
                              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-industrial-blue transition-colors"
                              data-testid={`component-card-${component.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {component.imageUrl && (
                                    <img
                                      src={component.imageUrl}
                                      alt={component.componentName}
                                      className="w-16 h-16 rounded-lg object-cover border mb-3"
                                      data-testid={`img-component-${component.id}`}
                                    />
                                  )}
                                  <h4 className="font-semibold text-dark-charcoal mb-2">
                                    {component.componentName}
                                  </h4>
                                  <div className="space-y-1 text-sm text-steel-gray mb-3">
                                    <div className="flex items-center">
                                      <Package className="w-3 h-3 mr-1" />
                                      Stock: {component.stockQuantity} available
                                    </div>
                                    {component.shelfLocationId && (
                                      <div className="flex items-center">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        Shelf: {component.shelfLocationId}
                                      </div>
                                    )}
                                  </div>
                                  {component.datasheetUrl && (
                                    <Button
                                      onClick={() => window.open(component.datasheetUrl, '_blank')}
                                      variant="outline"
                                      size="sm"
                                      className="mb-3"
                                      data-testid={`button-datasheet-${component.id}`}
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Datasheet
                                    </Button>
                                  )}
                                </div>
                                <Button
                                  onClick={() => openComponentRequest(component)}
                                  disabled={component.stockQuantity === 0}
                                  className="bg-industrial-blue hover:bg-blue-700 text-white"
                                  data-testid={`button-request-${component.id}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Details */}
          <TabsContent value="details">
            {selectedProduct ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-dark-charcoal">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-industrial-blue" />
                        Product Details
                      </div>
                      <Badge variant={getStatusBadgeVariant(selectedProduct.status)}>
                        {selectedProduct.status.charAt(0).toUpperCase() + selectedProduct.status.slice(1)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-semibold text-dark-charcoal">Product ID</Label>
                          <p className="font-mono text-lg font-bold text-industrial-blue">
                            {selectedProduct.uniqueRepairId}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-dark-charcoal">Company Name</Label>
                          <p className="text-dark-charcoal">{selectedProduct.companyName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-dark-charcoal">Product Name</Label>
                          <p className="text-dark-charcoal">{selectedProduct.productName}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-semibold text-dark-charcoal">Problem Description</Label>
                          <Textarea
                            value={selectedProduct.problemDescription}
                            readOnly
                            className="bg-gray-50"
                            rows={4}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {selectedProduct.estimatedCompletionTime && (
                          <div>
                            <Label className="text-sm font-semibold text-dark-charcoal">Estimated Completion</Label>
                            <div className="flex items-center text-safety-orange">
                              <Clock className="w-4 h-4 mr-2" />
                              {selectedProduct.estimatedCompletionTime} hours
                            </div>
                          </div>
                        )}
                        
                        {selectedProduct.reward && (
                          <div>
                            <Label className="text-sm font-semibold text-dark-charcoal">Reward</Label>
                            <p className="text-success-green font-bold">₹{selectedProduct.reward}</p>
                          </div>
                        )}
                        
                        {selectedProduct.schematicUrl && (
                          <div>
                            <Label className="text-sm font-semibold text-dark-charcoal">Schematic Diagrams</Label>
                            <Button
                              onClick={() => window.open(selectedProduct.schematicUrl, '_blank')}
                              variant="outline"
                              className="w-full justify-start"
                              data-testid="button-download-schematic"
                            >
                              <Image className="w-4 h-4 mr-2" />
                              Download Schematic Files
                            </Button>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-dark-charcoal">Update Status</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              onClick={() => updateStatusMutation.mutate({ productId: selectedProduct.id, status: "pending" })}
                              variant={selectedProduct.status === "pending" ? "default" : "outline"}
                              size="sm"
                              disabled={updateStatusMutation.isPending}
                              data-testid="button-status-pending"
                            >
                              Pending
                            </Button>
                            <Button
                              onClick={() => updateStatusMutation.mutate({ productId: selectedProduct.id, status: "in_progress" })}
                              variant={selectedProduct.status === "in_progress" ? "default" : "outline"}
                              size="sm"
                              disabled={updateStatusMutation.isPending}
                              data-testid="button-status-in-progress"
                            >
                              In Progress
                            </Button>
                            <Button
                              onClick={() => updateStatusMutation.mutate({ productId: selectedProduct.id, status: "completed" })}
                              variant={selectedProduct.status === "completed" ? "default" : "outline"}
                              size="sm"
                              disabled={updateStatusMutation.isPending}
                              data-testid="button-status-completed"
                            >
                              Completed
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-16 h-16 text-steel-gray mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-dark-charcoal mb-2">No Product Selected</h3>
                  <p className="text-steel-gray mb-4">Scan a product QR code to view detailed information.</p>
                  <Button onClick={() => setActiveTab("scan")} data-testid="button-go-to-scan">
                    <Scan className="w-4 h-4 mr-2" />
                    Go to Scanner
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FR3.4: Task Timeline */}
          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dark-charcoal">
                  <Calendar className="w-5 h-5 mr-2 text-steel-gray" />
                  My Assigned Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignedProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-steel-gray mx-auto mb-4" />
                    <p className="text-steel-gray">No products assigned to you yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-industrial-blue transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(product);
                          setActiveTab("details");
                        }}
                        data-testid={`product-timeline-${product.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <span className="font-mono font-bold text-industrial-blue mr-3">
                              {product.uniqueRepairId}
                            </span>
                            <h4 className="font-semibold text-dark-charcoal">
                              {product.productName}
                            </h4>
                          </div>
                          <Badge variant={getStatusBadgeVariant(product.status)}>
                            {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-steel-gray text-sm mb-3">{product.companyName}</p>
                        <div className="flex items-center justify-between text-xs text-steel-gray">
                          <span>Received: {new Date(product.createdAt).toLocaleDateString()}</span>
                          <span>Last updated: {new Date(product.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Component Requests History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dark-charcoal">
                  <Package className="w-5 h-5 mr-2 text-success-green" />
                  My Component Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                {componentRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-steel-gray mx-auto mb-4" />
                    <p className="text-steel-gray">No component requests made yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {componentRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                        data-testid={`request-history-${request.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-dark-charcoal">
                            {request.component.componentName}
                          </h4>
                          <Badge variant={request.status === "fulfilled" ? "default" : "outline"}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-sm text-steel-gray space-y-1">
                          <p>For product: {request.product.uniqueRepairId}</p>
                          <p>Quantity: {request.requestedQuantity}</p>
                          <p>Requested: {new Date(request.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* QR Scanner Dialog */}
      <Dialog open={showProductScanner} onOpenChange={setShowProductScanner}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Product QR Code</DialogTitle>
          </DialogHeader>
          <QRScanner
            onScanResult={handleProductScan}
            scanType="product"
            title="Scan Product QR Code"
            description="Point your camera at the product's QR code to load detailed information"
          />
        </DialogContent>
      </Dialog>

      {/* FR3.3: Component Request Modal */}
      <Dialog open={showComponentRequest} onOpenChange={setShowComponentRequest}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Component</DialogTitle>
          </DialogHeader>
          {selectedComponent && selectedProduct && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-industrial-blue rounded-lg p-4">
                <h4 className="font-semibold text-dark-charcoal mb-2">Component Details</h4>
                <p className="text-sm text-steel-gray">
                  <strong>Name:</strong> {selectedComponent.componentName}
                </p>
                <p className="text-sm text-steel-gray">
                  <strong>Available Stock:</strong> {selectedComponent.stockQuantity}
                </p>
                <p className="text-sm text-steel-gray">
                  <strong>For Product:</strong> {selectedProduct.uniqueRepairId}
                </p>
              </div>
              
              <div>
                <Label htmlFor="quantity" className="text-sm font-semibold text-dark-charcoal">
                  Quantity Needed
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedComponent.stockQuantity}
                  value={requestQuantity}
                  onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1"
                  data-testid="input-request-quantity"
                />
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowComponentRequest(false)}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-cancel-request"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestComponent}
                  disabled={requestComponentMutation.isPending}
                  className="flex-1 bg-industrial-blue hover:bg-blue-700 text-white"
                  data-testid="button-confirm-request"
                >
                  {requestComponentMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Requesting...
                    </>
                  ) : (
                    "Send Request"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}