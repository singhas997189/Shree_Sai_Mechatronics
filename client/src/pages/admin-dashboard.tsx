import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Heart, UserPlus, Settings as SettingsIcon, Database, ShieldCheck, TrendingUp, LogOut } from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
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
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-success-green border-t-transparent rounded-full animate-spin"></div>
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
              <div className="w-10 h-10 bg-success-green rounded-lg flex items-center justify-center mr-4">
                <Shield className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-charcoal">Admin Dashboard</h1>
                <p className="text-steel-gray text-sm">System administration and user management</p>
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
        {/* Admin Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-steel-gray text-sm font-medium">Active Users</p>
                  <p className="text-3xl font-bold text-dark-charcoal" data-testid="stat-active-users">42</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="text-success-green w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-steel-gray text-sm font-medium">System Health</p>
                  <p className="text-3xl font-bold text-success-green" data-testid="stat-system-health">98%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Heart className="text-success-green w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-steel-gray text-sm font-medium">QR Logins Today</p>
                  <p className="text-3xl font-bold text-safety-orange" data-testid="stat-qr-logins">156</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="text-safety-orange w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM19 15h2v2h-2zM17 13h2v2h-2z"/>
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-dark-charcoal">User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full p-4 bg-industrial-blue hover:bg-blue-700 text-white font-semibold justify-start"
                  data-testid="button-add-user"
                >
                  <UserPlus className="w-5 h-5 mr-3" />
                  Add New User
                </Button>
                <Button 
                  className="w-full p-4 bg-safety-orange hover:bg-orange-600 text-white font-semibold justify-start"
                  data-testid="button-generate-qr"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM19 15h2v2h-2zM17 13h2v2h-2z"/>
                  </svg>
                  Generate QR Codes
                </Button>
                <Button 
                  className="w-full p-4 bg-success-green hover:bg-green-700 text-white font-semibold justify-start"
                  data-testid="button-manage-permissions"
                >
                  <SettingsIcon className="w-5 h-5 mr-3" />
                  Manage Permissions
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-dark-charcoal">System Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full p-4 bg-steel-gray hover:bg-gray-700 text-white font-semibold justify-start"
                  data-testid="button-backup-system"
                >
                  <Database className="w-5 h-5 mr-3" />
                  Backup System
                </Button>
                <Button 
                  className="w-full p-4 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold justify-start"
                  data-testid="button-security-audit"
                >
                  <ShieldCheck className="w-5 h-5 mr-3" />
                  Security Audit
                </Button>
                <Button 
                  className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold justify-start"
                  data-testid="button-analytics"
                >
                  <TrendingUp className="w-5 h-5 mr-3" />
                  Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
