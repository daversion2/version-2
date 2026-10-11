import React, { useState } from 'react';
import { Text, TextProps, StyleProp, TextStyle, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';
import { useCopyContext } from '../../context/CopyContext';
import { CopyVars, interpolate, parseBold, resolveCopy } from '../../services/appCopy';
import { CopyEditorModal } from './CopyEditorModal';

interface CopyProps extends Omit<TextProps, 'children'> {
  /** Stable key, e.g. "today.empty". Never rename once shipped — edits are stored under it. */
  id: string;
  /** The default wording. `**words**` get `boldStyle`; `{name}` is filled from `vars`. */
  children: string;
  vars?: CopyVars;
  /** The screen's existing emphasis style for `**…**` spans. */
  boldStyle?: StyleProp<TextStyle>;
}

/**
 * A <Text> whose wording an admin can edit live. Renders exactly like the
 * <Text> it replaces; in admin edit mode it gets a dotted underline and a
 * long-press opens the editor.
 *
 * Never nest a <Copy> inside another <Text>: it renders its editor alongside
 * the text, which a parent <Text> can't hold. Use `**…**` for inline emphasis
 * instead of nesting.
 */
export const Copy: React.FC<CopyProps> = ({
  id,
  children: defaultText,
  vars,
  boldStyle,
  style,
  onLongPress,
  ...rest
}) => {
  const { overrides, editMode, register } = useCopyContext();
  const [editing, setEditing] = useState(false);
  register(id, defaultText);

  const segments = parseBold(interpolate(resolveCopy(id, defaultText, overrides), vars));

  return (
    <>
      <Text
        {...rest}
        style={[style, editMode && styles.editable]}
        onLongPress={editMode ? () => setEditing(true) : onLongPress}
        suppressHighlighting
      >
        {segments.map((s, i) =>
          s.bold ? (
            <Text key={i} style={boldStyle}>
              {s.text}
            </Text>
          ) : (
            s.text
          )
        )}
      </Text>
      {editMode && (
        <CopyEditorModal
          visible={editing}
          copyKey={id}
          defaultText={defaultText}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  editable: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: Colors.secondary,
  },
});
