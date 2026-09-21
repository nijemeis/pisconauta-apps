import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line } from "react-native-svg";
import { useTheme } from "@/theme";

/** The 135° striped skeleton: 5 px accent stripe on an 11 px period. */
export function Stripes({ color, period = 11, stripe = 5 }: { color?: string; period?: number; stripe?: number }) {
  const t = useTheme();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const c = color ?? t.goldA(0.13);
  const step = period * Math.SQRT2;
  const count = box.w ? Math.ceil((box.w + box.h) / step) + 1 : 0;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {count > 0 && (
        <Svg width={box.w} height={box.h}>
          {Array.from({ length: count }, (_, i) => {
            const x = i * step;
            return <Line key={i} x1={x} y1={0} x2={x - box.h} y2={box.h} stroke={c} strokeWidth={stripe} />;
          })}
        </Svg>
      )}
    </View>
  );
}
