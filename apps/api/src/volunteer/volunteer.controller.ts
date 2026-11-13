import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { nearbyQuerySchema } from '@pushkaralu/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { VolunteerService } from './volunteer.service';

@Controller('volunteer')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VolunteerController {
  constructor(private readonly volunteer: VolunteerService) {}

  @Get('alerts')
  @Roles('VOLUNTEER', 'POLICE')
  alerts(
    @Query(new ZodValidationPipe(nearbyQuerySchema))
    query: { lng: number; lat: number; radiusMeters: number },
  ) {
    return this.volunteer.nearbyAlerts(query.lng, query.lat, query.radiusMeters);
  }
}
