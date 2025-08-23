import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import QRScanner from "@/components/QRScanner";
import { 
  Shield, 
  Users, 
  UserPlus, 
  Settings, 
  BarChart3, 
  Activity,
  QrCode,
  Package,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  LogOut
} from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

interface SystemAnalytics {
  totalProducts: number;
  totalUsers: number;
  completedRepairs: number;
  pendingRequests: number;
}

interface ActivityLog {
  id: string;
  action: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  createdAt: string;
}

interface RolePermission {
  id: string;
  role: string;
  permission: string;
  enabled: boolean;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showUserForm, setShowUserForm] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "engineer" as "inventory" | "engineer" | "admin",
  });

  // Fetch all users
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch system analytics
  const { data: analytics } = useQuery<SystemAnalytics>({
    queryKey: ["/api/admin/analytics"],
  });

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity"],
  });

  // Fetch role permissions
  const { data: rolePermissions = [] } = useQuery<RolePermission[]>({
    queryKey: ["/api/admin/roles", "engineer", "permissions"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const response = await apiRequest("POST", "/api/admin/users", userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
      toast({
        title: "User Created",
        description: "New user has been successfully created.",
      });
      setShowUserForm(false);
      resetUserForm();
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create new user.",
        variant: "destructive",
      });
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await apiRequest("POST", "/api/users/update-role", { userId, role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  // Deactivate user mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Deactivated",
        description: "User has been successfully deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Deactivation Failed",
        description: "Failed to deactivate user.",
        variant: "destructive",
      });
    },
  });

  // Generate QR token mutation
  const generateQRMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await apiRequest("POST", "/api/auth/generate-qr", { targetUserId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "QR Token Generated",
        description: "QR login token has been generated successfully.",
      });
      // You could display the QR code here
    },
    onError: () => {
      toast({
        title: "QR Generation Failed",
        description: "Failed to generate QR login token.",
        variant: "destructive",
      });
    },
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ role, permission, enabled }: { role: string; permission: string; enabled: boolean }) => {
      const response = await apiRequest("PUT", `/api/admin/roles/${role}/permissions`, { permission, enabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({
        title: "Permission Updated",
        description: "Role permission has been successfully updated.",
      });
    },
  });

  const resetUserForm = () => {
    setNewUserData({
      email: "",
      firstName: "",
      lastName: "",
      role: "engineer",
    });
  };

  const handleCreateUser = () => {
    if (!newUserData.email || !newUserData.firstName || !newUserData.lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUserData);
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "inventory": return "default";
      case "engineer": return "secondary";
      default: return "outline";
    }
  };

  const exportUserData = () => {
    const csvData = allUsers.map(u => ({
      Email: u.email,
      Name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      Role: u.role || 'N/A',
      Created: new Date(u.createdAt).toLocaleDateString(),
    }));
    
    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="permissions" data-testid="tab-permissions">
              <Settings className="w-4 h-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="w-4 h-4 mr-2" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          {/* FR4.3: System Oversight */}
          <TabsContent value="overview" className="space-y-6">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-steel-gray text-sm font-medium">Total Products</p>
                      <p className="text-3xl font-bold text-dark-charcoal" data-testid="stat-total-products">
                        {analytics?.totalProducts || 0}
                      </p>
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
                      <p className="text-steel-gray text-sm font-medium">Total Users</p>
                      <p className="text-3xl font-bold text-dark-charcoal" data-testid="stat-total-users">
                        {analytics?.totalUsers || 0}
                      </p>
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
                      <p className="text-steel-gray text-sm font-medium">Completed Repairs</p>
                      <p className="text-3xl font-bold text-success-green" data-testid="stat-completed-repairs">
                        {analytics?.completedRepairs || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="text-success-green w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-steel-gray text-sm font-medium">Pending Requests</p>
                      <p className="text-3xl font-bold text-safety-orange" data-testid="stat-pending-requests">
                        {analytics?.pendingRequests || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Clock className="text-safety-orange w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-dark-charcoal">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button
                    onClick={() => setShowUserForm(true)}
                    className="p-6 h-auto flex flex-col items-center bg-industrial-blue hover:bg-blue-700 text-white"
                    data-testid="button-quick-add-user"
                  >
                    <UserPlus className="w-6 h-6 mb-2" />
                    <span className="font-semibold text-sm">Add User</span>
                  </Button>

                  <Button
                    onClick={() => setShowQRGenerator(true)}
                    className="p-6 h-auto flex flex-col items-center bg-safety-orange hover:bg-orange-600 text-white"
                    data-testid="button-quick-generate-qr"
                  >
                    <QrCode className="w-6 h-6 mb-2" />
                    <span className="font-semibold text-sm">Generate QR</span>
                  </Button>

                  <Button
                    onClick={exportUserData}
                    className="p-6 h-auto flex flex-col items-center bg-success-green hover:bg-green-700 text-white"
                    data-testid="button-quick-export"
                  >
                    <Download className="w-6 h-6 mb-2" />
                    <span className="font-semibold text-sm">Export Data</span>
                  </Button>

                  <Button
                    onClick={() => setActiveTab("activity")}
                    className="p-6 h-auto flex flex-col items-center bg-steel-gray hover:bg-gray-700 text-white"
                    data-testid="button-quick-view-logs"
                  >
                    <Activity className="w-6 h-6 mb-2" />
                    <span className="font-semibold text-sm">View Logs</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-dark-charcoal">
                  Recent System Activity
                  <Button
                    onClick={() => setActiveTab("activity")}
                    variant="outline"
                    size="sm"
                    data-testid="button-view-all-activity"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-semibold text-dark-charcoal text-sm">{log.action.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-steel-gray text-xs">{log.description || 'No description'}</p>
                      </div>
                      <span className="text-xs text-steel-gray">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p className="text-steel-gray text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FR4.1: User Management */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-dark-charcoal">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-industrial-blue" />
                    User Management
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={exportUserData}
                      variant="outline"
                      size="sm"
                      data-testid="button-export-users"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      onClick={() => setShowUserForm(true)}
                      className="bg-industrial-blue hover:bg-blue-700 text-white"
                      data-testid="button-add-new-user"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allUsers.map((user) => (
                    <div
                      key={user.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-industrial-blue transition-colors"
                      data-testid={`user-card-${user.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-dark-charcoal">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email
                              }
                            </h4>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              {user.role || 'No Role'}
                            </Badge>
                          </div>
                          <p className="text-steel-gray text-sm">{user.email}</p>
                          <p className="text-steel-gray text-xs">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={user.role || ""}
                            onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="inventory">Inventory</SelectItem>
                              <SelectItem value="engineer">Engineer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => generateQRMutation.mutate(user.id)}
                            variant="outline"
                            size="sm"
                            disabled={generateQRMutation.isPending}
                            data-testid={`button-qr-${user.id}`}
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => deactivateUserMutation.mutate(user.id)}
                            variant="outline"
                            size="sm"
                            disabled={deactivateUserMutation.isPending || user.id === user?.id}
                            data-testid={`button-deactivate-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-error-red" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {allUsers.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-steel-gray mx-auto mb-4" />
                      <p className="text-steel-gray">No users found.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FR4.2: Role & Access Management */}
          <TabsContent value="permissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dark-charcoal">
                  <Settings className="w-5 h-5 mr-2 text-success-green" />
                  Role & Access Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-dark-charcoal mb-4">Engineer Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="can-request-components" className="font-medium text-dark-charcoal">
                            Can Request Components
                          </Label>
                          <p className="text-sm text-steel-gray">Allow engineers to request components from inventory</p>
                        </div>
                        <Switch
                          id="can-request-components"
                          defaultChecked={true}
                          onCheckedChange={(enabled) => 
                            updatePermissionMutation.mutate({ 
                              role: "engineer", 
                              permission: "can_request_components", 
                              enabled 
                            })
                          }
                          data-testid="switch-request-components"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="can-update-status" className="font-medium text-dark-charcoal">
                            Can Update Product Status
                          </Label>
                          <p className="text-sm text-steel-gray">Allow engineers to update repair status</p>
                        </div>
                        <Switch
                          id="can-update-status"
                          defaultChecked={true}
                          onCheckedChange={(enabled) => 
                            updatePermissionMutation.mutate({ 
                              role: "engineer", 
                              permission: "can_update_status", 
                              enabled 
                            })
                          }
                          data-testid="switch-update-status"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="can-view-schematics" className="font-medium text-dark-charcoal">
                            Can View Schematics
                          </Label>
                          <p className="text-sm text-steel-gray">Allow engineers to download schematic files</p>
                        </div>
                        <Switch
                          id="can-view-schematics"
                          defaultChecked={true}
                          onCheckedChange={(enabled) => 
                            updatePermissionMutation.mutate({ 
                              role: "engineer", 
                              permission: "can_view_schematics", 
                              enabled 
                            })
                          }
                          data-testid="switch-view-schematics"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="can-scan-products" className="font-medium text-dark-charcoal">
                            Can Scan Products
                          </Label>
                          <p className="text-sm text-steel-gray">Allow engineers to scan product QR codes</p>
                        </div>
                        <Switch
                          id="can-scan-products"
                          defaultChecked={true}
                          onCheckedChange={(enabled) => 
                            updatePermissionMutation.mutate({ 
                              role: "engineer", 
                              permission: "can_scan_products", 
                              enabled 
                            })
                          }
                          data-testid="switch-scan-products"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-dark-charcoal mb-4">Inventory Permissions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="can-create-products" className="font-medium text-dark-charcoal">
                            Can Create Products
                          </Label>
                          <p className="text-sm text-steel-gray">Allow inventory staff to create new product entries</p>
                        </div>
                        <Switch
                          id="can-create-products"
                          defaultChecked={true}
                          onCheckedChange={(enabled) => 
                            updatePermissionMutation.mutate({ 
                              role: "inventory", 
                              permission: "can_create_products", 
                              enabled 
                            })
                          }
                          data-testid="switch-create-products"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <Label htmlFor="can-fulfill-requests" className="font-medium text-dark-charcoal">
                            Can Fulfill Requests
                          </Label>
                          <p className="text-sm text-steel-gray">Allow inventory staff to fulfill component requests</p>
                        </div>
                        <Switch
                          id="can-fulfill-requests"
                          defaultChecked={true}
                          onCheckedChange={(enabled) => 
                            updatePermissionMutation.mutate({ 
                              role: "inventory", 
                              permission: "can_fulfill_requests", 
                              enabled 
                            })
                          }
                          data-testid="switch-fulfill-requests"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-dark-charcoal">
                  <Activity className="w-5 h-5 mr-2 text-steel-gray" />
                  System Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                      data-testid={`activity-log-${log.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-dark-charcoal">
                            {log.action.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {log.entityType && (
                            <Badge variant="outline" className="text-xs">
                              {log.entityType}
                            </Badge>
                          )}
                        </div>
                        <p className="text-steel-gray text-sm">{log.description || 'No description available'}</p>
                        {log.entityId && (
                          <p className="text-steel-gray text-xs mt-1">Entity ID: {log.entityId}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-steel-gray text-xs">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-steel-gray text-xs">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-steel-gray mx-auto mb-4" />
                      <p className="text-steel-gray">No activity logs available.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Add User Dialog */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-dark-charcoal">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
                className="mt-1"
                data-testid="input-new-user-email"
              />
            </div>
            
            <div>
              <Label htmlFor="firstName" className="text-sm font-semibold text-dark-charcoal">
                First Name *
              </Label>
              <Input
                id="firstName"
                value={newUserData.firstName}
                onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
                className="mt-1"
                data-testid="input-new-user-first-name"
              />
            </div>
            
            <div>
              <Label htmlFor="lastName" className="text-sm font-semibold text-dark-charcoal">
                Last Name *
              </Label>
              <Input
                id="lastName"
                value={newUserData.lastName}
                onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Doe"
                className="mt-1"
                data-testid="input-new-user-last-name"
              />
            </div>
            
            <div>
              <Label htmlFor="role" className="text-sm font-semibold text-dark-charcoal">
                Role *
              </Label>
              <Select
                value={newUserData.role}
                onValueChange={(role: "inventory" | "engineer" | "admin") => 
                  setNewUserData(prev => ({ ...prev, role }))
                }
              >
                <SelectTrigger className="mt-1" data-testid="select-new-user-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="engineer">Engineer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => setShowUserForm(false)}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel-user-creation"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
                className="flex-1 bg-industrial-blue hover:bg-blue-700 text-white"
                data-testid="button-create-user"
              >
                {createUserMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Generator Dialog */}
      <Dialog open={showQRGenerator} onOpenChange={setShowQRGenerator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate QR Login Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-steel-gray text-sm">
              Select a user to generate a QR login code for quick workshop floor access.
            </p>
            <Select onValueChange={(userId) => generateQRMutation.mutate(userId)}>
              <SelectTrigger data-testid="select-qr-user">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.filter(u => u.role === 'engineer').map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}` 
                      : user.email
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}