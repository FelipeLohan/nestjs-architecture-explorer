import type { RouteInfo, SelectedNode } from '../types';

const METHOD_COLOR: Record<string, string> = {
  GET:     '#10b981',
  POST:    '#3b82f6',
  PUT:     '#f59e0b',
  PATCH:   '#8b5cf6',
  DELETE:  '#ef4444',
  ALL:     '#71717a',
  OPTIONS: '#71717a',
  HEAD:    '#71717a',
};

interface Props {
  selected: SelectedNode | null;
}

const SCOPE_LABEL: Record<string, string> = {
  DEFAULT:   'Singleton',
  TRANSIENT: 'Transient',
  REQUEST:   'Request',
};

const KIND_ICON: Record<string, string> = {
  module:     '⬡',
  controller: '→',
  provider:   '◈',
};

export function DetailPanel({ selected }: Props) {
  return (
    <aside style={panel}>
      {!selected && <Placeholder />}
      {selected?.kind === 'module'    && <ModuleDetail data={selected.data} />}
      {selected?.kind === 'component' && <ComponentDetail data={selected.data} />}
    </aside>
  );
}

function Placeholder() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <span style={{ fontSize: 24, opacity: .2 }}>◈</span>
      <span style={{ fontSize: 12, color: 'var(--subtle)' }}>Selecione um nó</span>
    </div>
  );
}

function ModuleDetail({ data }: { data: { name: string; controllers: string[]; providers: string[] } }) {
  return (
    <>
      <NodeHeader icon="⬡" name={data.name} typeLabel="Module" typeColor="var(--module)" />
      <Divider />
      <Section title="Controllers" count={data.controllers.length}>
        {data.controllers.map((c) => <Item key={c} label={c} color="var(--controller)" />)}
      </Section>
      <Section title="Providers" count={data.providers.length}>
        {data.providers.map((p) => <Item key={p} label={p} color="var(--provider)" />)}
      </Section>
    </>
  );
}

function ComponentDetail({ data }: { data: { name: string; type: string; scope: string; dependencies: string[]; routes?: RouteInfo[] } }) {
  const color = data.type === 'controller' ? 'var(--controller)' : 'var(--provider)';
  return (
    <>
      <NodeHeader icon={KIND_ICON[data.type] ?? '◈'} name={data.name} typeLabel={data.type} typeColor={color} scopeLabel={SCOPE_LABEL[data.scope] ?? data.scope} />
      <Divider />
      {data.type === 'controller' && (
        <Section title="Endpoints" count={data.routes?.length ?? 0}>
          {(data.routes ?? []).map((r) => <RouteItem key={`${r.method}:${r.path}`} route={r} />)}
        </Section>
      )}
      {data.type === 'controller' && <Divider />}
      <Section title="Dependências" count={data.dependencies.length}>
        {data.dependencies.map((d) => <Item key={d} label={d} color="var(--inject)" />)}
      </Section>
    </>
  );
}

function NodeHeader({ icon, name, typeLabel, typeColor, scopeLabel }: { icon: string; name: string; typeLabel: string; typeColor: string; scopeLabel?: string }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: typeColor, fontSize: 16 }}>{icon}</span>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.4 }}>{name}</h2>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <Badge label={typeLabel} color={typeColor} />
        {scopeLabel && <Badge label={scopeLabel} color="var(--subtle)" />}
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--subtle)' }}>{title}</span>
        <span style={{ fontSize: 10, color: 'var(--subtle)', background: 'var(--surface2)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>
      </div>
      {count === 0
        ? <span style={{ fontSize: 12, color: 'var(--subtle)' }}>—</span>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>}
    </div>
  );
}

function RouteItem({ route }: { route: RouteInfo }) {
  const color = METHOD_COLOR[route.method] ?? '#71717a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', background: 'var(--surface2)', borderRadius: 6 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color, background: `color-mix(in srgb, ${color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
        {route.method}
      </span>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)', wordBreak: 'break-all' }}>{route.path}</span>
    </div>
  );
}

function Item({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--surface2)', borderRadius: 6, borderLeft: `2px solid ${color}` }}>
      <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--muted)', wordBreak: 'break-all' }}>{label}</span>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'capitalize', color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`, borderRadius: 20, padding: '2px 8px' }}>
      {label}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--surface2)', margin: '16px 0' }} />;
}

const panel: React.CSSProperties = {
  width: 280,
  minWidth: 280,
  background: 'var(--surface)',
  padding: '16px 14px',
  overflowY: 'auto',
  borderLeft: '1px solid var(--surface2)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};
