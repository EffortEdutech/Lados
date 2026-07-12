import { Module } from '@nestjs/common';
import { ProgramArtifactService } from './program-artifact.service';

@Module({
  providers: [ProgramArtifactService],
  exports:   [ProgramArtifactService],
})
export class ProgramArtifactModule {}
