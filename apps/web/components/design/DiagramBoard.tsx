"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import type { DesignComponentKind, DesignDiagram } from "@/lib/types";

export const BOARD_W = 1000;
export const BOARD_H = 640;
const NODE_W = 150;
const NODE_H = 56;

export const COMPONENT_ICONS: Record<DesignComponentKind, string> = {
  client: "💻",
  cdn: "🌐",
  load_balancer: "⚖️",
  api: "🔌",
  service: "⚙️",
  database: "🗄️",
  cache: "⚡",
  queue: "📬",
  storage: "🪣",
  worker: "🛠️",
  search: "🔎",
  other: "◻️",
};

type Selection = { type: "node"; id: string } | { type: "edge"; index: number } | null;

const clampX = (x: number) => Math.max(NODE_W / 2, Math.min(BOARD_W - NODE_W / 2, x));
const clampY = (y: number) => Math.max(NODE_H / 2, Math.min(BOARD_H - NODE_H / 2, y));

/** Where the segment from a node's center toward (tx, ty) leaves its rectangle. */
function borderPoint(cx: number, cy: number, tx: number, ty: number): [number, number] {
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return [cx, cy];
  const scale = Math.min(Math.abs((NODE_W / 2 + 6) / (dx || 1e-9)), Math.abs((NODE_H / 2 + 6) / (dy || 1e-9)));
  return [cx + dx * scale, cy + dy * scale];
}

let counter = 0;
const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/**
 * Whiteboard for system design: add components from the palette, drag them, connect two boxes
 * with a labeled arrow, rename or delete the selection. Coordinates live in a fixed 1000×640
 * space so the saved diagram renders the same at any width.
 */
