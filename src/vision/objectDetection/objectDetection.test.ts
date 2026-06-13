import { describe, it, expect } from 'vitest';
import { MockRfDetrProvider } from './MockRfDetrProvider';
import { RemoteRfDetrProvider } from './RemoteRfDetrProvider';

describe('MockRfDetrProvider', () => {
  it('returns the configured detections', async () => {
    const p = new MockRfDetrProvider({ classes: ['dumbbell'], confidence: 0.9 });
    const res = await p.detectObjects();
    expect(res).toHaveLength(1);
    expect(res[0].className).toBe('dumbbell');
    expect(res[0].confidence).toBe(0.9);
    expect(res[0].provider).toBe('mock-rf-detr');
  });

  it('returns multiple detections', async () => {
    const p = new MockRfDetrProvider({ classes: ['person', 'dumbbell', 'bench'] });
    const res = await p.detectObjects();
    expect(res.map((d) => d.className)).toEqual(['person', 'dumbbell', 'bench']);
  });

  it('supports empty detections', async () => {
    const p = new MockRfDetrProvider({ classes: [] });
    expect(await p.detectObjects()).toHaveLength(0);
  });

  it('surfaces low-confidence detections', async () => {
    const p = new MockRfDetrProvider({ classes: ['barbell'], confidence: 0.3 });
    const [d] = await p.detectObjects();
    expect(d.confidence).toBeLessThan(0.5);
  });

  it('throws + reports unhealthy when configured to fail', async () => {
    const p = new MockRfDetrProvider({ fail: true });
    expect(await p.healthCheck()).toBe(false);
    await expect(p.detectObjects()).rejects.toThrow();
  });

  it('is healthy by default', async () => {
    expect(await new MockRfDetrProvider().healthCheck()).toBe(true);
  });
});

describe('RemoteRfDetrProvider', () => {
  it('reports unhealthy with no endpoint and returns no detections', async () => {
    const p = new RemoteRfDetrProvider('');
    expect(await p.healthCheck()).toBe(false);
    // @ts-expect-error — detectObjects is browser-only; with no endpoint it short-circuits.
    expect(await p.detectObjects(null)).toEqual([]);
  });
});
