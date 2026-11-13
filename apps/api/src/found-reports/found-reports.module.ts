import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { FoundReportsController } from './found-reports.controller';
import { FoundReportsService } from './found-reports.service';

@Module({
  imports: [CasesModule],
  controllers: [FoundReportsController],
  providers: [FoundReportsService],
})
export class FoundReportsModule {}
