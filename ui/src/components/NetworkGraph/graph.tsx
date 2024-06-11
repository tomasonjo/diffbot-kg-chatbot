import { useEffect, useState } from "react";
import {
  useSigma,
  useRegisterEvents,
  useLoadGraph,
  useSetSettings,
  ControlsContainer,
  ZoomControl,
  FullScreenControl,
  SearchControl,
} from "@react-sigma/core";
import { useLayoutCircular } from "@react-sigma/layout-circular";
import { useQuery } from "@tanstack/react-query";
import Graph from "graphology";
import { Attributes } from "graphology-types";
import { getNodeGraphType, getNodeIcon, getNodeSize } from "./utils";
import { getNetwork } from "../../api/network";
import { Button } from "@mantine/core";

import styles from "./styles.module.css";

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
  const [visibleNodeGraphTypes, setVisibleNodeGraphTypes] = useState([
    "entity",
  ]);

  const query = useQuery({
    queryKey: ["network"],
    queryFn: getNetwork,
  });

  const handleGraphFilterClick = (graphType: string) => {
    if (visibleNodeGraphTypes.includes(graphType)) {
      setVisibleNodeGraphTypes(
        visibleNodeGraphTypes.filter((f) => f !== graphType),
      );
    } else {
      setVisibleNodeGraphTypes([...visibleNodeGraphTypes, graphType]);
    }
  };

  useEffect(() => {
    // Create & load the graph on mount
    if (query.data) {
      const graph = new Graph();

      for (const node of query.data.nodes) {
        try {
          graph.addNode(node.id, {
            label: node.id,
            size: getNodeSize(node.labels),
            x: Math.random(),
            y: Math.random(),
            labels: node.labels,
            nodeGraphType: getNodeGraphType(node.labels),
            ...getNodeIcon(node.labels),
          });
        } catch (err) {
          //console.log(err);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeReducer: (node, data: any) => {
        const graph = sigma.getGraph();
        const newData = { ...data, highlighted: data.highlighted || false };

        if (visibleNodeGraphTypes.includes(data.nodeGraphType)) {
          newData.hidden = false;
        } else {
          newData.hidden = true;
        }

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
      labelDensity: 0.07,
      labelGridCellSize: 60,
      labelRenderedSizeThreshold: 15,
    });
  }, [hoveredNode, setSettings, sigma, visibleNodeGraphTypes]);

  return (
    <>
      <ControlsContainer position={"top-left"}>
        <div className={styles.filters}>
          <Button
            size="xs"
            onClick={() => handleGraphFilterClick("lexical")}
            style={{
              opacity: visibleNodeGraphTypes.includes("lexical") ? "1" : "0.5",
            }}
          >
            Lexical graph
          </Button>
          <Button
            size="xs"
            style={{
              opacity: visibleNodeGraphTypes.includes("entity") ? "1" : "0.5",
            }}
            ml="xs"
            onClick={() => handleGraphFilterClick("entity")}
          >
            Entity graph
          </Button>
        </div>
      </ControlsContainer>
      <ControlsContainer position={"bottom-right"}>
        <ZoomControl />
        <FullScreenControl />
      </ControlsContainer>
      <ControlsContainer position={"top-right"}>
        <SearchControl style={{ width: "200px" }} />
      </ControlsContainer>
    </>
  );
};
