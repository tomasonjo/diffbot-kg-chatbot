import Root from "./components/Root";

import "@react-sigma/core/lib/react-sigma.min.css";

interface Props {
  data: any;
  height?: number;
}

export function Neo4jNetworkGraph({ data, height }: Props) {
  return <Root data={data} height={height} />;
}
