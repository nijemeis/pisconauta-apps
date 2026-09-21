import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme";

interface Props {
  /** Outer L arm length: 14 on the vitrine, 30 on the scanner. */
  outer?: number;
  /** Inner stepped L arm length: 9 / 14. */
  inner?: number;
  /** Inner L offset from the corner: 9 / 11. */
  offset?: number;
  color?: string;
  innerColor?: string;
  /** Outset so the brackets sit on (or inside) the framed box's border. */
  inset?: number;
}

function Corner({ outer, inner, offset, color, innerColor, rotate }: Required<Omit<Props, "inset">> & { rotate: number }) {
  const box = Math.max(outer, offset + inner) + 2;
  return (
    <Svg width={box} height={box} style={{ transform: [{ rotate: `${rotate}deg` }] }}>
      <Path d={`M1 ${outer} V1 H${outer}`} stroke={color} strokeWidth={2} fill="none" />
      <Path d={`M${offset} ${offset + inner} V${offset} H${offset + inner}`} stroke={innerColor} strokeWidth={2} fill="none" />
    </Svg>
  );
}

/** Four stepped corner brackets laid over the parent (absolute fill). */
export function CornerBrackets({ outer = 14, inner = 9, offset = 9, color, innerColor, inset = 0 }: Props) {
  const t = useTheme();
  const c = color ?? t.gold;
  const ic = innerColor ?? t.goldA(0.6);
  const p = { outer, inner, offset, color: c, innerColor: ic };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: inset }]}>
      <View style={{ position: "absolute", top: 0, left: 0 }}><Corner {...p} rotate={0} /></View>
      <View style={{ position: "absolute", top: 0, right: 0 }}><Corner {...p} rotate={90} /></View>
      <View style={{ position: "absolute", bottom: 0, right: 0 }}><Corner {...p} rotate={180} /></View>
      <View style={{ position: "absolute", bottom: 0, left: 0 }}><Corner {...p} rotate={270} /></View>
    </View>
  );
}
