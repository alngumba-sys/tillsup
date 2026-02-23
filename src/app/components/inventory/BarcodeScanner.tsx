import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "../ui/button";
import { Loader2, Camera, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
  onClose?: () => void;
}

export function BarcodeScanner({ onScan, onError, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  // Use a stable unique ID for the container
  const containerId = useRef(`html5-qrcode-reader-${Math.random().toString(36).substring(7)}`).current;

  // Use refs for callbacks to prevent re-creating startScanner on every render
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            scannerRef.current.clear();
        } catch (err) {
            console.error("Failed to stop scanner", err);
        } finally {
            scannerRef.current = null;
        }
    }
  }, []);

  const startScanner = useCallback(async () => {
    try {
      // If already scanning, don't start again
      if (scannerRef.current && scannerRef.current.isScanning) {
        return;
      }

      setIsScanning(true);
      setError(null);

      // Check if element exists before creating instance
      // Because we now keep the div mounted (but hidden) even on error, this should always be true.
      const element = document.getElementById(containerId);
      if (!element) {
          throw new Error("Scanner container not found");
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }

      // Config
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ]
      };

      // Start scanning
      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success callback
          if (onScanRef.current) {
             onScanRef.current(decodedText);
          }
          stopScanner();
        },
        (errorMessage) => {
          // Error callback
          if (onErrorRef.current && !errorMessage.includes("No MultiFormat Readers")) {
             // onErrorRef.current(errorMessage);
          }
        }
      );
    } catch (err: any) {
      const errString = typeof err === 'string' ? err : (err?.message || String(err));
      
      // Only log unexpected errors to console to prevent noise
      const isKnownError = 
        err?.name === "NotAllowedError" || 
        errString.includes("Permission denied") ||
        errString.includes("NotAllowedError") ||
        errString.includes("userMedia") || 
        err?.name === "NotFoundError" || 
        errString.includes("No device found");

      if (!isKnownError) {
        console.error("Error starting scanner:", err);
      }
      
      let errorMessage = "Failed to start camera.";
      if (isKnownError && (errString.includes("Permission denied") || errString.includes("NotAllowedError") || errString.includes("userMedia"))) {
          errorMessage = "Camera permission denied. Please allow camera access in your browser settings to scan barcodes.";
      } else if (err?.name === "NotFoundError" || errString.includes("No device found")) {
          errorMessage = "No camera found on this device.";
      } else if (err?.name === "NotReadableError" || errString.includes("hardware error")) {
          errorMessage = "Camera is already in use by another application.";
      } else {
           errorMessage = errString || "Failed to start camera";
      }
      
      setError(errorMessage);
      setIsScanning(false);
      
      // Cleanup if start failed
      if (scannerRef.current) {
          try {
             await scannerRef.current.clear();
          } catch (e) {}
          scannerRef.current = null;
      }
    }
  }, [stopScanner, containerId]);

  const handleRetry = () => {
    // When retrying, we just clear the error.
    // The effect below will trigger startScanner because error is null and isScanning is false.
    setError(null);
  };

  useEffect(() => {
    // Delay start slightly to ensure DOM is ready
    const timer = setTimeout(() => {
        // Only attempt to start if we are not scanning and have no error
        if (!isScanning && !error) {
            startScanner();
        }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isScanning, error, startScanner]);

  // Ensure scanner stops when component unmounts
  useEffect(() => {
      return () => {
          stopScanner();
      };
  }, [stopScanner]);

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4">
        {/* Scanner Container - Always render to prevent "Container not found" errors, but hide if error */}
        {/* We use visibility: hidden instead of display: none to ensure layout calculation might still work if needed, 
            though display: none is usually safer for camera streams. 
            Actually, let's use a wrapper that is always there. */}
        
        <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-900">
            {/* The scanner library needs this div to exist. We keep it in the DOM even if error is true. */}
            <div 
                id={containerId} 
                className={`w-full h-full ${error ? "invisible" : "visible"}`} 
            />
            
            {/* Overlay Guide - Only show when scanning and no error */}
            {!error && (
                <div className="absolute inset-0 border-[40px] border-slate-900/50 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-px bg-red-500/50 absolute top-1/2 left-0 right-0" />
                </div>
            )}

            {/* Loading Spinner */}
            {!isScanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            )}

            {/* Error Overlay */}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 p-4 z-10 text-center">
                    <Alert variant="destructive" className="mb-4 border-none shadow-none bg-transparent">
                        <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
                    </Alert>
                    <Button onClick={handleRetry} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </Button>
                </div>
            )}
        </div>

      {!error && (
          <p className="text-sm text-muted-foreground text-center">
            Point your camera at a barcode to scan
          </p>
      )}

      {onClose && (
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cancel Scanning
        </Button>
      )}
    </div>
  );
}
