import { Module } from '@nestjs/common';
import { BoothsModule } from '../booths/booths.module';
import { OtpModule } from '../otp/otp.module';
import { DescriptionCaseSearchService } from './case-search.service';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [BoothsModule, OtpModule],
  controllers: [CasesController],
  providers: [
    CasesService,
    DescriptionCaseSearchService,
    { provide: 'CaseSearchService', useExisting: DescriptionCaseSearchService },
  ],
  exports: [CasesService, DescriptionCaseSearchService],
})
export class CasesModule {}
