import { Module } from '@nestjs/common';
import { WebhookController, WebhookSecretsController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  controllers: [WebhookController, WebhookSecretsController],
  providers:   [WebhookService],
})
export class WebhookModule {}
