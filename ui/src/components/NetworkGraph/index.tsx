import { useEffect } from "react";
import { SigmaContainer } from "@react-sigma/core";
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import { NetworkGraph } from "./graph";

import "@react-sigma/core/lib/react-sigma.min.css";

const Fa2 = () => {
  const { start, kill } = useWorkerLayoutForceAtlas2({
    settings: { slowDown: 10 },
  });

  useEffect(() => {
    // start FA2
    start();

    // Kill FA2 on unmount
    return () => {
      kill();
    };
  }, [start, kill]);

  return null;
};

export function Neo4jNetworkGraph() {
  return (
    <SigmaContainer
      style={{ height: "100%" }}
      settings={{ allowInvalidContainer: true }}
    >
      <NetworkGraph />
      <Fa2 />
    </SigmaContainer>
  );
}
