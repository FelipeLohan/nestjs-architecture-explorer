# nestjs-arch-explorer

[![npm version](https://img.shields.io/npm/v/nestjs-arch-explorer?color=6366f1&label=npm)](https://www.npmjs.com/package/nestjs-arch-explorer)
[![CI](https://github.com/FelipeLohan/nestjs-architecture-explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/FelipeLohan/nestjs-architecture-explorer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-10b981.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-FelipeLohan%2Fnestjs--architecture--explorer-24292e?logo=github)](https://github.com/FelipeLohan/nestjs-architecture-explorer)

Plug-and-play NestJS library that inspects the Dependency Injection container **at runtime** and displays an interactive architecture graph dashboard — zero extra decorators required.

> Add one import. Open `/arch`. See your whole app.

---

## Features

- Auto-discovers all **Modules**, **Controllers**, and **Providers** via `DiscoveryService`
- Interactive graph rendered with [React Flow](https://reactflow.dev/) + dagre layout
- **Hover any node** to highlight its relationships (Obsidian-style dim effect)
- Click any node to inspect type, scope, injected dependencies, and HTTP endpoints
- **Download diagram as PNG** with one click
- Configurable route paths and custom security guard
- One flag to disable in production: `enabled: false`
- Zero decorators required in application code

---

## Installation

```bash
npm install nestjs-arch-explorer
```

## Quick start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ExplorerModule } from 'nestjs-arch-explorer';

@Module({
  imports: [
    ExplorerModule.forRoot({
      enabled: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}
```

Start your app and open **`http://localhost:3000/arch`**.

---

## Configuration

```typescript
ExplorerModule.forRoot({
  enabled?:       boolean;       // default: true
  apiPath?:       string;        // default: 'explorer-data'
  dashboardPath?: string;        // default: 'arch'
  guardFn?:       () => boolean; // called on every JSON API request; returns false → 403
})
```

> **Note:** `guardFn` protects the JSON endpoint (`/explorer-data`). The dashboard static assets (`/arch`) are always served so the UI can display an error message when access is denied.

### Example — custom paths + guard

```typescript
ExplorerModule.forRoot({
  apiPath:       'internal/arch-data',
  dashboardPath: 'internal/arch',
  guardFn:       () => process.env.NODE_ENV === 'development',
})
```

---

## API

| Method | Path (default)   | Description                             |
|--------|------------------|-----------------------------------------|
| `GET`  | `/explorer-data` | Returns full `ArchitectureMap` as JSON  |
| `GET`  | `/arch`          | Serves the interactive graph dashboard  |

### `ArchitectureMap` shape

```typescript
interface ArchitectureMap {
  modules:     ModuleNode[];
  controllers: ComponentNode[];
  providers:   ComponentNode[];
}

interface ModuleNode {
  name:        string;
  controllers: string[];
  providers:   string[];
}

interface ComponentNode {
  name:         string;
  type:         'controller' | 'provider';
  scope:        'DEFAULT'    // Singleton (shared instance)
              | 'TRANSIENT'  // new instance per injection
              | 'REQUEST';   // new instance per request
  dependencies: string[];
  routes?:      RouteInfo[]; // only present on controllers
}

interface RouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'ALL';
  path:   string;
}
```

---

## How it works

On `onModuleInit`, `ArchitectureScanner` uses NestJS's built-in `DiscoveryService` and `ModulesContainer` to:

1. Enumerate all registered modules, controllers, and providers
2. Filter out NestJS framework internals
3. Resolve constructor parameter types via `Reflect.getMetadata('design:paramtypes', ...)`
4. Extract HTTP routes via `Reflect.getMetadata('method' | 'path', ...)`
5. Build an `ArchitectureMap` exposed at `/explorer-data`

The dashboard at `/arch` fetches that JSON and renders an interactive React Flow graph:

| Node colour | Represents  |
|-------------|-------------|
| Indigo      | Module      |
| Emerald     | Controller  |
| Amber       | Provider    |
| Orange arrow | `injects` dependency edge |

---

## Peer dependencies

- `@nestjs/common` ^10 or ^11
- `@nestjs/core` ^10 or ^11
- `@nestjs/platform-express` ^10 or ^11
- `reflect-metadata` ^0.1 or ^0.2
- `rxjs` ^7

---

## License

[MIT](LICENSE) © FelipeLohan
