import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { Core, NodeSingular } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { buildElements } from '../cytoscape-builder';
import type { ArchitectureMap, SelectedNode } from '../types';

cytoscape.use(dagre);

const KIND_COLOR: Record<string, string> = {
  module:     '#6366f1',
  controller: '#10b981',
  provider:   '#f59e0b',
};

interface Props {
  map: ArchitectureMap;
  onSelect: (node: SelectedNode | null) => void;
}

export function ArchGraph({ map, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(map),
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': (ele: NodeSingular) => KIND_COLOR[ele.data('kind')] ?? '#52525b',
            'background-opacity': 0.15,
            'border-width': 1.5,
            'border-color': (ele: NodeSingular) => KIND_COLOR[ele.data('kind')] ?? '#52525b',
            color: '#fafafa',
            'font-size': 10,
            'font-family': "'Inter', system-ui, sans-serif",
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'none',
            width: (ele: NodeSingular) => {
              const label = (ele.data('label') as string) ?? '';
              const min = ele.data('kind') === 'module' ? 110 : 90;
              return Math.max(min, label.length * 6.5 + 24);
            },
            height: (ele: NodeSingular) => ele.data('kind') === 'module' ? 40 : 32,
            shape: 'round-rectangle',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'background-opacity': 0.35,
            'border-width': 2,
          },
        },
        {
          selector: 'node:active',
          style: { 'overlay-opacity': 0 },
        },
        {
          selector: 'edge[kind="contains"]',
          style: {
            width: 1,
            'line-color': '#3f3f46',
            'target-arrow-color': '#3f3f46',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
          },
        },
        {
          selector: 'edge[kind="injects"]',
          style: {
            width: 1.5,
            'line-color': '#f97316',
            'target-arrow-color': '#f97316',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'taxi',
            'taxi-direction': 'auto',
            'taxi-turn': '60%',
            'line-style': 'dashed',
            'line-dash-pattern': [6, 3],
          },
        },
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 60,
        edgeSep: 10,
        rankSep: 100,
        marginx: 20,
        marginy: 12,
        ranker: 'network-simplex',
        spacingFactor: 1.5,
        padding: 48,
        fit: true,
      } as cytoscape.LayoutOptions,
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target as NodeSingular;
      const kind = node.data('kind') as string;
      const name = node.data('id') as string;
      if (kind === 'module') {
        const mod = map.modules.find((m) => m.name === name);
        if (mod) onSelect({ kind: 'module', data: mod });
      } else {
        const component = map.controllers.find((c) => c.name === name) ?? map.providers.find((p) => p.name === name);
        if (component) onSelect({ kind: 'component', data: component });
      }
    });
    cy.on('tap', (evt) => { if (evt.target === cy) onSelect(null); });

    cyRef.current = cy;
    return () => cy.destroy();
  }, [map]);

  const fit    = () => cyRef.current?.fit(undefined, 32);
  const zoomIn  = () => cyRef.current?.zoom({ level: (cyRef.current?.zoom() ?? 1) * 1.25, renderedPosition: { x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 } });
  const zoomOut = () => cyRef.current?.zoom({ level: (cyRef.current?.zoom() ?? 1) * 0.8, renderedPosition: { x: (containerRef.current?.clientWidth ?? 0) / 2, y: (containerRef.current?.clientHeight ?? 0) / 2 } });

  return (
    <div style={{ position: 'relative', flex: 1, background: 'var(--bg)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, background: 'var(--surface)', border: '1px solid var(--surface2)', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Object.entries(KIND_COLOR).map(([kind, color]) => (
          <span key={kind} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color, opacity: .9, flexShrink: 0 }} />
            {kind}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--muted)' }}>
          <span style={{ width: 18, borderTop: '2px dashed #f97316', flexShrink: 0 }} />
          injects
        </span>
      </div>

      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {([['+', zoomIn], ['−', zoomOut], ['⊡', fit]] as const).map(([label, fn]) => (
          <button key={label} onClick={fn as () => void} style={{ width: 30, height: 30, background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--surface2)', borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
