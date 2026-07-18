/**
 * ReligiousSourceService — Phase B.
 *
 * Structurally satisfies @lados/official-quran-media's IQuranSourceService
 * and IHadithVerificationService (duck typing, same convention as
 * FileService/AiService elsewhere in this repo — never imports the pack's
 * interfaces nominally). Composes the three governed adapters (Blueprint
 * §9.1) over datasets under LADOS_RELIGIOUS_DATA_PATH.
 *
 * `isConfigured` gates whether real-nodes/index.ts passes this service to
 * the pack at all — mirrors AiService.isConfigured's pattern exactly. When
 * false, the pack's own honest stubs already handle "no service wired" via
 * RELIGIOUS_DATA_PATH_NOT_CONFIGURED / TAFSIR_NOT_CONFIGURED /
 * HADITH_VERIFICATION_SERVICE_NOT_CONFIGURED — this service does not
 * duplicate that check, it just declines to be injected when unconfigured.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QulQuranAdapter } from './adapters/qul-quran.adapter';
import { QulTafsirAdapter } from './adapters/qul-tafsir.adapter';
import { SemakHadisAdapter } from './adapters/semak-hadis.adapter';
import { loadManifest } from './repositories/dataset-loader';
import type { QuranReference, HadithVerificationRecord } from './types';

@Injectable()
export class ReligiousSourceService {
  private readonly logger = new Logger(ReligiousSourceService.name);
  private readonly dataPath: string | null;
  private readonly quranAdapter: QulQuranAdapter | null;
  private readonly tafsirAdapter: QulTafsirAdapter | null;
  private readonly hadithAdapter: SemakHadisAdapter;

  constructor(private readonly config: ConfigService) {
    this.dataPath = this.config.get<string>('LADOS_RELIGIOUS_DATA_PATH') ?? null;
    this.quranAdapter = this.dataPath ? new QulQuranAdapter(this.dataPath) : null;
    this.tafsirAdapter = this.dataPath ? new QulTafsirAdapter(this.dataPath) : null;
    // Semak Hadis is human-assisted (no dataset path needed) — always available.
    this.hadithAdapter = new SemakHadisAdapter();

    if (this.dataPath) {
      this.logger.log(`ReligiousSourceService: LADOS_RELIGIOUS_DATA_PATH=${this.dataPath}`);
    } else {
      this.logger.warn(
        'ReligiousSourceService: LADOS_RELIGIOUS_DATA_PATH not set — Quran/tafsir nodes will use the honest RELIGIOUS_DATA_PATH_NOT_CONFIGURED/TAFSIR_NOT_CONFIGURED stub paths.',
      );
    }
  }

  /** Whether QUL datasets are configured (gates Quran/tafsir retrieval, not hadith). */
  get isConfigured(): boolean {
    return this.dataPath !== null;
  }

  /** Confirms a registered manifest actually exists on disk — used at startup logging only. */
  async checkManifestPresent(): Promise<boolean> {
    if (!this.dataPath) return false;
    const manifest = await loadManifest(this.dataPath);
    return manifest !== null;
  }

  // ── IQuranSourceService surface ─────────────────────────────────────────────

  async searchAyahsByTheme(input: { themes: string[]; query?: string; language?: string; limit?: number }) {
    if (!this.quranAdapter) throw new Error('ReligiousSourceService not configured — call isConfigured first.');
    return this.quranAdapter.searchAyahsByTheme(input);
  }

  async getAyah(input: { surah: number; ayah: number; translationId?: string }) {
    if (!this.quranAdapter) throw new Error('ReligiousSourceService not configured — call isConfigured first.');
    return this.quranAdapter.getAyah(input);
  }

  async getTafsir(input: { surah: number; ayah: number; tafsirIds: string[] }) {
    if (!this.tafsirAdapter) throw new Error('ReligiousSourceService not configured — call isConfigured first.');
    return this.tafsirAdapter.getTafsir(input);
  }

  async verifyReference(input: QuranReference) {
    if (!this.quranAdapter) throw new Error('ReligiousSourceService not configured — call isConfigured first.');
    return this.quranAdapter.verifyReference(input);
  }

  // ── IHadithVerificationService surface (always available — no dataset needed) ──

  async createManualVerification(input: { sourceUrl: string; submittedBy: string }): Promise<HadithVerificationRecord> {
    return this.hadithAdapter.createManualVerification(input);
  }

  async getVerification(recordId: string): Promise<HadithVerificationRecord> {
    return this.hadithAdapter.getVerification(recordId);
  }
}
