import { Global, Module } from '@nestjs/common';
import { FieldEncryptionService } from './field-encryption.service';
import { HashingService } from './hashing.service';
import { PasswordService } from './password.service';

@Global()
@Module({
  providers: [PasswordService, FieldEncryptionService, HashingService],
  exports: [PasswordService, FieldEncryptionService, HashingService],
})
export class CryptoModule {}
