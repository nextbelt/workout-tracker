import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Loader2, ScanBarcode } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => Promise<void>;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setError('Camera access denied. Enter barcode manually below.');
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Use BarcodeDetector API if available (Chrome, Edge, Android)
  useEffect(() => {
    if (!('BarcodeDetector' in window)) return;
    if (!videoRef.current) return;

    let animFrame: number;
    let active = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
    });

    const detect = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        animFrame = requestAnimationFrame(detect);
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const barcodes: Array<{ rawValue: string }> = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          active = false;
          setScanning(true);
          await onScan(barcodes[0].rawValue);
          return;
        }
      } catch {
        // detection frame failed, continue
      }
      if (active) animFrame = requestAnimationFrame(detect);
    };

    animFrame = requestAnimationFrame(detect);

    return () => {
      active = false;
      cancelAnimationFrame(animFrame);
    };
  }, [onScan]);

  const handleManualSubmit = useCallback(async () => {
    const code = manualCode.trim();
    if (!code) return;
    setScanning(true);
    await onScan(code);
  }, [manualCode, onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg bg-surface-2 rounded-2xl overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ScanBarcode size={20} className="text-brand" />
            Scan Barcode
          </h2>
          <button
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 bg-surface-3 hover:bg-surface-3 rounded-lg transition-colors flex items-center justify-center"
          >
            <X size={18} className="text-muted" />
          </button>
        </div>

        {/* Camera viewfinder */}
        <div className="relative bg-bg aspect-4/3">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-32 border-2 border-brand/60 rounded-xl relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-brand rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-brand rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-brand rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-brand rounded-br-lg" />
            </div>
          </div>

          {scanning && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 size={32} className="text-brand animate-spin" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="text-center">
                <Camera size={32} className="text-neutral-600 mx-auto mb-2" />
                <p className="text-muted text-sm">{error}</p>
              </div>
            </div>
          )}

          {!('BarcodeDetector' in window) && !error && (
            <div className="absolute bottom-2 left-0 right-0 text-center">
              <p className="text-muted text-xs bg-black/50 inline-block px-3 py-1 rounded-full">
                Point camera at barcode or enter manually
              </p>
            </div>
          )}
        </div>

        {/* Manual entry fallback */}
        <div className="p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter barcode number..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
              className="flex-1 bg-surface-3 border border-border-2 rounded-lg px-3 py-2 min-h-11 text-foreground placeholder-neutral-500 focus:outline-none focus:border-brand transition-colors"
            />
            <button
              onClick={handleManualSubmit}
              disabled={scanning || !manualCode.trim()}
              className="bg-brand hover:bg-brand-dark text-white font-medium rounded-lg px-4 py-2 min-h-11 transition-colors disabled:opacity-50"
            >
              Look up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
