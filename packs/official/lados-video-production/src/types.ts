/**
 * @lados/official-video-production — shared service interfaces & payload types
 *
 * Declared locally (not imported from any prototype pack). IFileService is
 * satisfied by apps/api's real FileService via structural (duck) typing —
 * same shape as lados-document-intelligence's IFileService. IRenderService
 * has no real implementation anywhere in this repo yet — see
 * nodes/render-scenes.ts for why.
 */

// ── File access (reuses the platform's existing upload infrastructure) ───────

export interface IFileService {
  getUpload(fileId: string): Promise<{ storage_path: string }>;
  downloadFile(storagePath: string): Promise<Buffer>;
}

// ── Rendering (no real backend wired yet) ─────────────────────────────────────

export interface RenderRequest {
  sceneIds: string[];
  resolution: '1080p' | '4k';
  outDir?: string;
}

export interface RenderResult {
  rendered: boolean;
  outDir: string | null;
  files: string[];
  error?: string;
}

/** Minimal interface — a future NestJS RenderService would satisfy this via duck typing. */
export interface IRenderService {
  render(request: RenderRequest): Promise<RenderResult>;
}

// ── Shared scene shape ─────────────────────────────────────────────────────────

export interface SceneRef {
  sceneNumber: number;
  title: string;
  version?: number;
}
