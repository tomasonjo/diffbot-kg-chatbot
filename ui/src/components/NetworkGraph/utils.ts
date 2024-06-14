import { String2HexCodeColor } from "string-to-hex-code-color";
import icoArticle from "../../assets/ico_article.png";
import icoPerson from "../../assets/ico_person.png";
import icoOrganization from "../../assets/ico_organization.png";
import icoSkill from "../../assets/ico_skill.png";
import icoChunk from "../../assets/ico_chunk.png";
import icoNumber from "../../assets/ico_number.png";
import { NodeDisplayData, PartialButFor, PlainObject } from "sigma/types";
import { Settings } from "sigma/settings";

export function getNodeSize(type: string): number {
  switch (type) {
    case "Article":
      return 15;
    case "Person":
      return 10;
    case "Organization":
      return 10;
    default:
      return 7;
  }
}

//const string2HexCodeColor = new String2HexCodeColor();

export function getNodeIcon(
  type: string,
): Record<string, string | number> | Record<string, never> {
  switch (type) {
    case "Article":
      return {
        image: icoArticle,
        color: "#009F6B",
      };
    case "Person":
      return {
        image: icoPerson,
        color: "#120A8F",
      };
    case "Organization":
      return {
        image: icoOrganization,
        color: "#DC143C",
      };
    case "Number":
      return {
        image: icoNumber,
        color: "#DE4C8A",
      };
    case "Chunk":
      return {
        image: icoChunk,
        color: "#354D73",
      };
    case "Skill":
      return {
        image: icoSkill,
        color: "#CDA434",
      };
    default:
      return {
        color: "#999999", //string2HexCodeColor.stringToColor(type),
        size: 6
      };
  }
}

export function getNodeGraphType(type: string) {
  switch (type) {
    case "Article":
    case "Author":
    case "Chunk":
    case "Site nodes":
      return "lexical";
    default:
      return "entity";
  }
}

const TEXT_COLOR = "#000000";

/**
 * This function draw in the input canvas 2D context a rectangle.
 * It only deals with tracing the path, and does not fill or stroke.
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Custom hover renderer
 */
export function drawHover(
  context: CanvasRenderingContext2D,
  data: PlainObject,
  settings: PlainObject,
) {
  console.log(data)
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;
  const subLabelSize = size - 2;
  const propLabelSize = size - 2;

  const label = data.label;
  const subLabel = data.tag !== "unknown" ? data.tag : "";

  // Then we draw the label background
  context.beginPath();
  context.fillStyle = "#fff";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 2;
  context.shadowBlur = 8;
  context.shadowColor = "#000";

  context.font = `${weight} ${size}px ${font}`;
  const labelWidth = context.measureText(label).width;
  context.font = `${weight} ${subLabelSize}px ${font}`;
  const subLabelWidth = subLabel ? context.measureText(subLabel).width : 0;
  context.font = `${weight} ${subLabelSize}px ${font}`;

  const textWidth = Math.max(labelWidth, subLabelWidth);

  const x = Math.round(data.x);
  const y = Math.round(data.y);
  let w = Math.round(textWidth + size / 2 + data.size + 3);
  const hLabel = Math.round(size / 2 + 4);
  const hSubLabel = subLabel ? Math.round(subLabelSize / 2 + 9) : 0;
  const hProp = 13
  const props: string[] = [];

  let wProps: number[] = []
  let hProps = 0;
  const allowedProps = ["mentions", "sentiment", "date", "language", "processed", "amount", "series", "allowed_props"];

  Object.entries(data.properties).forEach(entry => {
    if (allowedProps.includes(entry[0])) {
      const propText = `${entry[0]}: ${JSON.stringify(entry[1])}`;
      wProps.push(context.measureText(propText).width);
      hProps += hProp;
      props.push(propText);
    }
  })

  if (props.length > 0) {
    w = Math.max(...[labelWidth, subLabelWidth, ...wProps]) + 3 + data.size + size / 2;
  }

  drawRoundRect(context, x, y - hSubLabel - 12, w, hLabel + hSubLabel + hProps + 20, 5);
  context.closePath();
  context.fill();

  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;

  // And finally we draw the labels
  context.fillStyle = TEXT_COLOR;
  context.font = `${weight} ${size}px ${font}`;
  context.fillText(label, data.x + data.size + 3, data.y + size / 3);

  if (subLabel) {
    context.fillStyle = TEXT_COLOR;
    context.font = `${weight} ${subLabelSize}px ${font}`;
    context.fillText(
      subLabel,
      data.x + data.size + 3,
      data.y - (2 * size) / 3 - 2,
    );
  }

  if (props.length > 0) {
    props.forEach((prop, index) => {
      context.fillStyle = "#555";
      context.font = `${weight} ${propLabelSize}px ${font}`;
      context.fillText(
        prop,
        data.x + data.size + 3,
        data.y + (hProp * index) + hSubLabel + hLabel - 5,
      );
    })
  }
}

const MAX_LABEL_LENGTH = 18;

/**
 * Custom label renderer
 */
export function drawLabel(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: Settings,
): void {
  if (!data.label) return;

  const size = settings.labelSize,
    font = settings.labelFont,
    weight = settings.labelWeight;
  let text = data.label.slice(0, MAX_LABEL_LENGTH);

  if (data.label.length > MAX_LABEL_LENGTH) {
    text += "...";
  }

  context.font = `${weight} ${size}px ${font}`;
  const width = context.measureText(text).width + 8;

  context.fillStyle = "#ffffffcc";
  context.fillRect(data.x + data.size, data.y + size / 3 - 15, width, 20);

  context.fillStyle = "#000";
  context.fillText(text, data.x + data.size + 3, data.y + size / 3);
}
