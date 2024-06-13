import { useRegisterEvents, useSigma } from "@react-sigma/core";
import { FC, PropsWithChildren, useEffect } from "react";

const GraphEventsController: FC<
  PropsWithChildren<{ setHoveredNode: (node: string | null) => void }>
> = ({ setHoveredNode, children }) => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const registerEvents = useRegisterEvents();

  /**
   * Initialize here settings that require to know the graph and/or the sigma
   * instance:
   */
  useEffect(() => {
    registerEvents({
      // clickNode({ node }) {
      //   if (!graph.getNodeAttribute(node, "hidden")) {
      //     window.open(graph.getNodeAttribute(node, "URL"), "_blank");
      //   }
      // },
      enterNode({ node }) {
        setHoveredNode(node);
      },
      leaveNode() {
        setHoveredNode(null);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};

export default GraphEventsController;
