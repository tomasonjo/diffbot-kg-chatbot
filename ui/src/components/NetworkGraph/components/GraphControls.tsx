import { ControlsContainer } from "@react-sigma/core";

export function GraphControls() {
    return (
        <>
          <ControlsContainer position={"top-left"}>
        <div className={styles.filters}>
          <Button
            size="xs"
            color="teal"
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
            color="teal"
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
      </>
      )
}
