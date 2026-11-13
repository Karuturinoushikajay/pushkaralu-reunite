import {
  BadRequestException,
  type PipeTransform,
} from '@nestjs/common';
import type { ZodTypeAny } from 'zod';

/** Nest pipe that validates the request body against a Zod schema. */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown): unknown {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    return parsed.data;
  }
}
