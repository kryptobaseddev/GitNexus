import { describe, expect, it } from 'vitest';
import {
  buildSelfHostedUiRedirectUrl,
  resolveBundledWebUiDist,
} from '../../src/server/api.js';

describe('buildSelfHostedUiRedirectUrl', () => {
  it('adds the current server base URL to the root route', () => {
    expect(buildSelfHostedUiRedirectUrl('/', 'http://localhost:4747')).toBe(
      '/?server=http%3A%2F%2Flocalhost%3A4747',
    );
  });

  it('preserves existing query params when redirecting to the self-hosted UI', () => {
    expect(buildSelfHostedUiRedirectUrl('/?project=GitNexus', 'http://127.0.0.1:4747')).toBe(
      '/?project=GitNexus&server=http%3A%2F%2F127.0.0.1%3A4747',
    );
  });
});

describe('resolveBundledWebUiDist', () => {
  it('prefers packaged web assets inside dist/web', () => {
    const result = resolveBundledWebUiDist(
      'file:///repo/gitnexus/dist/server/api.js',
      (candidate) => candidate === '/repo/gitnexus/dist/web',
    );

    expect(result).toBe('/repo/gitnexus/dist/web');
  });

  it('falls back to the sibling gitnexus-web/dist in the monorepo', () => {
    const result = resolveBundledWebUiDist(
      'file:///repo/gitnexus/src/server/api.ts',
      (candidate) => candidate === '/repo/gitnexus-web/dist',
    );

    expect(result).toBe('/repo/gitnexus-web/dist');
  });

  it('returns null when no bundled UI is available', () => {
    const result = resolveBundledWebUiDist(
      'file:///repo/gitnexus/src/server/api.ts',
      () => false,
    );

    expect(result).toBeNull();
  });
});
