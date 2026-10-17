import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return {
      items: await this.agentsService.list(userId),
    };
  }

  @Post()
  save(@CurrentUser('id') userId: string, @Body() input: CreateAgentDto) {
    return this.agentsService.save(userId, input);
  }

  @Patch(':agentId')
  update(
    @CurrentUser('id') userId: string,
    @Param('agentId') agentId: string,
    @Body() input: UpdateAgentDto,
  ) {
    return this.agentsService.update(userId, agentId, input);
  }

  @Post(':agentId/publish')
  publish(@CurrentUser('id') userId: string, @Param('agentId') agentId: string) {
    return this.agentsService.publish(userId, agentId);
  }
}
