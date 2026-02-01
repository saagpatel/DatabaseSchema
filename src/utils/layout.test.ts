import { describe, it, expect } from "vitest";
import { applyDagreLayout, applyForceLayout, getTableNodeHeight } from "./layout";
import type { Node, Edge } from "@xyflow/react";

const makeNodes = (): Node[] => [
  {
    id: "users",
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: { columnCount: 5 },
  },
  {
    id: "posts",
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: { columnCount: 3 },
  },
  {
    id: "comments",
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: { columnCount: 4 },
  },
];

const makeEdges = (): Edge[] => [
  { id: "fk1", source: "posts", target: "users" },
  { id: "fk2", source: "comments", target: "posts" },
];

describe("layout", () => {
  describe("getTableNodeHeight", () => {
    it("calculates height for columns", () => {
      const h = getTableNodeHeight(5);
      expect(h).toBeGreaterThan(100);
    });

    it("minimum height for zero columns", () => {
      const h = getTableNodeHeight(0);
      expect(h).toBeGreaterThan(40);
    });
  });

  describe("applyDagreLayout", () => {
    it("assigns unique positions to all nodes", () => {
      const nodes = makeNodes();
      const edges = makeEdges();
      const laid = applyDagreLayout(nodes, edges);

      expect(laid).toHaveLength(3);

      // All positions should be set (not all zeros)
      const positions = laid.map((n) => `${n.position.x},${n.position.y}`);
      const unique = new Set(positions);
      expect(unique.size).toBe(3);
    });

    it("preserves node ids", () => {
      const laid = applyDagreLayout(makeNodes(), makeEdges());
      const ids = laid.map((n) => n.id);
      expect(ids).toContain("users");
      expect(ids).toContain("posts");
      expect(ids).toContain("comments");
    });
  });

  describe("applyForceLayout", () => {
    it("assigns positions to all nodes", () => {
      const nodes = makeNodes();
      const edges = makeEdges();
      const laid = applyForceLayout(nodes, edges);

      expect(laid).toHaveLength(3);

      // Positions should be finite numbers
      for (const node of laid) {
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
      }
    });

    it("works with no edges", () => {
      const laid = applyForceLayout(makeNodes(), []);
      expect(laid).toHaveLength(3);
    });
  });
});
