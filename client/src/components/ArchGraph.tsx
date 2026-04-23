import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
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

const KIND_COLOR: Record<string, string> = {
  module:     '#6366f1',
  controller: '#10b981',
  provider:   '#f59e0b',
};

const NODE_SIZE: Record<string, { w: number; h: number }> = {
  module:     { w: 160, h: 44 },
  controller: { w: 150, h: 36 },
  provider:   { w: 150, h: 36 },
};

function sizeOf(kind: string) {
  return NODE_SIZE[kind] ?? NODE_SIZE.provider;
}

function ArchNode({ data, selected }: NodeProps) {
  const kind = data.kind as string;
  const color = KIND_COLOR[kind] ?? '#52525b';
  const { w, h } = sizeOf(kind);
  const isModule = kind === 'module';

  return (
    <div style={{
      width: w,
      height: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 12px',
      boxSizing: 'border-box',
      borderRadius: isModule ? 10 : 8,
      border: `${selected ? 2 : 1.5}px solid ${color}`,
      background: `color-mix(in srgb, ${color} ${selected ? 22 : 12}%, #09090b)`,
      color: '#fafafa',
      fontSize: isModule ? 12 : 11,
      fontWeight: isModule ? 600 : 400,
      fontFamily: "'Inter', system-ui, sans-serif",
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, width: 1, height: 1 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {data.label as string}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}

const nodeTypes = { archNode: ArchNode };

function buildElements(map: ArchitectureMap): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seen = new Set<string>();

  const addNode = (id: string, kind: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const { w, h } = sizeOf(kind);
    nodes.push({
      id,
      type: 'archNode',
      position: { x: 0, y: 0 },
      data: { label: id, kind },
      style: { width: w, height: h },
    });
  };

  for (const mod of map.modules) {
    addNode(mod.name, 'module');
    for (const c of mod.controllers) addNode(c, 'controller');
    for (const p of mod.providers)   addNode(p, 'provider');
  }
  for (const c of map.controllers) addNode(c.name, 'controller');
  for (const p of map.providers)   addNode(p.name, 'provider');

  const containsMarker = { type: MarkerType.ArrowClosed, color: '#52525b', width: 10, height: 10 };
  const injectsMarker  = { type: MarkerType.ArrowClosed, color: '#f97316', width: 10, height: 10 };

  for (const mod of map.modules) {
    for (const c of mod.controllers) {
      edges.push({ id: `c-${mod.name}-${c}`, source: mod.name, target: c,
        type: 'smoothstep', markerEnd: containsMarker,
        style: { stroke: '#52525b', strokeWidth: 1 } });
    }
    for (const p of mod.providers) {
      edges.push({ id: `c-${mod.name}-${p}`, source: mod.name, target: p,
        type: 'smoothstep', markerEnd: containsMarker,
        style: { stroke: '#52525b', strokeWidth: 1 } });
    }
  }

  for (const comp of [...map.controllers, ...map.providers]) {
    for (const dep of comp.dependencies) {
      if (seen.has(dep)) {
        edges.push({ id: `i-${comp.name}-${dep}`, source: comp.name, target: dep,
          type: 'smoothstep', markerEnd: injectsMarker,
          style: { stroke: '#f97316', strokeWidth: 1.5, strokeDasharray: '6 3' } });
      }
    }
  }

  // Dagre layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120, marginx: 40, marginy: 40 });

  for (const n of nodes) {
    const { w, h } = sizeOf(n.data.kind as string);
    g.setNode(n.id, { width: w, height: h });
  }
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  for (const n of nodes) {
    const pos = g.node(n.id);
    const { w, h } = sizeOf(n.data.kind as string);
    n.position = { x: pos.x - w / 2, y: pos.y - h / 2 };
  }

  return { nodes, edges };
}

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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => onSelect(null)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2.5}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls
          showInteractive={false}
          style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  );
}
