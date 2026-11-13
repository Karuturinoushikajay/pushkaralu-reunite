import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from './env';

/**
 * Loads and validates environment configuration once, then exposes it app-wide
 * via the APP_CONFIG token.
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: () => loadConfig(),
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
