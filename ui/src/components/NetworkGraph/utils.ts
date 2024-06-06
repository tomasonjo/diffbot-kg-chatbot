import { String2HexCodeColor } from "string-to-hex-code-color";
import icoArticle from "../../assets/ico_article.png";
import icoPerson from "../../assets/ico_person.png";
import icoOrganization from "../../assets/ico_organization.png";

export function getNodeSize(type: string): number {
  switch (type) {
    case "Article":
      return 20;
    case "Person":
      return 20;
    case "Organization":
      return 20;
    default:
      return 10;
  }
}

const string2HexCodeColor = new String2HexCodeColor();

export function getNodeIcon(
  type: string,
): Record<string, string> | Record<string, never> {
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
    default:
      return {
        color: string2HexCodeColor.stringToColor(type),
      };
  }
}
