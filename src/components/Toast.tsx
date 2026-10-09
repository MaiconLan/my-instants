import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';
import { colors, fonts } from '../lib/theme';

export function Toast() {
  const toast = useStore((s) => s.toast);
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  // Este componente existe em dois lugares (raiz e dentro do Modal dos sheets). Ao
  // montar, ele ignora o toast que já estava no store: só mostra os que chegam depois.
  const ignoreId = useRef(toast?.id ?? 0);
  const [shown, setShown] = useState<{ id: number; msg: string } | null>(null);

  useEffect(() => {
    if (!toast || toast.id === ignoreId.current) return;
    setShown(toast);
    opacity.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) setShown(null);
    });
    return () => anim.stop();
  }, [toast, opacity]);

  // Sem mensagem, nada é desenhado: antes sobrava a caixa branca vazia.
  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom: 74 + insets.bottom + 16, opacity }]}
    >
      <Animated.Text style={styles.text}>{shown.msg}</Animated.Text>
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
