import { useEffect, useState } from "react";
import {
  useSigma,
  useRegisterEvents,
  useLoadGraph,
  useSetSettings,
} from "@react-sigma/core";
import { useLayoutCircular } from "@react-sigma/layout-circular";
import { useQuery } from "@tanstack/react-query";
import Graph from "graphology";
import { Attributes } from "graphology-types";
import { getNodeIcon, getNodeSize } from "./utils";
import { getNetwork } from "../../api/network";

export type NodeType = {
  x: number;
  y: number;
  label: string;
  size: number;
  color: string;
  highlighted?: boolean;
};
export type EdgeType = { label: string };

export const NetworkGraph = () => {
  const sigma = useSigma<NodeType, EdgeType>();
  const registerEvents = useRegisterEvents<NodeType, EdgeType>();
  const setSettings = useSetSettings<NodeType, EdgeType>();
  const loadGraph = useLoadGraph<NodeType, EdgeType>();
  const { assign: assignCircular } = useLayoutCircular();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["network"],
    queryFn: getNetwork,
  });

  useEffect(() => {
    // Create & load the graph on
    if (query.data) {
      const graph = new Graph();

      console.log(query.data.nodes);
      for (const node of query.data.nodes) {
        try {
          console.log({ ...getNodeIcon(node.labels) });
          graph.addNode(node.id, {
            label: node.id,
            size: getNodeSize(node.labels),

            x: Math.random(),
            y: Math.random(),
            ...getNodeIcon(node.labels),
          });
        } catch (err) {
          console.log(err);
        }
      }

      for (const relationship of query.data.relationships) {
        try {
          graph.addEdge(relationship.start, relationship.end, {
            size: 2,
            label: relationship.type,
            type: "arrow",
            defaultEdgeLabelColor: "#000",
          });
        } catch (err) {
          console.log(err);
        }
      }

      loadGraph(graph as Graph<NodeType, EdgeType, Attributes>);
      assignCircular();

      // Register the events
      registerEvents({
        enterNode: (event) => setHoveredNode(event.node),
        leaveNode: () => setHoveredNode(null),
      });
    }
  }, [assignCircular, loadGraph, query.data, registerEvents]);

  useEffect(() => {
    // apply custom settings
    setSettings({
      nodeReducer: (node, data) => {
        const graph = sigma.getGraph();
        const newData = { ...data, highlighted: data.highlighted || false };

        if (hoveredNode) {
          if (
            node === hoveredNode ||
            graph.neighbors(hoveredNode).includes(node)
          ) {
            newData.highlighted = true;
          } else {
            newData.color = "#E2E2E2";
            newData.highlighted = false;
          }
        }
        return newData;
      },
      edgeReducer: (edge, data) => {
        const graph = sigma.getGraph();
        const newData = { ...data, hidden: false };

        if (hoveredNode && !graph.extremities(edge).includes(hoveredNode)) {
          newData.hidden = true;
        }
        return newData;
      },
      renderEdgeLabels: true,
      labelDensity: 10, // increase for better legibility
      labelGridCellSize: 30,
    });
  }, [hoveredNode, setSettings, sigma]);

  return null;
};