export function DiagramBoard({
  diagram,
  onChange,
  components,
  readOnly = false,
}: {
  diagram: DesignDiagram;
  onChange?: (diagram: DesignDiagram) => void;
  components: ReadonlyArray<{ kind: DesignComponentKind; label: string }>;
  readOnly?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const byId = new Map(diagram.nodes.map((node) => [node.id, node]));
  const update = (next: DesignDiagram) => onChange?.(next);

  const toBoard = (event: { clientX: number; clientY: number }): [number, number] => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return [0, 0];
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return [point.x, point.y];
  };

  const addNode = (kind: DesignComponentKind, label: string) => {
    const offset = (diagram.nodes.length % 6) * 28;
    const node = { id: newId(kind), kind, label, x: clampX(160 + offset + (diagram.nodes.length % 3) * 260), y: clampY(110 + offset + Math.floor(diagram.nodes.length / 3) * 110) };
    update({ ...diagram, nodes: [...diagram.nodes, node] });
    setSelected({ type: "node", id: node.id });
  };

  const removeSelected = () => {
    if (!selected) return;
    if (selected.type === "node") {
      update({ nodes: diagram.nodes.filter((node) => node.id !== selected.id), edges: diagram.edges.filter((edge) => edge.from !== selected.id && edge.to !== selected.id) });
    } else {
      update({ ...diagram, edges: diagram.edges.filter((_, index) => index !== selected.index) });
    }
    setSelected(null);
    setConnectFrom(null);
  };

  useEffect(() => {
    if (readOnly) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        event.preventDefault();
        removeSelected();
      }
      if (event.key === "Escape") {
        setConnectFrom(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onNodePointerDown = (event: ReactPointerEvent<SVGGElement>, id: string) => {
    if (readOnly) return;
    event.stopPropagation();
    if (connectFrom && connectFrom !== id) {
      const exists = diagram.edges.some((edge) => edge.from === connectFrom && edge.to === id);
      if (!exists) update({ ...diagram, edges: [...diagram.edges, { from: connectFrom, to: id, label: "" }] });
      setSelected({ type: "edge", index: exists ? diagram.edges.findIndex((edge) => edge.from === connectFrom && edge.to === id) : diagram.edges.length });
      setConnectFrom(null);
      return;
    }
    const node = byId.get(id);
    if (!node) return;
    const [x, y] = toBoard(event);
    drag.current = { id, dx: x - node.x, dy: y - node.y, moved: false };
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    setSelected({ type: "node", id });
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = drag.current;
    if (!active) return;
    const [x, y] = toBoard(event);
    active.moved = true;
    update({ ...diagram, nodes: diagram.nodes.map((node) => (node.id === active.id ? { ...node, x: clampX(x - active.dx), y: clampY(y - active.dy) } : node)) });
  };

  const selectedNode = selected?.type === "node" ? byId.get(selected.id) : undefined;
  const selectedEdge = selected?.type === "edge" ? diagram.edges[selected.index] : undefined;

  return (
    <div className="flex h-full flex-col">
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2" role="toolbar" aria-label="Add a component">
          {components.map((component) => (
            <button
              key={component.kind}
              type="button"
              onClick={() => addNode(component.kind, component.label)}
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-ink-900/60 px-2 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-synapse/60 hover:text-fg"
            >
              <span aria-hidden="true">{COMPONENT_ICONS[component.kind]}</span>
              {component.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          className={cn("h-full w-full touch-none select-none", connectFrom && "cursor-crosshair")}
          role="img"
          aria-label={`System design diagram with ${diagram.nodes.length} components and ${diagram.edges.length} connections`}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => (drag.current = null)}
          onPointerDown={() => {
            if (!readOnly) {
              setSelected(null);
              setConnectFrom(null);
            }
          }}
        >
          <defs>
            <pattern id="board-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" className="fill-line" />
            </pattern>
            <marker id="board-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-fg-muted" />
            </marker>
            <marker id="board-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-synapse" />
            </marker>
          </defs>
          <rect width={BOARD_W} height={BOARD_H} fill="url(#board-dots)" />

          {diagram.edges.map((edge, index) => {
            const from = byId.get(edge.from);
            const to = byId.get(edge.to);
            if (!from || !to) return null;
            const [x1, y1] = borderPoint(from.x, from.y, to.x, to.y);
            const [x2, y2] = borderPoint(to.x, to.y, from.x, from.y);
            const active = selected?.type === "edge" && selected.index === index;
            return (
              <g
                key={`${edge.from}-${edge.to}-${index}`}
                onPointerDown={(event) => {
                  if (readOnly) return;
                  event.stopPropagation();
                  setSelected({ type: "edge", index });
                }}
                className={readOnly ? undefined : "cursor-pointer"}
              >
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="14" />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={active ? "stroke-synapse" : "stroke-fg-muted"}
                  strokeWidth={active ? 2.5 : 1.75}
                  markerEnd={`url(#${active ? "board-arrow-active" : "board-arrow"})`}
                />
                {edge.label ? (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="fill-fg-muted text-[13px]" paintOrder="stroke" strokeWidth="5" stroke="var(--color-ink-950, #0a0a0a)">
                    {edge.label}
                  </text>
                ) : null}
              </g>
            );
          })}

          {diagram.nodes.map((node) => {
            const active = selected?.type === "node" && selected.id === node.id;
            const source = connectFrom === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x - NODE_W / 2} ${node.y - NODE_H / 2})`}
                onPointerDown={(event) => onNodePointerDown(event, node.id)}
                className={readOnly ? undefined : "cursor-grab active:cursor-grabbing"}
                data-node={node.label}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx="12"
                  className={cn("fill-ink-850", source ? "stroke-axon" : active ? "stroke-synapse" : "stroke-line-strong")}
                  strokeWidth={active || source ? 2.5 : 1.5}
                />
                <text x="12" y={NODE_H / 2 + 8} className="text-[22px]">
                  {COMPONENT_ICONS[node.kind]}
                </text>
                <text x="44" y={NODE_H / 2 + 5} className="fill-fg text-[17px] font-semibold">
                  {node.label.length > 12 ? `${node.label.slice(0, 11)}…` : node.label || "Untitled"}
                </text>
              </g>
            );
          })}
        </svg>

        {!readOnly && diagram.nodes.length === 0 ? (
          <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-sm text-fg-subtle">
            Add components from the toolbar, drag them into place, then select one and press Connect to draw an arrow.
          </p>
        ) : null}
      </div>

      {!readOnly && (selectedNode || selectedEdge) ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2 text-sm">
          {selectedNode ? (
            <>
              <label className="flex items-center gap-2 text-xs text-fg-subtle">
                Label
                <input
                  value={selectedNode.label}
                  maxLength={60}
                  onChange={(event) => update({ ...diagram, nodes: diagram.nodes.map((node) => (node.id === selectedNode.id ? { ...node, label: event.target.value } : node)) })}
                  className="h-8 w-44 rounded-lg border border-line-strong bg-ink-900/80 px-2 text-sm text-fg"
                  aria-label="Component label"
                />
              </label>
              <button
                type="button"
                onClick={() => setConnectFrom(connectFrom ? null : selectedNode.id)}
                aria-pressed={connectFrom === selectedNode.id}
                className={cn(
                  "h-8 rounded-lg border px-2.5 text-xs font-semibold",
                  connectFrom === selectedNode.id ? "border-axon/60 bg-axon/10 text-axon" : "border-line-strong text-fg-muted hover:text-fg",
                )}
              >
                {connectFrom === selectedNode.id ? "Now click the target…" : "Connect →"}
              </button>
            </>
          ) : selectedEdge ? (
            <label className="flex items-center gap-2 text-xs text-fg-subtle">
              Arrow label
              <input
                value={selectedEdge.label}
                maxLength={60}
                placeholder="e.g. HTTPS, async, reads"
                onChange={(event) => update({ ...diagram, edges: diagram.edges.map((edge, index) => (selected?.type === "edge" && index === selected.index ? { ...edge, label: event.target.value } : edge)) })}
                className="h-8 w-52 rounded-lg border border-line-strong bg-ink-900/80 px-2 text-sm text-fg"
                aria-label="Arrow label"
              />
            </label>
          ) : null}
          <button type="button" onClick={removeSelected} className="ml-auto h-8 rounded-lg border border-danger/40 px-2.5 text-xs font-semibold text-danger hover:bg-danger/10">
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
