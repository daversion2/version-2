import React from 'react';
import { Text, StyleSheet, StyleProp, TextStyle, TextProps } from 'react-native';
import { Fonts } from '../../constants/theme';

/**
 * Renders a copy string with inline markdown-lite emphasis:
 *   **bold**   *italic*   _underline_
 * Markers nest (e.g. `**bold _and underline_**`). A string with no markers
 * renders identically to a plain <Text>, so existing onboarding copy is
 * unaffected. \n line breaks are preserved as in any Text.
 *
 * Bold maps to the bold sibling of the base font family (iOS custom fonts
 * don't honor fontWeight reliably); unknown families fall back to weight 700.
 */
const BOLD_FAMILY: Record<string, string> = {
  [Fonts.primary]: Fonts.primaryBold,
  [Fonts.primaryBold]: Fonts.primaryBold,
  [Fonts.secondary]: Fonts.secondaryBold,
  [Fonts.secondaryBold]: Fonts.secondaryBold,
};

interface Flags {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface Marker {
  delim: string;
  flag: keyof Flags;
}

// Order matters: `**` is tested before `*` so bold wins ties at the same index.
const MARKERS: Marker[] = [
  { delim: '**', flag: 'bold' },
  { delim: '*', flag: 'italic' },
  { delim: '_', flag: 'underline' },
];

const flagStyle = (flags: Flags, baseFamily?: string): TextStyle => {
  const style: TextStyle = {};
  if (flags.bold) {
    const bold = baseFamily ? BOLD_FAMILY[baseFamily] : undefined;
    if (bold) style.fontFamily = bold;
    else style.fontWeight = '700';
  }
  if (flags.italic) style.fontStyle = 'italic';
  if (flags.underline) style.textDecorationLine = 'underline';
  return style;
};

let keySeq = 0;
const nextKey = () => `rt${keySeq++}`;

/**
 * Recursively tokenize `text`, splitting on the earliest emphasis marker and
 * recursing into the wrapped content with that flag added.
 */
const tokenize = (text: string, flags: Flags, baseFamily?: string): React.ReactNode[] => {
  // Find the earliest marker that has a matching closing delimiter.
  let best: { marker: Marker; start: number; end: number } | null = null;
  for (const marker of MARKERS) {
    const start = text.indexOf(marker.delim);
    if (start === -1) continue;
    const end = text.indexOf(marker.delim, start + marker.delim.length);
    if (end === -1) continue;
    if (end === start + marker.delim.length) continue; // empty span, skip
    if (!best || start < best.start) best = { marker, start, end };
  }

  if (!best) {
    // No markers left — emit styled leaf text.
    const style = flagStyle(flags, baseFamily);
    return [
      Object.keys(style).length ? (
        <Text key={nextKey()} style={style}>
          {text}
        </Text>
      ) : (
        text
      ),
    ];
  }

  const { marker, start, end } = best;
  const before = text.slice(0, start);
  const inner = text.slice(start + marker.delim.length, end);
  const after = text.slice(end + marker.delim.length);

  return [
    ...(before ? tokenize(before, flags, baseFamily) : []),
    ...tokenize(inner, { ...flags, [marker.flag]: true }, baseFamily),
    ...(after ? tokenize(after, flags, baseFamily) : []),
  ];
};

interface RichTextProps extends TextProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

export const RichText: React.FC<RichTextProps> = ({ children, style, ...rest }) => {
  const baseFamily = (StyleSheet.flatten(style) as TextStyle | undefined)?.fontFamily;
  return (
    <Text style={style} {...rest}>
      {tokenize(children ?? '', {}, baseFamily)}
    </Text>
  );
};
