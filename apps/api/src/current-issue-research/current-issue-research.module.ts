import { Global, Module } from '@nestjs/common';
import { CurrentIssueResearchService } from './current-issue-research.service';

/**
 * CurrentIssueResearchModule — Phase D (QMCP).
 *
 * Global so CurrentIssueResearchService can be injected anywhere without
 * importing this module explicitly — same convention as
 * ReligiousSourceModule/DocumentModule. Backs
 * @lados/official-quran-media's ICurrentIssueResearchService via
 * structural typing (see current-issue-research.service.ts header).
 */
@Global()
@Module({
  providers: [CurrentIssueResearchService],
  exports: [CurrentIssueResearchService],
})
export class CurrentIssueResearchModule {}
