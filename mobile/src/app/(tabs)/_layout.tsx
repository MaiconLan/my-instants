import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Overlays } from '../../components/Overlays';
import { Icon, IconName } from '../../components/ui';
import { probeDuration } from '../../lib/audio';
import { useIncomingShare } from '../../lib/shareIntent';
import { useStore } from '../../lib/store';
import { colors, fonts, MAX_FILE_BYTES } from '../../lib/theme';

function tabIcon(name: IconName) {
  return ({ focused }: { focused: boolean }) => (
    <View style={[styles.pill, focused && { backgroundColor: colors.navPill }]}>
      <Icon name={name} size={24} color={focused ? colors.text : colors.textMuted} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const load = useStore((s) => s.load);
  const userId = useStore((s) => s.user?.id);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  const openOverlay = useStore((s) => s.openOverlay);
  const toast = useStore((s) => s.showToast);
  const { file: incoming, reset } = useIncomingShare();

  // Áudio compartilhado de outro app (WhatsApp etc.) abre direto a tela "Novo áudio".
  useEffect(() => {
    if (!incoming) return;
    reset();
    const isAudio =
      incoming.mimeType.startsWith('audio/') ||
      /\.(mp3|m4a|ogg|opus|wav|aac)$/i.test(incoming.name);
    if (!isAudio) {
      toast('Só dá pra importar arquivos de áudio');
      return;
    }
    if (incoming.size > MAX_FILE_BYTES) {
      toast('Arquivo maior que 5 MB');
      return;
    }
    probeDuration(incoming.uri)
      .catch(() => null)
      .then((durationMs) =>
        openOverlay({
          kind: 'form',
          mode: 'new',
          file: { uri: incoming.uri, name: incoming.name, size: incoming.size, durationMs },
        }),
      );
  }, [incoming, reset, toast, openOverlay]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.bg },
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 },
          tabBarStyle: {
            backgroundColor: colors.navBg,
            borderTopColor: colors.navBorder,
            borderTopWidth: 1,
            height: 74 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom + 6,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Áudios', tabBarIcon: tabIcon('grid-view') }} />
        <Tabs.Screen name="favoritos" options={{ title: 'Favoritos', tabBarIcon: tabIcon('favorite') }} />
        <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: tabIcon('tune') }} />
      </Tabs>
      <Overlays />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 62,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
