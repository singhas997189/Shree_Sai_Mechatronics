import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Package, HardHat, Shield, ChevronRight } from "lucide-react";

interface Role {
  id: "inventory" | "engineer" | "admin";
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  hoverColor: string;
}

const roles: Role[] = [
  {
    id: "inventory",
    title: "Inventory Manager",
    description: "Manage stock, orders, and supplies",
    icon: Package,
    color: "text-industrial-blue",
    bgColor: "bg-blue-100",
    hoverColor: "hover:border-industrial-blue hover:bg-blue-50",
  },
  {
    id: "engineer",
    title: "Engineer",
    description: "Access machinery and production tools",
    icon: HardHat,
    color: "text-safety-orange",
    bgColor: "bg-orange-100",
    hoverColor: "hover:border-safety-orange hover:bg-orange-50",
  },
  {
    id: "admin",
    title: "Administrator",
    description: "Full system access and user management",
    icon: Shield,
    color: "text-success-green",
    bgColor: "bg-green-100",
    hoverColor: "hover:border-success-green hover:bg-green-50",
  },
];

export default function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await apiRequest("POST", "/api/users/update-role", { role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role Updated",
        description: "Your role has been updated successfully.",
      });
      // Redirect to the selected role dashboard
      if (selectedRole) {
        window.location.href = `/${selectedRole}`;
      }
    },
    onError: (error) => {
      toast({
        title: "Role Update Failed",
        description: error.message || "Failed to update your role.",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    updateRoleMutation.mutate(roleId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-success-green rounded-2xl flex items-center justify-center">
              <CheckCircle className="text-white w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-dark-charcoal mb-2">Authentication Successful</h3>
            <p className="text-steel-gray">Select your role to continue</p>
          </div>

          {/* Role Options */}
          <div className="space-y-4">
            {roles.map((role) => {
              const IconComponent = role.icon;
              const isSelected = selectedRole === role.id;
              const isLoading = updateRoleMutation.isPending && selectedRole === role.id;
              
              return (
                <Button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  disabled={updateRoleMutation.isPending}
                  variant="outline"
                  className={`w-full p-6 border-2 border-gray-200 rounded-xl ${role.hoverColor} transition-all text-left group h-auto justify-start ${
                    isSelected ? "opacity-75" : ""
                  }`}
                  data-testid={`button-role-${role.id}`}
                >
                  <div className="flex items-center w-full">
                    <div className={`w-12 h-12 ${role.bgColor} rounded-xl flex items-center justify-center group-hover:bg-opacity-100 transition-all mr-4`}>
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <IconComponent className={`w-6 h-6 ${role.color}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-dark-charcoal text-lg">{role.title}</h4>
                      <p className="text-steel-gray text-sm">{role.description}</p>
                    </div>
                    <ChevronRight className="text-gray-400 w-5 h-5 ml-auto" />
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
