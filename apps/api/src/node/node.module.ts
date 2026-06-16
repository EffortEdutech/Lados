import { Module } from '@nestjs/common';
import { NodeService } from './node.service';
import { NodeController } from './node.controller';

@Module({
  controllers: [NodeController],
  providers: [NodeService],
  exports: [NodeService],
})
export class NodeModule {}
