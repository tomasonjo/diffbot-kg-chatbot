import { useSigma } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect } from "react";

import { Dataset, FiltersState } from "../interfaces";
import { getNodeGraphType, getNodeIcon, getNodeSize } from "../utils";

const GraphDataController: FC<
  PropsWithChildren<{ dataset: Dataset; filters: FiltersState }>
> = ({ dataset, filters, children }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();

  /**
   * Feed graphology with the new dataset:
   */
  useEffect(() => {
    if (!graph || !dataset) return;

    dataset.nodes.forEach((node) =>
      graph.addNode(node.id, {
        label: node.id,
        size: getNodeSize(node.tag),
        x: Math.random(),
        y: Math.random(),
        tag: node.tag,
        nodeGraphType: getNodeGraphType(node.tag),
        properties: node.properties,
        ...getNodeIcon(node.tag),
      }),
    );

    dataset.edges.forEach((edge) => {
      try {
        graph.addEdge(edge.start, edge.end, {
          size: 2,
          label: edge.type,
          type: "arrow",
          defaultEdgeLabelColor: "#000",
        });
        // eslint-disable-next-line no-empty
      } catch (err) {}
    });

    return () => graph.clear();
  }, [graph, dataset]);

  /**
   * Apply filters to graphology:
   */
  useEffect(() => {
    const { visibleNodeGraphTypes } = filters;
    graph.forEachNode((node, { nodeGraphType }) =>
      graph.setNodeAttribute(node, "hidden", !visibleNodeGraphTypes.includes(nodeGraphType)),


    );
  }, [graph, filters]);

  return <>{children}</>;
};

export default GraphDataController;
