import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { Neo4jNetworkGraph } from "../components/NetworkGraph";

export function NetworkGraphPage() {
  const [data, setData] = useState();
  useEffect(() => {
    apiClient.get("/fetch_network/").then((res: any) => {
      setData(res.data);
    });
  }, []);

  return <Neo4jNetworkGraph data={data} />;
}
