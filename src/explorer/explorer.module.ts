import { DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ArchitectureScanner } from './architecture-scanner.js';
import { createDashboardController } from './dashboard.controller.js';
import { createExplorerController } from './explorer.controller.js';
import {
  EXPLORER_OPTIONS,
  ExplorerModuleOptions,
} from './explorer-options.interface.js';

@Module({})
export class ExplorerModule {
  static forRoot(options: ExplorerModuleOptions = {}): DynamicModule {
    const enabled = options.enabled ?? true;
    const apiPath = options.apiPath ?? 'explorer-data';
    const dashboardPath = options.dashboardPath ?? 'architecture';

    const optionsProvider = {
      provide: EXPLORER_OPTIONS,
      useValue: options,
    };

    if (!enabled) {
      return {
        module: ExplorerModule,
        providers: [optionsProvider],
      };
    }

    const ExplorerController = createExplorerController(apiPath);
    const DashboardController = createDashboardController(dashboardPath);

    return {
      module: ExplorerModule,
      imports: [DiscoveryModule],
      controllers: [ExplorerController, DashboardController],
      providers: [optionsProvider, ArchitectureScanner],
      exports: [ArchitectureScanner],
    };
  }
}
