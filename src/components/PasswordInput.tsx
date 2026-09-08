import { useEffect, useRef, useState, type ElementRef } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useT } from '../i18n';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  error?: boolean;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Password field with a show/hide eye toggle. Shared by the Secret-QR
 * generator and the scan-side unlock prompt so both behave identically —
 * autoCorrect/autoCapitalize are off so the typed password is byte-for-byte
 * what gets hashed (a silent trailing space or capital = "wrong password").
 *
 * Android ignores a live `secureTextEntry` flip on an existing TextInput, so
 * we remount the field via `key` when toggling and restore focus after.
 */
export function PasswordInput({ value, onChangeText, placeholder, autoFocus, error, onSubmitEditing, style }: Props) {
  const theme = useTheme();
  const t = useT();
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);
  const wasFocused = useRef(false);

  // Field was remounted by the toggle — put the cursor back where it was.
  useEffect(() => {
    if (wasFocused.current) {
      inputRef.current?.focus();
      wasFocused.current = false;
    }
  }, [visible]);

  const toggle = () => {
    wasFocused.current = inputRef.current?.isFocused() ?? false;
    setVisible(v => !v);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface,
          borderColor: error ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radius.md,
        },
        style,
      ]}
    >
      <TextInput
        ref={inputRef}
        key={visible ? 'shown' : 'hidden'}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="password"
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        onSubmitEditing={onSubmitEditing}
        style={[styles.input, { color: theme.colors.text }]}
      />
      <Pressable
        onPress={toggle}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t(visible ? 'qr.hidePassword' : 'qr.showPassword')}
        style={styles.eye}
      >
        {visible ? <EyeOff size={20} color={theme.colors.textSecondary} /> : <Eye size={20} color={theme.colors.textSecondary} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, height: '100%', paddingHorizontal: 14, fontSize: 16 },
  eye: { paddingHorizontal: 14, height: '100%', alignItems: 'center', justifyContent: 'center' },
});
