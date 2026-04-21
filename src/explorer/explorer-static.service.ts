import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { EXPLORER_OPTIONS, type ExplorerModuleOptions } from './explorer-options.interface.js';

@Injectable()
export class ExplorerStaticService implements OnModuleInit {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(EXPLORER_OPTIONS) private readonly options: ExplorerModuleOptions,
  ) {}

  onModuleInit(): void {
    if (!(this.options.enabled ?? true)) return;

    const dashboardPath = this.options.dashboardPath ?? 'architecture';
    const publicDir = join(__dirname, 'public');

    const { httpAdapter } = this.httpAdapterHost;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const app = httpAdapter.getInstance<any>();

    // Register express.static to serve the built frontend assets
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expressStatic = require('express').static as (path: string) => unknown;
    app.use(`/${dashboardPath}`, expressStatic(publicDir));
  }
}
