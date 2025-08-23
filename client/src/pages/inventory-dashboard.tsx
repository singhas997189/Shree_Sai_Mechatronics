import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, DollarSign, Plus, Scan, FileDown, BarChart, Bell, LogOut } from "lucide-react";

export default function InventoryDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'inventory')) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, isLoading, toast]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-industrial-blue border-t-transparent rounded-full animate-spin"></div>
          <h3 className="text-lg font-bold text-dark-charcoal mb-2">Loading Dashboard...</h3>
          <p className="text-steel-gray">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-industrial-blue rounded-lg flex items-center justify-center mr-4">
                <Package className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-charcoal">Inventory Dashboard</h1>
                <p className="text-steel-gray text-sm">Manage workshop inventory and supplies</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" data-testid="button-notifications">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-steel-gray text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold text-dark-charcoal" data-testid="stat-total-items">1,247</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="text-industrial-blue w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-steel-gray text-sm font-medium">Low Stock</p>
                  <p className="text-3xl font-bold text-error-red" data-testid="stat-low-stock">23</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="text-error-red w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-steel-gray text-sm font-medium">Orders Today</p>
                  <p className="text-3xl font-bold text-success-green" data-testid="stat-orders-today">18</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-success-green w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-steel-gray text-sm font-medium">Value</p>
                  <p className="text-3xl font-bold text-dark-charcoal" data-testid="stat-total-value">₹2.4L</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="text-steel-gray w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-dark-charcoal">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="p-6 h-auto flex flex-col items-center hover:border-industrial-blue hover:bg-blue-50"
                data-testid="button-add-item"
              >
                <Plus className="text-industrial-blue w-6 h-6 mb-2" />
                <span className="font-semibold text-dark-charcoal text-sm">Add Item</span>
              </Button>

              <Button 
                variant="outline" 
                className="p-6 h-auto flex flex-col items-center hover:border-safety-orange hover:bg-orange-50"
                data-testid="button-scan-qr"
              >
                <Scan className="text-safety-orange w-6 h-6 mb-2" />
                <span className="font-semibold text-dark-charcoal text-sm">Scan QR</span>
              </Button>

              <Button 
                variant="outline" 
                className="p-6 h-auto flex flex-col items-center hover:border-success-green hover:bg-green-50"
                data-testid="button-export"
              >
                <FileDown className="text-success-green w-6 h-6 mb-2" />
                <span className="font-semibold text-dark-charcoal text-sm">Export</span>
              </Button>

              <Button 
                variant="outline" 
                className="p-6 h-auto flex flex-col items-center hover:border-steel-gray hover:bg-gray-50"
                data-testid="button-reports"
              >
                <BarChart className="text-steel-gray w-6 h-6 mb-2" />
                <span className="font-semibold text-dark-charcoal text-sm">Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
