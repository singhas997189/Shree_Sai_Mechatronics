import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/LoginForm";
import QRScanner from "@/components/QRScanner";
import { Cog, Factory, Shield, HardHat, Package } from "lucide-react";

export default function Landing() {
  const [activeTab, setActiveTab] = useState("standard");

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        {/* Company Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-industrial-blue rounded-2xl flex items-center justify-center shadow-lg">
            <Cog className="text-white text-2xl w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-dark-charcoal mb-2">Shree Sai Mechatronics</h1>
          <p className="text-steel-gray font-medium">Workshop Management System</p>
        </div>

        {/* Authentication Card */}
        <Card className="shadow-xl border border-gray-200 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 border-b border-gray-200 rounded-none">
              <TabsTrigger 
                value="standard" 
                className="py-4 px-6 data-[state=active]:bg-blue-50 data-[state=active]:text-industrial-blue data-[state=active]:border-b-2 data-[state=active]:border-industrial-blue"
                data-testid="tab-standard-login"
              >
                <Package className="w-4 h-4 mr-2" />
                Standard Login
              </TabsTrigger>
              <TabsTrigger 
                value="qr" 
                className="py-4 px-6 data-[state=active]:bg-orange-50 data-[state=active]:text-safety-orange data-[state=active]:border-b-2 data-[state=active]:border-safety-orange"
                data-testid="tab-qr-login"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM19 15h2v2h-2zM17 13h2v2h-2z"/>
                </svg>
                QR Login
              </TabsTrigger>
            </TabsList>

            <TabsContent value="standard" className="p-8 mt-0">
              <LoginForm />
            </TabsContent>

            <TabsContent value="qr" className="p-8 mt-0">
              <QRScanner />
            </TabsContent>
          </Tabs>
        </Card>

        {/* System Info */}
        <div className="text-center mt-6 text-sm text-steel-gray">
          <p>© 2024 Shree Sai Mechatronics</p>
          <p>Workshop Management System v2.1</p>
        </div>
      </div>
    </div>
  );
}
