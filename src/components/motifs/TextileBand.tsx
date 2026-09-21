import { useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "@/theme";

/** Woven band: accent 0–3, gap, terracotta 9–13, gap, on a 22 px period, 7 px tall. */
export function TextileBand({ color, secondary, style }: { color?: string; secondary?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const a = color ?? t.gold;
  const b = secondary ?? t.terracotta;
  const n = Math.ceil(w / 22);
  return (
    <View style={[{ height: 7, alignSelf: "stretch", overflow: "hidden" }, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={7}>
          {Array.from({ length: n }, (_, i) => [
            <Rect key={`a${i}`} x={i * 22} y={0} width={3} height={7} fill={a} />,
            <Rect key={`b${i}`} x={i * 22 + 9} y={0} width={4} height={7} fill={b} />,
          ])}
        </Svg>
      )}
    </View>
  );
}
