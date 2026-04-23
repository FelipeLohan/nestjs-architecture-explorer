import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import type { ArchitectureMap, SelectedNode } from '../types';

/* ── colours ─────────────────────────────────────────────── */
const KIND_COLOR: Record<string, string> = {
  module:     '#6366f1',
  controller: '#10b981',
  provider:   '#f59e0b',
};
const KIND_ICON: Record<string, string> = {
  module:     '⬡',
  controller: '⇢',
  provider:   '◈',
};

/* ── node size helpers ────────────────────────────────────── */
const MIN_W: Record<string, number> = { module: 170, controller: 160, provider: 155 };
const NODE_H: Record<string, number> = { module: 58,  controller: 52,  provider: 44  };

function nodeWidth(kind: string, label: string): number {
  return Math.max(MIN_W[kind] ?? 155, label.length * 7 + 52);
}
function nodeHeight(kind: string): number {
  return NODE_H[kind] ?? 44;
}

/* ── custom node ──────────────────────────────────────────── */
function ArchNode({ data, selected }: NodeProps) {
  const kind     = data.kind     as string;
  const label    = data.label    as string;
  const subline  = data.subline  as string | undefined;
  const color    = KIND_COLOR[kind] ?? '#52525b';
  const isModule = kind === 'module';
  const w        = nodeWidth(kind, label);
  const h        = nodeHeight(kind);

  return (
    <div style={{
      width: w, height: h,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 3,
      padding: '0 14px', boxSizing: 'border-box',
      borderRadius: isModule ? 12 : 8,
      border: `${selected ? 2 : 1.5}px solid ${color}`,
      background: `color-mix(in srgb, ${color} ${selected ? 20 : 11}%, #09090b)`,
      boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)` : 'none',
      color: '#fafafa',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'box-shadow .15s',
    }}>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, width: 1, height: 1 }} />

      {/* name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
        <span style={{ color, fontSize: isModule ? 13 : 11, lineHeight: 1, flexShrink: 0 }}>
          {KIND_ICON[kind]}
        </span>
        <span style={{
          fontSize: isModule ? 12 : 11,
          fontWeight: isModule ? 600 : 500,
          fontFamily: "'Inter', system-ui, sans-serif",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
      </div>

      {/* stats row */}
      {subline && (
        <span style={{
          fontSize: 9, color: `color-mix(in srgb, ${color} 70%, #a1a1aa)`,
          fontFamily: 'monospace', letterSpacing: '.02em',
        }}>
          {subline}
        </span>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}

const nodeTypes = { archNode: ArchNode };

/* ── build React Flow elements + dagre layout ─────────────── */
function buildElements(map: ArchitectureMap): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seen  = new Set<string>();

  const addNode = (id: string, kind: string, subline?: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const w = nodeWidth(kind, id);
    const h = nodeHeight(kind);
    nodes.push({
      id, type: 'archNode',
      position: { x: 0, y: 0 },
      data: { label: id, kind, subline },
      style: { width: w, height: h },
    });
  };

  for (const mod of map.modules) {
    const sub = [
      mod.controllers.length && `${mod.controllers.length} ctrl`,
      mod.providers.length   && `${mod.providers.length} prov`,
    ].filter(Boolean).join(' · ');
    addNode(mod.name, 'module', sub || undefined);
    for (const c of mod.controllers) {
      const ctrl = map.controllers.find((x) => x.name === c);
      const parts = [
        ctrl?.routes?.length   && `${ctrl.routes.length} routes`,
        ctrl?.dependencies.length && `${ctrl.dependencies.length} deps`,
      ].filter(Boolean).join(' · ');
      addNode(c, 'controller', parts || undefined);
    }
    for (const p of mod.providers) {
      const prov = map.providers.find((x) => x.name === p);
      const deps = prov?.dependencies.length;
      addNode(p, 'provider', deps ? `${deps} deps` : undefined);
    }
  }
  for (const c of map.controllers) {
    const parts = [
      c.routes?.length      && `${c.routes.length} routes`,
      c.dependencies.length && `${c.dependencies.length} deps`,
    ].filter(Boolean).join(' · ');
    addNode(c.name, 'controller', parts || undefined);
  }
  for (const p of map.providers) {
    const deps = p.dependencies.length;
    addNode(p.name, 'provider', deps ? `${deps} deps` : undefined);
  }

  /* injects edges — built first so they become the source of truth for suppression */
  const injectsMarker  = { type: MarkerType.ArrowClosed, color: '#f97316', width: 10, height: 10 };
  // injectSources: for each provider, the set of components that inject it
  const injectSources = new Map<string, Set<string>>();
  for (const comp of [...map.controllers, ...map.providers]) {
    for (const dep of comp.dependencies) {
      if (!seen.has(dep)) continue;
      edges.push({ id: `i-${comp.name}-${dep}`, source: comp.name, target: dep,
        type: 'smoothstep', animated: true, markerEnd: injectsMarker,
        style: { stroke: '#f97316', strokeWidth: 1.5 } });
      if (!injectSources.has(dep)) injectSources.set(dep, new Set());
      injectSources.get(dep)!.add(comp.name);
    }
  }

  /* contains edges */
  const containsMarker = { type: MarkerType.ArrowClosed, color: '#3f3f46', width: 10, height: 10 };
  for (const mod of map.modules) {
    const moduleMembers = new Set([...mod.controllers, ...mod.providers]);

    // Module → Controller always
    for (const c of mod.controllers)
      edges.push({ id: `c-${mod.name}-${c}`, source: mod.name, target: c,
        type: 'smoothstep', markerEnd: containsMarker,
        style: { stroke: '#3f3f46', strokeWidth: 1 } });

    // Module → Provider only if no member of this module already injects it
    for (const p of mod.providers) {
      const sources = injectSources.get(p);
      const isMediated = sources ? [...sources].some((s) => moduleMembers.has(s)) : false;
      if (!isMediated)
        edges.push({ id: `c-${mod.name}-${p}`, source: mod.name, target: p,
          type: 'smoothstep', markerEnd: containsMarker,
          style: { stroke: '#3f3f46', strokeWidth: 1 } });
    }
  }

  /* dagre layout */
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 70, ranksep: 110, marginx: 40, marginy: 40 });
  for (const n of nodes) {
    g.setNode(n.id, { width: nodeWidth(n.data.kind as string, n.id), height: nodeHeight(n.data.kind as string) });
  }
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);
  for (const n of nodes) {
    const pos = g.node(n.id);
    const w = nodeWidth(n.data.kind as string, n.id);
    const h = nodeHeight(n.data.kind as string);
    n.position = { x: pos.x - w / 2, y: pos.y - h / 2 };
  }

  return { nodes, edges };
}

