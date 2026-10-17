import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdjustAdminUserPointsDto } from './dto/adjust-admin-user-points.dto';
import { CreateModelConfigDto } from './dto/create-model-config.dto';
import { CreateProviderConfigDto } from './dto/create-provider-config.dto';
import { ImportDiscoveredModelsDto } from './dto/import-discovered-models.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { ListModelConfigsQueryDto } from './dto/list-model-configs-query.dto';
import { ProbeProviderDto } from './dto/probe-provider.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { UpdateModelConfigDto } from './dto/update-model-config.dto';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  listUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:userId')
  updateUser(
    @CurrentUser('id') actorId: string,
    @Param('userId') userId: string,
    @Body() input: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(actorId, userId, input);
  }

  @Post('users/:userId/points-adjustments')
  adjustUserPoints(
    @CurrentUser('id') actorId: string,
    @Param('userId') userId: string,
    @Body() input: AdjustAdminUserPointsDto,
  ) {
    return this.adminService.adjustUserPoints(actorId, userId, input);
  }

  @Get('providers')
  listProviders() {
    return this.adminService.listProviders();
  }

  @Post('providers')
  createProvider(@Body() input: CreateProviderConfigDto) {
    return this.adminService.createProvider(input);
  }

  @Post('providers/probe')
  probeDraftProvider(@Body() input: ProbeProviderDto) {
    return this.adminService.probeDraftProvider(input);
  }

  @Post('providers/:providerId/probe')
  probeProvider(@Param('providerId') providerId: string, @Body() input: ProbeProviderDto) {
    return this.adminService.probeProvider(providerId, input);
  }

  @Patch('providers/:providerId')
  updateProvider(@Param('providerId') providerId: string, @Body() input: UpdateProviderConfigDto) {
    return this.adminService.updateProvider(providerId, input);
  }

  @Get('models')
  listModels(@Query() query: ListModelConfigsQueryDto) {
    return this.adminService.listModels(query);
  }

  @Post('models')
  createModel(@Body() input: CreateModelConfigDto) {
    return this.adminService.createModel(input);
  }

  @Post('models/import-discovered')
  importDiscoveredModels(@Body() input: ImportDiscoveredModelsDto) {
    return this.adminService.importDiscoveredModels(input);
  }

  @Patch('models/:modelId')
  updateModel(@Param('modelId') modelId: string, @Body() input: UpdateModelConfigDto) {
    return this.adminService.updateModel(modelId, input);
  }
}
