import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateServer = vi.fn();

vi.mock('../../src/server/api.js', () => ({
  createServer: mockCreateServer,
}));

describe('serve commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServer.mockResolvedValue(undefined);
  });

  it('starts API-only mode by default', async () => {
    const { serveCommand } = await import('../../src/cli/serve.js');

    await serveCommand({ port: '4748', host: '127.0.0.1' });

    expect(mockCreateServer).toHaveBeenCalledWith(4748, '127.0.0.1', { serveWebUi: false });
  });

  it('enables the bundled UI when serve receives --ui', async () => {
    const { serveCommand } = await import('../../src/cli/serve.js');

    await serveCommand({ ui: true });

    expect(mockCreateServer).toHaveBeenCalledWith(4747, 'localhost', { serveWebUi: true });
  });

  it('serve-local always enables the bundled UI', async () => {
    const { serveLocalCommand } = await import('../../src/cli/serve.js');

    await serveLocalCommand({ port: '4849' });

    expect(mockCreateServer).toHaveBeenCalledWith(4849, 'localhost', { serveWebUi: true });
  });
});
