import { useQuery } from "@tanstack/react-query";
import Graph from "graphology";
import { useEffect } from "react";
import Sigma from "sigma";
import { random } from "graphology-layout";
import { getNetwork } from "../../api/network";

export function NetworkGraph() {
  const query = useQuery({
    queryKey: ["network"],
    queryFn: getNetwork,
  });

  useEffect(() => {
    if (query.data) {
      const graph = new Graph();

      for (const node of query.data.nodes) {
        try {
          console.log("node", node);
          graph.addNode(node.id, {
            label: node.id,
            size: 15,
            color: "blue",
          });
        } catch (err) {
          console.log(err);
        }
      }

      random.assign(graph);

      for (const relationship of query.data.relationships) {
        try {
          graph.addEdge(relationship.start, relationship.end, {
            size: relationship.label,
          });
        } catch (err) {
          console.log(err);
        }
      }

      const renderer = new Sigma(
        graph,
        document.getElementById("networkGraph") as HTMLDivElement,
        {
          renderEdgeLabels: true,
          labelDensity: 0.1, // Adjust this for better label visibility
          labelGridCellSize: 30, // Adjust this for better label visibility
          defaultNodeColor: "#000", // Ensure label text color is visibl
        },
      );
    }
  }, [query.data]);

  return <div id="networkGraph" style={{ height: "100%" }}></div>;
}
