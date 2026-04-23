import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExplorerModule } from './explorer/explorer.module';

@Module({
  imports: [ExplorerModule.forRoot({ enabled: true })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
