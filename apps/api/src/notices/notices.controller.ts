import { Controller, Get } from '@nestjs/common';
import { NoticesService } from './notices.service';

@Controller('notices')
export class NoticesController {
  constructor(private readonly notices: NoticesService) {}

  @Get()
  list() {
    return this.notices.listActive();
  }
}
