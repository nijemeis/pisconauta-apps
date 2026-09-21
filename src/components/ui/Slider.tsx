import { useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import { useTheme } from "@/theme";

interface Props {
  min: number;
  max: number;
  step: number;
  /** One value = single handle; two = dual-handle range. */
  values: number[];
  onChange: (values: number[]) => void;
  onEnd?: (values: number[]) => void;
  color?: string;
  label?: string;
}

const HANDLE = 12;
const HIT = 36;

/** 2 px track, accent active span, 12 px round handles. */
export function Slider({ min, max, step, values, onChange, onEnd, color, label }: Props) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const live = useRef({ min, max, step, values, width, onChange, onEnd });
  live.current = { min, max, step, values, width, onChange, onEnd };
  const start = useRef(0);

  const responders = useMemo(() => [0, 1].map((idx) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { start.current = live.current.values[idx]; },
    onPanResponderMove: (_e, g) => {
      const c = live.current;
      if (!c.width) return;
      const raw = start.current + (g.dx / c.width) * (c.max - c.min);
      let v = Math.round(raw / c.step) * c.step;
      const lo = idx === 1 ? c.values[0] : c.min;
      const hi = idx === 0 && c.values.length > 1 ? c.values[1] : c.max;
      v = Math.min(hi, Math.max(lo, Number(v.toFixed(4))));
      if (v !== c.values[idx]) { const next = [...c.values]; next[idx] = v; c.onChange(next); }
    },
    onPanResponderRelease: () => live.current.onEnd?.(live.current.values),
    onPanResponderTerminate: () => live.current.onEnd?.(live.current.values),
  })), []);

  const pos = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * width);
  const from = values.length > 1 ? pos(values[0]) : 0;
  const to = pos(values[values.length - 1]);
  const accent = color ?? t.gold;

  return (
    <View style={{ height: HIT, justifyContent: "center", marginHorizontal: HANDLE / 2 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height: 2, backgroundColor: t.hair(0.14) }} />
      <View style={{ position: "absolute", left: from, width: Math.max(0, to - from), height: 2, backgroundColor: accent }} />
      {values.map((v, i) => (
        <View
          key={i}
          {...responders[i].panHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: v }}
          style={{ position: "absolute", left: pos(v) - HIT / 2, width: HIT, height: HIT, alignItems: "center", justifyContent: "center" }}
        >
          <View style={{ width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, backgroundColor: accent }} />
        </View>
      ))}
    </View>
  );
}