/* ── component ────────────────────────────────────────────── */
interface Props {
  map: ArchitectureMap;
  onSelect: (node: SelectedNode | null) => void;
}

export function ArchGraph({ map, onSelect }: Props) {
  const { nodes: ln, edges: le } = useMemo(() => buildElements(map), [map]);
  const [nodes, , onNodesChange] = useNodesState(ln);
  const [edges, , onEdgesChange] = useEdgesState(le);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const kind = node.data.kind as string;
    const name = node.id;
    if (kind === 'module') {
      const mod = map.modules.find((m) => m.name === name);
      if (mod) onSelect({ kind: 'module', data: mod });
    } else {
      const comp =
        map.controllers.find((c) => c.name === name) ??
        map.providers.find((p) => p.name === name);
      if (comp) onSelect({ kind: 'component', data: comp });
    }
  }, [map, onSelect]);

  return (
    <div style={{ flex: 1, height: '100%' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => onSelect(null)}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.15 }}
        minZoom={0.08} maxZoom={2.5}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />

        <Controls
          showInteractive={false}
          style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }}
        />

        <MiniMap
          nodeColor={(n) => KIND_COLOR[n.data?.kind as string] ?? '#52525b'}
          nodeStrokeWidth={0}
          nodeBorderRadius={4}
          maskColor="rgba(9,9,11,0.75)"
          style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }}
        />

        {/* Legend */}
        <Panel position="top-right" style={{ display: 'flex', flexDirection: 'column', gap: 5,
          background: 'var(--surface)', border: '1px solid var(--surface2)',
          borderRadius: 8, padding: '8px 12px', fontSize: 10, color: 'var(--muted)' }}>
          {Object.entries(KIND_COLOR).map(([kind, color]) => (
            <span key={kind} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: color, opacity: .9, flexShrink: 0 }} />
              {kind}
            </span>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, paddingTop: 6, borderTop: '1px solid var(--surface2)' }}>
            <span style={{ width: 18, borderTop: '2px solid #f97316', flexShrink: 0 }} />
            injects
          </span>
        </Panel>
      </ReactFlow>
    </div>
  );
}
