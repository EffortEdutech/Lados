import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { SupabaseJwtGuard } from '../common/guards/supabase-jwt.guard';

@UseGuards(SupabaseJwtGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  /** GET /api/v1/services — list all core services */
  @Get()
  async findAll() {
    const data = await this.servicesService.findAll();
    return { data };
  }

  /** GET /api/v1/services/:id */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.servicesService.findOne(id);
    return { data };
  }
}
