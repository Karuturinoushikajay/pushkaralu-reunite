import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CryptoModule } from '../crypto/crypto.module';
import { DatabaseModule } from '../database/database.module';
import { PilgrimSearchController } from './pilgrim-search.controller';
import { PilgrimSearchService } from './pilgrim-search.service';

@Module({
  imports: [DatabaseModule, CryptoModule, AuditModule],
  controllers: [PilgrimSearchController],
  providers: [PilgrimSearchService],
  exports: [PilgrimSearchService],
})
export class SearchModule {}
