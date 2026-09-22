import { Image } from "expo-image";
import { useState } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { mediaUrl, mediaWidthFor, type MediaWidth } from "@/api/client";
import { Stripes } from "@/components/motifs";
import { useTheme } from "@/theme";

interface Props {
  /** API-relative media path or absolute/local uri. */
  src?: string | null;
  width?: number;
  height?: number;
  /** Derivative width on the API ladder. */
  /** Derivative width; defaults to whatever covers the box at this screen's pixel density. */
  w?: MediaWidth;
  border?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  label?: string;
}

/** 3:4 bottle photo box. Shows the striped skeleton until the image is in (and when there is none). */
export function PhotoBox({ src, width, height, w, border, style, children, label }: Props) {
  const t = useTheme();
  const [loaded, setLoaded] = useState(false);
  const uri = src && /^(file|content|ph|data|blob):/.test(src) ? src : mediaUrl(src, w ?? mediaWidthFor(typeof width === "number" ? width : 402));
  return (
    <View
      accessibilityLabel={label}
      style={[{ width, height, aspectRatio: height == null ? 3 / 4 : undefined, backgroundColor: t.card, overflow: "hidden", borderWidth: border ? 1 : 0, borderColor: t.gold }, style]}
    >
      {!loaded && <Stripes />}
      {uri && (
        <Image source={{ uri }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={160} onLoad={() => setLoaded(true)} recyclingKey={uri} />
      )}
      {children}
    </View>
  );
}
