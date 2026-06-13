export type CameraError = 'denied' | 'unavailable' | 'unknown';

/**
 * Manages the webcam MediaStream and binds it to a <video>. Opt-in: nothing starts
 * until start() is called. stop() fully releases the camera (no leaks).
 */
export class CameraFrameSource {
  private stream: MediaStream | null = null;

  get active(): boolean {
    return this.stream != null;
  }

  async start(video: HTMLVideoElement, facingMode: 'user' | 'environment' = 'user'): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw mkError('unavailable');
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') throw mkError('denied');
      if (name === 'NotFoundError' || name === 'NotReadableError') throw mkError('unavailable');
      throw mkError('unknown');
    }
    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => {/* autoplay race — caller can retry on gesture */});
  }

  stop(video?: HTMLVideoElement | null): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (video) video.srcObject = null;
  }
}

function mkError(kind: CameraError): Error & { kind: CameraError } {
  const e = new Error(`camera:${kind}`) as Error & { kind: CameraError };
  e.kind = kind;
  return e;
}
