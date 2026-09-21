import Svg, { Rect } from "react-native-svg";
import { useTheme } from "@/theme";

const ARMS: [number, number][] = [[8.5, 0], [0, 8.5], [8.5, 8.5], [17, 8.5], [8.5, 17]];
const STEPS: [number, number][] = [[4.5, 4.5], [16.5, 4.5], [4.5, 16.5], [16.5, 16.5]];

/** Stepped Andean cross on a 24 × 24 grid. */
export function Chakana({ size = 24, color, opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  const t = useTheme();
  const fill = color ?? t.gold;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      {ARMS.map(([x, y]) => <Rect key={`a${x}-${y}`} x={x} y={y} width={7} height={7} fill={fill} />)}
      {STEPS.map(([x, y]) => <Rect key={`s${x}-${y}`} x={x} y={y} width={3} height={3} fill={fill} />)}
    </Svg>
  );
}
