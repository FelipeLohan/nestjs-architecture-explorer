export interface ExplorerModuleOptions {
  dashboardPath?: string;
  apiPath?: string;
  enabled?: boolean;
  guardFn?: () => boolean;
}

export const EXPLORER_OPTIONS = Symbol('EXPLORER_OPTIONS');
