import { RF_DETR_ENDPOINT } from '../config';
import type { ObjectDetectionProvider } from '../types';
import { MockRfDetrProvider, type MockScenario } from './MockRfDetrProvider';
import { RemoteRfDetrProvider } from './RemoteRfDetrProvider';

export { MockRfDetrProvider } from './MockRfDetrProvider';
export { RemoteRfDetrProvider } from './RemoteRfDetrProvider';
export type { MockScenario } from './MockRfDetrProvider';

/**
 * Resolve the object-detection provider. Uses the hosted RF-DETR endpoint when
 * configured (and frame-upload is consented to upstream), else the local mock.
 * UI code depends only on the ObjectDetectionProvider interface, never a concrete class.
 */
export function getObjectDetectionProvider(opts?: { mockScenario?: MockScenario }): ObjectDetectionProvider {
  if (RF_DETR_ENDPOINT) return new RemoteRfDetrProvider(RF_DETR_ENDPOINT);
  return new MockRfDetrProvider(opts?.mockScenario);
}
