/* 시각화 스타일 옵션: 색상 모드(팔레트)·배경·노드/엣지 크기·굵기 — 네트워크와 대시보드가 함께 쓴다. */

export type PaletteId = "pastel" | "vivid" | "colorblind" | "warm" | "cool" | "earth" | "mono";
export const PALETTES: { id: PaletteId; label: string; colors: string[] }[] = [
  { id: "pastel", label: "기본(차분한 색)", colors: ["#b5c23c", "#8e5c70", "#e8782e", "#4fa89f", "#9dbb5a", "#7b93c9", "#d3a53f", "#a07eb5", "#d9706a", "#5aa0b8"] },
  { id: "vivid", label: "선명한 색", colors: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c", "#52b788", "#f15bb5", "#00bbf9", "#9b5de5"] },
  { id: "colorblind", label: "색각 이상 친화(Okabe-Ito)", colors: ["#0072b2", "#e69f00", "#009e73", "#cc79a7", "#56b4e9", "#d55e00", "#f0e442", "#999999", "#332288", "#88ccee"] },
  { id: "warm", label: "따뜻한 색", colors: ["#ffb703", "#fb8500", "#e63946", "#c1121f", "#f4a261", "#e76f51", "#d4a373", "#bc4749", "#ff7b00", "#a4161a"] },
  { id: "cool", label: "차가운 색", colors: ["#4cc9f0", "#4895ef", "#4361ee", "#3f37c9", "#7209b7", "#56cfe1", "#5e60ce", "#48bfe3", "#80ffdb", "#6930c3"] },
  { id: "earth", label: "자연색", colors: ["#6b9080", "#a4c3b2", "#cce3de", "#b08968", "#ddb892", "#7f5539", "#9c6644", "#606c38", "#bc6c25", "#8a9a5b"] },
  { id: "mono", label: "단색(청록 농도)", colors: ["#d6f2ee", "#a9e0d8", "#7fd0c6", "#4fa89f", "#3b8a82", "#2d6e68", "#bfe8e2", "#92d6cc", "#63b9af", "#46978f"] },
];
export type BgId = "teal" | "dark" | "white" | "paper";
export const BGS: { id: BgId; label: string; bg: string; pill: string; text: string; edge: string }[] = [
  { id: "teal", label: "청록", bg: "#263e49", pill: "#1b2e36", text: "#ffffff", edge: "#ffffff" },
  { id: "dark", label: "어두운 색", bg: "#0d0f14", pill: "#1a1e29", text: "#ffffff", edge: "#9aa4b5" },
  { id: "white", label: "흰색(논문용)", bg: "#ffffff", pill: "#eef1f4", text: "#1b2530", edge: "#7a8794" },
  { id: "paper", label: "미색(인쇄용)", bg: "#f6f1e7", pill: "#e9e1cf", text: "#2b2418", edge: "#8b8170" },
];
export type EdgeColorMode = "theme" | "source" | "gold" | "gray";

export interface VizStyle {
  palette: PaletteId; bg: BgId; nodeScale: number; edgeWidth: number; edgeOpacity: number; edgeColor: EdgeColorMode; labelSize: number;
}
export const DEFAULT_STYLE: VizStyle = { palette: "pastel", bg: "teal", nodeScale: 1, edgeWidth: 1, edgeOpacity: 1, edgeColor: "theme", labelSize: 10.5 };
export const paletteColors = (id: PaletteId) => (PALETTES.find((p) => p.id === id) ?? PALETTES[0]).colors;
export const bgOf = (id: BgId) => BGS.find((b) => b.id === id) ?? BGS[0];
