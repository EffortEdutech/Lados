import { Global, Module } from '@nestjs/common';
import { ConnectionController } from './connection.controller';
import { ConnectionService } from './connection.service';
import { ConnectionCryptoService } from './connection-crypto.service';
import { ConnectionAdapterRegistry } from './connection-adapter.registry';
import { ConnectorRuntimePolicyService } from './connector-runtime-policy.service';

@Global()
@Module({
  controllers: [ConnectionController],
  providers: [ConnectionService, ConnectionCryptoService, ConnectionAdapterRegistry, ConnectorRuntimePolicyService],
  exports: [ConnectionService, ConnectionAdapterRegistry, ConnectorRuntimePolicyService],
})
export class ConnectionModule {}
