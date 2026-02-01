import dagre from "@dagrejs/dagre";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3";
import type { Node, Edge } from "@xyflow/react";

const TABLE_WIDTH = 260;
const TABLE_HEADER_HEIGHT = 40;
const COLUMN_ROW_HEIGHT = 28;

export function getTableNodeHeight(columnCount: number): number {
  return TABLE_HEADER_HEIGHT + Math.max(columnCount, 1) * COLUMN_ROW_HEIGHT + 8;
}

export function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB"
): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    const height = node.measured?.height ?? getTableNodeHeight(
      (node.data as { columnCount?: number }).columnCount ?? 4
    );
    g.setNode(node.id, { width: TABLE_WIDTH, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const height = node.measured?.height ?? getTableNodeHeight(
      (node.data as { columnCount?: number }).columnCount ?? 4
    );
    return {
      ...node,
      position: {
        x: pos.x - TABLE_WIDTH / 2,
        y: pos.y - height / 2,
      },
    };
  });
}

interface ForceNode extends SimulationNodeDatum {
  id: string;
  width: number;
  height: number;
}

export function applyForceLayout(
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const simNodes: ForceNode[] = nodes.map((node, i) => ({
    id: node.id,
    x: (i % 5) * 300,
    y: Math.floor(i / 5) * 300,
    width: TABLE_WIDTH,
    height: node.measured?.height ?? getTableNodeHeight(
      (node.data as { columnCount?: number }).columnCount ?? 4
    ),
  }));

  const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

  const simLinks: SimulationLinkDatum<ForceNode>[] = edges
    .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
    .map((e) => ({
      source: nodeMap.get(e.source)!,
      target: nodeMap.get(e.target)!,
    }));

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<ForceNode, SimulationLinkDatum<ForceNode>>(simLinks).distance(
        250
      )
    )
    .force("charge", forceManyBody().strength(-800))
    .force(
      "center",
      forceCenter(
        (nodes.length * 100) / 2,
        (nodes.length * 80) / 2
      )
    )
    .force(
      "collide",
      forceCollide<ForceNode>().radius((d) =>
        Math.max(d.width, d.height) / 2 + 30
      )
    )
    .stop();

  // Run simulation synchronously
  for (let i = 0; i < 300; i++) {
    simulation.tick();
  }

  return nodes.map((node) => {
    const simNode = nodeMap.get(node.id)!;
    return {
      ...node,
      position: {
        x: simNode.x ?? 0,
        y: simNode.y ?? 0,
      },
    };
  });
}
