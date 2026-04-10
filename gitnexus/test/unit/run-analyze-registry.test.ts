import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRunPipelineFromRepo = vi.fn();
const mockGetStoragePaths = vi.fn();
const mockSaveMeta = vi.fn();
const mockLoadMeta = vi.fn();
const mockAddToGitignore = vi.fn();
const mockRegisterRepo = vi.fn();
const mockCleanupOldKuzuFiles = vi.fn();
const mockHasGitDir = vi.fn();
const mockGetCurrentCommit = vi.fn();
const mockGenerateAIContextFiles = vi.fn();

vi.mock('../../src/core/ingestion/pipeline.js', () => ({
  runPipelineFromRepo: mockRunPipelineFromRepo,
}));

vi.mock('../../src/core/lbug/lbug-adapter.js', () => ({
  initLbug: vi.fn(),
  loadGraphToLbug: vi.fn(),
  getLbugStats: vi.fn(),
  executeQuery: vi.fn(),
  executeWithReusedStatement: vi.fn(),
  closeLbug: vi.fn(),
  createFTSIndex: vi.fn(),
  loadCachedEmbeddings: vi.fn(),
}));

vi.mock('../../src/storage/repo-manager.js', () => ({
  getStoragePaths: mockGetStoragePaths,
  saveMeta: mockSaveMeta,
  loadMeta: mockLoadMeta,
  addToGitignore: mockAddToGitignore,
  registerRepo: mockRegisterRepo,
  cleanupOldKuzuFiles: mockCleanupOldKuzuFiles,
}));

vi.mock('../../src/storage/git.js', () => ({
  getCurrentCommit: mockGetCurrentCommit,
  hasGitDir: mockHasGitDir,
}));

vi.mock('../../src/cli/ai-context.js', () => ({
  generateAIContextFiles: mockGenerateAIContextFiles,
}));

describe('runFullAnalysis registry behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetStoragePaths.mockReturnValue({
      storagePath: '/mnt/projects/cleocode/.gitnexus',
      lbugPath: '/mnt/projects/cleocode/.gitnexus/lbug',
    });
    mockCleanupOldKuzuFiles.mockResolvedValue({ found: false, needsReindex: false });
    mockHasGitDir.mockReturnValue(true);
    mockGetCurrentCommit.mockReturnValue('abc123');
    mockLoadMeta.mockResolvedValue({
      repoPath: '/mnt/projects/cleocode',
      lastCommit: 'abc123',
      indexedAt: '2026-04-10T00:00:00.000Z',
      stats: { files: 10, nodes: 20, edges: 30 },
    });
    mockRegisterRepo.mockResolvedValue(undefined);
  });

  it('re-registers an up-to-date repo before returning early', async () => {
    const { runFullAnalysis } = await import('../../src/core/run-analyze.js');

    const result = await runFullAnalysis('/mnt/projects/cleocode', {}, {
      onProgress: vi.fn(),
    });

    expect(result.alreadyUpToDate).toBe(true);
    expect(result.repoName).toBe('cleocode');
    expect(mockRegisterRepo).toHaveBeenCalledTimes(1);
    expect(mockRegisterRepo).toHaveBeenCalledWith(
      '/mnt/projects/cleocode',
      expect.objectContaining({
        repoPath: '/mnt/projects/cleocode',
        lastCommit: 'abc123',
      }),
    );
    expect(mockRunPipelineFromRepo).not.toHaveBeenCalled();
    expect(mockGenerateAIContextFiles).not.toHaveBeenCalled();
  });
});
