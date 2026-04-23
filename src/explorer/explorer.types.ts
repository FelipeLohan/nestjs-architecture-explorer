export interface RouteInfo {
  method: string;
  path: string;
}

export interface ComponentNode {
  name: string;
  type: 'controller' | 'provider';
  scope: string;
  dependencies: string[];
  routes?: RouteInfo[];
}

export interface ModuleNode {
  name: string;
  controllers: string[];
  providers: string[];
}

export interface ArchitectureMap {
  modules: ModuleNode[];
  controllers: ComponentNode[];
  providers: ComponentNode[];
}
