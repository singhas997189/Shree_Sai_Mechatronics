import { useAuth } from "@/hooks/useAuth";
import RoleSelector from "@/components/RoleSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, LogOut } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (!user?.role) {
    return <RoleSelector />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-success-green rounded-2xl flex items-center justify-center">
            <CheckCircle className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-dark-charcoal mb-2">Welcome Back!</h2>
          <p className="text-steel-gray mb-6">
            Hello {user.firstName || user.email}, you are logged in as <span className="font-semibold capitalize">{user.role}</span>
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={() => window.location.href = `/${user.role}`}
              className="w-full py-3 bg-industrial-blue hover:bg-blue-700 text-white font-semibold"
              data-testid="button-goto-dashboard"
            >
              Go to {user.role} Dashboard
            </Button>
            
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full py-3"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
