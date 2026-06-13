import { TARGET_CLASSES, type DetectionResult, type ObjectDetectionProvider } from '../types';

export interface MockScenario {
  /** Classes to "detect". Defaults to just ['person']. */
  classes?: string[];
  /** Confidence for every returned detection (0..1). Default 0.85. */
  confidence?: number;
  /** When true, detectObjects rejects and healthCheck returns false. */
  fail?: boolean;
  /** Artificial latency (ms) to mimic inference time. */
  latencyMs?: number;
}

/**
 * Local mock RF-DETR provider for development and tests. Returns deterministic
 * detections from a configured scenario — never touches the network.
 */
export class MockRfDetrProvider implements ObjectDetectionProvider {
  readonly providerName = 'mock-rf-detr';
  readonly modelVersion = 'mock-1.0';
  readonly supportedClasses: string[] = [...TARGET_CLASSES];
  private readonly scenario: MockScenario;

  constructor(scenario: MockScenario = {}) {
    this.scenario = scenario;
  }

  async healthCheck(): Promise<boolean> {
    return !this.scenario.fail;
  }

  async detectObjects(): Promise<DetectionResult[]> {
    if (this.scenario.latencyMs) {
      await new Promise((r) => setTimeout(r, this.scenario.latencyMs));
    }
    if (this.scenario.fail) throw new Error('mock-rf-detr: provider unavailable');

    const classes = this.scenario.classes ?? ['person'];
    const confidence = this.scenario.confidence ?? 0.85;
    const timestamp = Date.now();
    return classes.map((className, i) => ({
      className,
      confidence,
      boundingBox: { x: 0.1 + i * 0.05, y: 0.1, width: 0.2, height: 0.2 },
      timestamp,
      provider: this.providerName,
      modelVersion: this.modelVersion,
    }));
  }
}
