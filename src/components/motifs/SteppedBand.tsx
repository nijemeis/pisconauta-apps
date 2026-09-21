import { useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { G, Rect } from "react-native-svg";
import { useTheme } from "@/theme";

const TILE: [number, number][] = [[0, 7], [7.5, 3.5], [15, 0], [22.5, 3.5]];

/** Stepped-mountain band: a 30 × 12 tile repeated along x. Fills its parent unless `width` is given. */
export function SteppedBand({ width, color, opacity = 1, style }: { width?: number; color?: string; opacity?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [measured, setMeasured] = useState(0);
  const w = width ?? measured;
  const fill = color ?? t.gold;
  const tiles = Math.ceil(w / 30);
  return (
    <View
      style={[{ height: 12, overflow: "hidden" }, width != null ? { width } : { alignSelf: "stretch" }, style]}
      onLayout={width != null ? undefined : (e) => setMeasured(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Svg width={w} height={12} opacity={opacity}>
          {Array.from({ length: tiles }, (_, i) => (
            <G key={i} x={i * 30}>
              {TILE.map(([x, y]) => <Rect key={x} x={x} y={y} width={7} height={5} fill={fill} />)}
            </G>
          ))}
        </Svg>
      )}
    </View>
  );
}
