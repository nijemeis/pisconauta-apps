import { Platform } from "react-native";

/**
 * Bottom padding for bars and screens. On iOS the home-indicator inset already includes
 * breathing room; on Android the inset is the navigation bar itself (tall with 3-button
 * navigation), so content needs its own clearance on top of it.
 */
export const bottomPad = (inset: number, min = 14) => (Platform.OS === "android" ? inset + min : Math.max(inset, min));

/** For scrollable screens and sheets: the inset plus the design's own margin, a little more on Android. */
export const screenBottom = (inset: number, extra: number) => inset + extra + (Platform.OS === "android" ? 12 : 0);
