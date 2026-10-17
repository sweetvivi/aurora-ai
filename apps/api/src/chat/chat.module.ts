import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { FilesModule } from '../files/files.module';
import { ModelsModule } from '../models/models.module';
import { PointsModule } from '../points/points.module';
import { ProvidersModule } from '../providers/providers.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [ConversationsModule, FilesModule, ModelsModule, PointsModule, ProvidersModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
