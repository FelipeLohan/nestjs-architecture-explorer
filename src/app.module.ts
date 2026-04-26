import { Module } from '@nestjs/common';
import { ExplorerModule } from './explorer/explorer.module';

@Module({
  imports: [ExplorerModule.forRoot({ enabled: true })],
})
export class AppModule {}
