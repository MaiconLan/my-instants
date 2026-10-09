import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { colors, fonts } from '../lib/theme';

export function Toast() {
  const toast = useStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const last = useRef<string>('');

  useEffect(() => {
    if (!toast) return;
    last.current = toast.msg;
    opacity.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [toast, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom: 74 + insets.bottom + 16, opacity }]}
    >
      <Animated.Text style={styles.text}>{last.current}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: '88%',
    elevation: 10,
  },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
});
