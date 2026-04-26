import { Handle, Position, type NodeProps } from '@xyflow/react';
import { KIND_COLOR, KIND_ICON, nodeWidth, nodeHeight } from './constants';
import { useHoverState } from './hover-context';
import './ArchNode.css';

export function ArchNode({ id, data, selected }: NodeProps) {
  const kind    = data.kind    as string;
  const label   = data.label   as string;
  const subline = data.subline as string | undefined;
  const color   = KIND_COLOR[kind] ?? '#52525b';
  const w = nodeWidth(kind, label);
  const h = nodeHeight(kind);

  const { hoveredId, highlightedIds } = useHoverState();
  const hoverClass =
    hoveredId === null      ? ''
    : hoveredId === id      ? 'arch-node--hovered'
    : highlightedIds.has(id) ? 'arch-node--neighbour'
    :                          'arch-node--dimmed';

  const cls = [
    'arch-node',
    kind === 'module' && 'arch-node--module',
    selected          && 'arch-node--selected',
    hoverClass,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ '--node-color': color, width: w, height: h } as React.CSSProperties}>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, width: 1, height: 1 }} />

      <div className="arch-node__name-row">
        <span className="arch-node__icon">{KIND_ICON[kind]}</span>
        <span className="arch-node__label">{label}</span>
      </div>

      {subline && <span className="arch-node__subline">{subline}</span>}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, width: 1, height: 1 }} />
    </div>
  );
}
