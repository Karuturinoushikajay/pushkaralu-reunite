import { Module } from '@nestjs/common';
import { QrModule } from '../qr/qr.module';
import { UidModule } from '../uid/uid.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [UidModule, QrModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
