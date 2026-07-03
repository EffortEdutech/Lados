import { Module } from '@nestjs/common';
import { PackRegistryService }       from './pack-registry.service';
import { PackInstallerService }      from './pack-installer.service';
import { OfficialPackLoaderService } from './official-pack-loader.service';
import { PackController }            from './pack.controller';

// SecurityModule is @Global() — no explicit import needed.

@Module({
  providers:   [PackRegistryService, PackInstallerService, OfficialPackLoaderService],
  controllers: [PackController],
  exports:     [PackRegistryService, PackInstallerService, OfficialPackLoaderService],
})
export class PackModule {}
