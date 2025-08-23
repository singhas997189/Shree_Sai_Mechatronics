import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Camera, X, RotateCw } from "lucide-react";

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const requestCameraAccess = async () => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      
      setHasPermission(true);
      setIsScanning(true);
      
      // Start QR detection
      startQRDetection();
    } catch (error) {
      toast({
        title: "Camera Access Denied",
        description: "Please enable camera permissions to use QR login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startQRDetection = () => {
    // Simulate QR code detection
    // In a real implementation, this would use a QR scanner library
    const detectQR = () => {
      if (!isScanning) return;
      
      // Simulate finding a QR code after 3 seconds
      setTimeout(() => {
        if (isScanning) {
          handleQRCodeDetected("sample-qr-token-123");
        }
      }, 3000);
    };
    
    detectQR();
  };

  const handleQRCodeDetected = async (token: string) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/qr-login", { token });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "QR Login Successful",
          description: "You have been authenticated successfully.",
        });
        
        // Redirect to dashboard
        window.location.href = "/";
      }
    } catch (error) {
      toast({
        title: "QR Login Failed",
        description: "Invalid or expired QR code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      stopScanning();
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    setHasPermission(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const switchCamera = async () => {
    // In a real implementation, this would switch between front/back cameras
    toast({
      title: "Camera Switch",
      description: "Camera switching not implemented in demo.",
    });
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!hasPermission) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-safety-orange rounded-2xl flex items-center justify-center">
          <svg className="text-white w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM19 15h2v2h-2zM17 13h2v2h-2z"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-dark-charcoal mb-2">QR Code Login</h3>
        <p className="text-steel-gray mb-6">Scan your QR code to access the system quickly</p>

        <div className="bg-orange-50 border-2 border-safety-orange rounded-xl p-6 mb-6">
          <Camera className="text-safety-orange w-12 h-12 mx-auto mb-3" />
          <h4 className="font-semibold text-dark-charcoal mb-2">Camera Access Required</h4>
          <p className="text-steel-gray text-sm mb-4">Allow camera access to scan QR codes for quick login</p>
          <Button
            onClick={requestCameraAccess}
            disabled={isLoading}
            className="w-full py-3 px-6 bg-safety-orange hover:bg-orange-600 text-white font-bold rounded-xl transition-all"
            data-testid="button-enable-camera"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Requesting Access...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 mr-2" />
                Enable Camera
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-safety-orange rounded-2xl flex items-center justify-center">
          <svg className="text-white w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM19 15h2v2h-2zM17 13h2v2h-2z"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-dark-charcoal mb-2">QR Scanner Active</h3>
        <p className="text-steel-gray">Position QR code within the frame</p>
      </div>

      {/* QR Scanner Viewport */}
      <div className="relative bg-black rounded-xl overflow-hidden mb-6">
        <div className="aspect-square bg-black flex items-center justify-center relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            data-testid="video-qr-scanner"
          />
          
          {/* Scanner Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-4 border-safety-orange rounded-xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
            </div>
          </div>
          
          {/* Scanning Animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-1 bg-safety-orange opacity-75 animate-pulse"></div>
          </div>
        </div>

        {/* Scanner Status */}
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <div className="bg-black bg-opacity-50 rounded-lg p-3">
            <p className="text-white text-sm font-medium">
              {isLoading ? "Processing QR code..." : "Position QR code within the frame"}
            </p>
          </div>
        </div>
      </div>

      {/* Scanner Controls */}
      <div className="flex gap-4">
        <Button
          onClick={stopScanning}
          variant="outline"
          className="flex-1 py-3 px-6 bg-gray-200 text-steel-gray font-semibold rounded-xl hover:bg-gray-300 transition-all"
          data-testid="button-stop-scanning"
        >
          <X className="w-5 h-5 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={switchCamera}
          variant="outline"
          className="py-3 px-6 bg-steel-gray text-white font-semibold rounded-xl hover:bg-gray-700 transition-all"
          data-testid="button-switch-camera"
        >
          <RotateCw className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
