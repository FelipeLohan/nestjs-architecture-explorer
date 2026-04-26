import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, BackgroundVariant,
  type Node, type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ArchitectureMap, SelectedNode } from '../types';
import { ArchNode } from '../graph/ArchNode';
import { buildNodes } from '../graph/node-builder';
import { buildEdges } from '../graph/edge-builder';
import { applyDagreLayout } from '../graph/layout';
import { KIND_COLOR } from '../graph/constants';
import { HoverContext } from '../graph/hover-context';

const nodeTypes = { archNode: ArchNode };

function buildElements(map: ArchitectureMap) {
  const { nodes: raw, seen } = buildNodes(map);
  const { edges } = buildEdges(map, seen);
  return { nodes: applyDagreLayout(raw, edges), edges };
}

/**
 * Directional 2-hop traversal — mirrors the architecture hierarchy:
 *   module     → contains children → providers those children inject
 *   controller → parent module    + providers it injects
 *   provider   → injectors        → modules of those injectors
 */
function computeHighlightedIds(
  hoveredId: string,
  hoveredKind: string,
  edges: Edge[],
): Set<string> {
  const ids = new Set([hoveredId]);
  const inject   = (e: Edge) => !!e.animated;   // orange inject arrows
  const contains = (e: Edge) => !e.animated;    // gray contains arrows

  if (hoveredKind === 'module') {
    // hop 1: direct children (controllers + providers) via contains edges
    const children = new Set<string>();
    for (const e of edges)
      if (contains(e) && e.source === hoveredId) { ids.add(e.target); children.add(e.target); }

    // hop 2: providers those children inject
    for (const e of edges)
      if (inject(e) && children.has(e.source)) ids.add(e.target);

  } else if (hoveredKind === 'controller') {
    // hop 1 up: module that owns this controller
    for (const e of edges)
      if (contains(e) && e.target === hoveredId) ids.add(e.source);

    // hop 1 down: providers this controller injects
    for (const e of edges)
      if (inject(e) && e.source === hoveredId) ids.add(e.target);

  } else {
    // provider — hop 1: everything that injects this provider
    const injectors = new Set<string>();
    for (const e of edges)
      if (inject(e) && e.target === hoveredId) { ids.add(e.source); injectors.add(e.source); }

    // hop 2: modules that own those injectors + any module that directly contains this provider
    for (const e of edges)
      if (contains(e) && (injectors.has(e.target) || e.target === hoveredId)) ids.add(e.source);
  }

  return ids;
}

interface Props {
  map: ArchitectureMap;
  onSelect: (node: SelectedNode | null) => void;
}

export function ArchGraph({ map, onSelect }: Props) {
  const graphRef = useRef<HTMLDivElement>(null);
  const { nodes: ln, edges: le } = useMemo(() => buildElements(map), [map]);
  const [nodes, , onNodesChange] = useNodesState(ln);
  const [edges, , onEdgesChange] = useEdgesState(le);

  /* ── hover state ──────────────────────────────────────────── */
  const [hovered, setHovered] = useState<{ id: string; kind: string } | null>(null);

  const highlightedIds = useMemo(
    () => hovered ? computeHighlightedIds(hovered.id, hovered.kind, edges) : new Set<string>(),
    [hovered, edges],
  );

  const displayEdges = useMemo(() => {
    if (!hovered) return edges;
    return edges.map((e) => {
      const lit = highlightedIds.has(e.source) && highlightedIds.has(e.target);
      return { ...e, style: { ...e.style, opacity: lit ? 1 : 0.06 } };
    });
  }, [hovered, highlightedIds, edges]);

  /* ── handlers ─────────────────────────────────────────────── */
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHovered({ id: node.id, kind: node.data.kind as string });
  }, []);

  const onNodeMouseLeave = useCallback(() => setHovered(null), []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const kind = node.data.kind as string;
    if (kind === 'module') {
      const mod = map.modules.find((m) => m.name === node.id);
      if (mod) onSelect({ kind: 'module', data: mod });
    } else {
      const comp =
        map.controllers.find((c) => c.name === node.id) ??
        map.providers.find((p) => p.name === node.id);
      if (comp) onSelect({ kind: 'component', data: comp });
    }
  }, [map, onSelect]);

  const downloadPng = useCallback(() => {
    if (!graphRef.current) return;
    void import('html-to-image')
      .then(({ toPng }) => toPng(graphRef.current!, { backgroundColor: '#09090b', pixelRatio: 2 }))
      .then((dataUrl) => {
        const a = document.createElement('a');
        a.download = 'architecture.png';
        a.href = dataUrl;
        a.click();
      });
  }, []);

  /* ── render ───────────────────────────────────────────────── */
  return (
    <HoverContext.Provider value={{ hoveredId: hovered?.id ?? null, highlightedIds }}>
      <div ref={graphRef} style={{ flex: 1, height: '100%' }}>
        <ReactFlow
          nodes={nodes} edges={displayEdges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onPaneClick={() => onSelect(null)}
          nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.15 }}
          minZoom={0.08} maxZoom={2.5}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
          <Controls showInteractive={false}
            style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }} />
          <MiniMap
            nodeColor={(n) => KIND_COLOR[n.data?.kind as string] ?? '#52525b'}
            nodeStrokeWidth={0} nodeBorderRadius={4} maskColor="rgba(9,9,11,0.75)"
            style={{ background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8 }} />

          <Panel position="top-right" style={{
            display: 'flex', flexDirection: 'column', gap: 5,
            background: 'var(--surface)', border: '1px solid var(--surface2)',
            borderRadius: 8, padding: '8px 12px', fontSize: 10, color: 'var(--muted)',
          }}>
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

          <Panel position="bottom-center">
            <button className="rf-panel-btn" onClick={downloadPng} title="Download diagram as PNG">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1v7M3 6l3 3 3-3M1 11h10" />
              </svg>
              Download PNG
            </button>
          </Panel>
        </ReactFlow>
      </div>
    </HoverContext.Provider>
  );
}
