import {
  ControlsContainer,
  FullScreenControl,
  SearchControl,
  SigmaContainer,
  ZoomControl,
} from "@react-sigma/core";
import { createNodeImageProgram } from "@sigma/node-image";
import { DirectedGraph } from "graphology";
import { FC, useEffect, useMemo, useState } from "react";
import { Settings } from "sigma/settings";
import { drawHover, drawLabel } from "../utils";
import { Dataset } from "../interfaces";
import { useWorkerLayoutForceAtlas2 } from "@react-sigma/layout-forceatlas2";
import GraphDataController from "./GraphDataController";
import GraphEventsController from "./GraphEventsController";
import GraphSettingsController from "./GraphSettingsController";
import { Button, LoadingOverlay } from "@mantine/core";
import { FiltersState } from "../interfaces";

import styles from "../styles.module.css";

const Fa2: FC = () => {
  const { start, stop, kill } = useWorkerLayoutForceAtlas2({
    settings: {
      gravity: 0.5,
      adjustSizes: true,
    },
  });

  useEffect(() => {
    // start FA2
    start();

    setTimeout(() => {
      stop();
    }, 1000);

    // Kill FA2 on unmount
    return () => {
      kill();
    };
  }, [start, kill]);

  return null;
};

interface Props {
  data: Record<string, any>;
  height?: number | string;
}

const Root = ({ data, height = "100%" }: Props) => {
  const [dataReady, setDataReady] = useState(false);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [filtersState, setFiltersState] = useState<FiltersState>({
    visibleNodeGraphTypes: ["entity", "lexical"],
  });

  const sigmaSettings: Partial<Settings> = useMemo(
    () => ({
      nodeProgramClasses: {
        image: createNodeImageProgram({
          size: { mode: "force", value: 256 },
        }),
      },
      defaultDrawNodeLabel: drawLabel,
      defaultDrawNodeHover: drawHover,
      defaultNodeType: "image",
      defaultEdgeType: "arrow",
      labelDensity: 2,
      labelRenderedSizeThreshold: 2,
      zIndex: true,
      renderEdgeLabels: true,
      edgeLabelSize: 10,
    }),
    [],
  );

  const handleGraphFilterClick = (graphType: string) => {
    if (filtersState.visibleNodeGraphTypes.includes(graphType)) {
      setFiltersState((current: FiltersState) => ({
        ...current,
        visibleNodeGraphTypes: current.visibleNodeGraphTypes.filter(
          (f) => f !== graphType,
        ),
      }));
    } else {
      setFiltersState((current: FiltersState) => ({
        ...current,
        visibleNodeGraphTypes: [...current.visibleNodeGraphTypes, graphType],
      }));
    }
  };

  // Load data on mount:
  useEffect(() => {
    if (data) {
      const seenNodes = new Set();

      const cleanData = {
        nodes: data.nodes.filter((item: any) => {
          if (seenNodes.has(item.id)) {
            return false;
          }
          seenNodes.add(item.id);
          return true;
        }),
        edges: data.relationships,
      };

      setDataset(cleanData);

      requestAnimationFrame(() => setDataReady(true));
    }
  }, [data]);

  if (!dataReady) return <LoadingOverlay visible={true} />;

  return (
    <SigmaContainer
      graph={DirectedGraph}
      settings={sigmaSettings}
      style={{ height: height ? `${height}px` : "100%" }}
      className="react-sigma"
    >
      <Fa2 />
      <GraphSettingsController hoveredNode={hoveredNode} />
      <GraphEventsController setHoveredNode={setHoveredNode} />
      <GraphDataController
        dataset={dataset as Dataset}
        filters={filtersState}
      />
      <ControlsContainer position={"top-left"}>
        <div className={styles.filters}>
          <Button
            size="xs"
            color="teal"
            onClick={() => handleGraphFilterClick("lexical")}
            style={{
              opacity: filtersState.visibleNodeGraphTypes.includes("lexical")
                ? "1"
                : "0.5",
            }}
          >
            Lexical graph
          </Button>
          <Button
            size="xs"
            style={{
              opacity: filtersState.visibleNodeGraphTypes.includes("entity")
                ? "1"
                : "0.5",
            }}
            ml="xs"
            color="teal"
            onClick={() => handleGraphFilterClick("entity")}
          >
            Entity graph
          </Button>
        </div>
      </ControlsContainer>
      <ControlsContainer position={"top-right"}>
        <SearchControl style={{ width: "200px" }} />
      </ControlsContainer>
      <ControlsContainer
        position={"bottom-right"}
        className={styles.zoomControl}
      >
        <ZoomControl />
        <FullScreenControl />
      </ControlsContainer>
    </SigmaContainer>
  );
};

export default Root;
