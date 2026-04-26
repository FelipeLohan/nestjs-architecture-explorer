import 'reflect-metadata';
import { Controller, Get, Post, Put, Delete, Patch } from '@nestjs/common';
import { DiscoveryService, ModuleRef } from '@nestjs/core';
import { ArchitectureScanner } from './architecture-scanner';
import type { RouteInfo } from './explorer.types';

/* ── helpers ─────────────────────────────────────────────────── */

function mockWrapper(metatypeName: string | null, token?: string) {
  return {
    metatype: metatypeName !== null ? { name: metatypeName } : null,
    token: token ?? metatypeName ?? '',
  };
}

type ScannerPrivate = {
  isUserDefined: (w: ReturnType<typeof mockWrapper>) => boolean;
  resolveScopeName: (scope: number | symbol | undefined) => string;
  extractRoutes: (metatype: NewableFunction) => RouteInfo[];
};

/* ── test controllers (decorators run at definition time) ─────── */

@Controller('users')
class UsersController {
  @Get() findAll() {
    return [];
  }
  @Get(':id') findOne() {
    return {};
  }
  @Post() create() {
    return {};
  }
  @Put(':id') update() {
    return {};
  }
  @Patch(':id') patch() {
    return {};
  }
  @Delete(':id') remove() {
    return {};
  }
  helper() {
    return null;
  }
}

@Controller()
class RootController {
  @Get('health') check() {
    return 'ok';
  }
}

/* ── suite ───────────────────────────────────────────────────── */

describe('ArchitectureScanner', () => {
  let s: ScannerPrivate;

  beforeEach(() => {
    const scanner = new ArchitectureScanner(
      {} as DiscoveryService,
      {} as ModuleRef,
    );
    s = scanner as unknown as ScannerPrivate;
  });

  /* ── isUserDefined ──────────────────────────────────────────── */

  describe('isUserDefined', () => {
    it('returns false when metatype is null', () => {
      expect(s.isUserDefined(mockWrapper(null))).toBe(false);
    });

    it('returns false for built-in NestJS names', () => {
      const internals = [
        'ModuleRef',
        'DiscoveryService',
        'Reflector',
        'HttpAdapterHost',
        'MetadataScanner',
        'ApplicationConfig',
      ];
      for (const name of internals) {
        expect(s.isUserDefined(mockWrapper(name))).toBe(false);
      }
    });

    it('returns false for names matching INTERNAL_PATTERNS', () => {
      const patterns = [
        'useFactory',
        'useClass',
        'useValue',
        'noop',
        'lazyModuleLoader',
      ];
      for (const name of patterns) {
        expect(s.isUserDefined(mockWrapper(name))).toBe(false);
      }
    });

    it('returns false for string tokens starting with __', () => {
      expect(s.isUserDefined(mockWrapper('SomeService', '__internal__'))).toBe(
        false,
      );
    });

    it('returns true for regular user-defined classes', () => {
      expect(s.isUserDefined(mockWrapper('UserService'))).toBe(true);
      expect(s.isUserDefined(mockWrapper('PostsController'))).toBe(true);
      expect(s.isUserDefined(mockWrapper('AuthModule'))).toBe(true);
    });
  });

  /* ── resolveScopeName ───────────────────────────────────────── */

  describe('resolveScopeName', () => {
    it('returns DEFAULT for scope 0', () => {
      expect(s.resolveScopeName(0)).toBe('DEFAULT');
    });

    it('returns DEFAULT for undefined', () => {
      expect(s.resolveScopeName(undefined)).toBe('DEFAULT');
    });

    it('returns TRANSIENT for scope 1', () => {
      expect(s.resolveScopeName(1)).toBe('TRANSIENT');
    });

    it('returns REQUEST for scope 2', () => {
      expect(s.resolveScopeName(2)).toBe('REQUEST');
    });

    it('returns DEFAULT for an unrecognised numeric scope', () => {
      expect(s.resolveScopeName(99)).toBe('DEFAULT');
    });
  });

  /* ── extractRoutes ──────────────────────────────────────────── */

  describe('extractRoutes', () => {
    it('extracts all decorated HTTP methods and ignores plain methods', () => {
      const routes = s.extractRoutes(UsersController);
      expect(routes).toHaveLength(6);
    });

    it('maps HTTP verbs and paths correctly', () => {
      const routes = s.extractRoutes(UsersController);
      expect(routes).toContainEqual({ method: 'GET', path: '/users' });
      expect(routes).toContainEqual({ method: 'GET', path: '/users/:id' });
      expect(routes).toContainEqual({ method: 'POST', path: '/users' });
      expect(routes).toContainEqual({ method: 'PUT', path: '/users/:id' });
      expect(routes).toContainEqual({ method: 'PATCH', path: '/users/:id' });
      expect(routes).toContainEqual({ method: 'DELETE', path: '/users/:id' });
    });

    it('ignores methods without an HTTP decorator', () => {
      const routes = s.extractRoutes(UsersController);
      const paths = routes.map((r) => r.path);
      expect(paths.every((p) => p.startsWith('/users'))).toBe(true);
    });

    it('handles a controller with no base path', () => {
      const routes = s.extractRoutes(RootController);
      expect(routes).toContainEqual({ method: 'GET', path: '/health' });
    });

    it('normalises double slashes when base path is empty', () => {
      const routes = s.extractRoutes(RootController);
      expect(routes.every((r) => !r.path.includes('//'))).toBe(true);
    });
  });
});
