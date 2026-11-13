import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BoothsModule } from './booths/booths.module';
import { CasesModule } from './cases/cases.module';
import { ConfigModule } from './config/config.module';
import { CryptoModule } from './crypto/crypto.module';
import { DatabaseModule } from './database/database.module';
import { FoundReportsModule } from './found-reports/found-reports.module';
import { HealthModule } from './health/health.module';
import { MembersModule } from './members/members.module';
import { NoticesModule } from './notices/notices.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { SearchModule } from './search/search.module';
import { SmsModule } from './sms/sms.module';
import { VolunteerModule } from './volunteer/volunteer.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CryptoModule,
    RateLimitModule,
    SmsModule,
    AuditModule,
    HealthModule,
    AuthModule,
    MembersModule,
    NoticesModule,
    BoothsModule,
    CasesModule,
    FoundReportsModule,
    VolunteerModule,
    SearchModule,
  ],
})
export class AppModule {}
