import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardHat, Settings, Play, Wrench, Scan, ClipboardList, Bolt, LogOut } from "lucide-react";

export default function EngineerDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'engineer')) {
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
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-safety-orange border-t-transparent rounded-full animate-spin"></div>
          <h3 className="text-lg font-bold text-dark-charcoal mb-2">Loading Dashboard...</h3>
          <p className="text-steel-gray">Please wait...</p>
        </div>
      </div>
    );
  }

  const machines = [
    { name: "CNC Machine #1", status: "Running - 87% efficiency", statusColor: "text-success-green", icon: "bg-success-green" },
    { name: "Lathe Machine #2", status: "Maintenance Required", statusColor: "text-yellow-500", icon: "bg-yellow-500" },
    { name: "Assembly Line A", status: "Operational - 94% efficiency", statusColor: "text-success-green", icon: "bg-success-green" },
  ];

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
                <p className="text-steel-gray text-sm">Production tools and machinery control</p>
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
        {/* Machine Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Machine Status */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-dark-charcoal">Machine Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {machines.map((machine, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl" data-testid={`machine-status-${index}`}>
                    <div className="flex items-center">
                      <div className={`w-3 h-3 ${machine.icon} rounded-full mr-3`}></div>
                      <div>
                        <p className="font-semibold text-dark-charcoal">{machine.name}</p>
                        <p className={`text-sm ${machine.statusColor}`}>{machine.status}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid={`button-machine-control-${index}`}>
                      {machine.status.includes("Maintenance") ? (
                        <Wrench className="w-4 h-4" />
                      ) : (
                        <Settings className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Engineering Bolt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-dark-charcoal">Engineering Bolt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full p-4 bg-safety-orange hover:bg-orange-600 text-white font-semibold justify-start"
                  data-testid="button-scan-equipment"
                >
                  <Scan className="w-5 h-5 mr-3" />
                  Scan Equipment
                </Button>
                <Button 
                  className="w-full p-4 bg-industrial-blue hover:bg-blue-700 text-white font-semibold justify-start"
                  data-testid="button-work-orders"
                >
                  <ClipboardList className="w-5 h-5 mr-3" />
                  Work Orders
                </Button>
                <Button 
                  className="w-full p-4 bg-success-green hover:bg-green-700 text-white font-semibold justify-start"
                  data-testid="button-maintenance"
                >
                  <Bolt className="w-5 h-5 mr-3" />
                  Maintenance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
