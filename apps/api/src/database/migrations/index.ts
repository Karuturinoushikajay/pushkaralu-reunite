import type { Migration, MigrationProvider } from 'kysely';
import * as initSchema from './0001_init_schema';
import * as authOtp from './0002_auth_otp';
import * as v3Family from './0003_v3_family_uid_aadhaar';
import * as languageTamil from './0004_language_tamil';
import * as accountsBooth from './0005_accounts_booth';
import * as boothNameI18n from './0006_booth_name_i18n';

/**
 * Static migration registry. We import migrations explicitly (instead of using
 * Kysely's FileMigrationProvider) so the runner behaves identically on Windows,
 * macOS, Linux, and CI without any ESM path-URL quirks.
 *
 * Add new migrations here in ascending key order.
 */
export const migrations: Record<string, Migration> = {
  '0001_init_schema': initSchema,
  '0002_auth_otp': authOtp,
  '0003_v3_family_uid_aadhaar': v3Family,
  '0004_language_tamil': languageTamil,
  '0005_accounts_booth': accountsBooth,
  '0006_booth_name_i18n': boothNameI18n,
};

export class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations;
  }
}
