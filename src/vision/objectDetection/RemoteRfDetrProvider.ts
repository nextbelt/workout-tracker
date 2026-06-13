import { TARGET_CLASSES, type DetectionInput, type DetectionResult, type ObjectDetectionProvider } from '../types';

interface RemoteDetection {
  class_name?: string;
  className?: string;
  confidence: number;
  bbox?: [number, number, number, number];
  bounding_box?: { x: number; y: number; width: number; height: number };
}

/**
 * Placeholder adapter for a hosted/backend RF-DETR inference endpoint. Wired but not
 * active unless VITE_RF_DETR_ENDPOINT is set AND the user consents to frame upload.
 * The UI never imports this directly — it goes through the ObjectDetectionProvider
 * interface, so swapping in the real provider needs no UI changes.
 */
export class RemoteRfDetrProvider implements ObjectDetectionProvider {
  readonly providerName = 'rf-detr-remote';
  readonly modelVersion = 'remote';
  readonly supportedClasses: string[] = [...TARGET_CLASSES];
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.endpoint) return false;
    try {
      const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async detectObjects(frame: DetectionInput): Promise<DetectionResult[]> {
    if (!this.endpoint) return [];
    const blob = await frameToBlob(frame);
    if (!blob) return [];

    const form = new FormData();
    form.append('image', blob, 'frame.jpg');

    const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/detect`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`rf-detr-remote: ${res.status}`);

    const data = (await res.json()) as { detections?: RemoteDetection[] };
    const ts = Date.now();
    return (data.detections ?? []).map((d) => ({
      className: d.className ?? d.class_name ?? 'unknown',
      confidence: d.confidence,
      boundingBox: d.bounding_box ?? bboxFromArray(d.bbox),
      timestamp: ts,
      provider: this.providerName,
      modelVersion: this.modelVersion,
    }));
  }
}

function bboxFromArray(b?: [number, number, number, number]) {
  if (!b) return { x: 0, y: 0, width: 0, height: 0 };
  return { x: b[0], y: b[1], width: b[2], height: b[3] };
}

/** Convert any DetectionInput to a JPEG blob via an offscreen canvas (browser only). */
async function frameToBlob(frame: DetectionInput): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  let w = 0;
  let h = 0;
  if (frame instanceof HTMLVideoElement) { w = frame.videoWidth; h = frame.videoHeight; }
  else if (frame instanceof HTMLCanvasElement) { w = frame.width; h = frame.height; }
  else if (typeof ImageBitmap !== 'undefined' && frame instanceof ImageBitmap) { w = frame.width; h = frame.height; }
  else if (typeof ImageData !== 'undefined' && frame instanceof ImageData) { w = frame.width; h = frame.height; }
  if (!w || !h) return null;
  // Downscale to keep upload small/cheap.
  const scale = Math.min(1, 640 / w);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (frame instanceof ImageData) ctx.putImageData(frame, 0, 0);
  else ctx.drawImage(frame as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7));
}
