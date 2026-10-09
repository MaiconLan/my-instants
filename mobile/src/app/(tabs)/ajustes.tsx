import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName, T } from '../../components/ui';
import { playSound } from '../../lib/audio';
import { PlayMode } from '../../lib/audio';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { colors, fonts, SOUND_COLORS } from '../../lib/theme';

const MODES: { key: PlayMode; title: string; icon: IconName; color: string; desc: string }[] = [
  {
    key: 'caos',
    title: 'Modo caos',
    icon: 'cyclone',
    color: SOUND_COLORS[0],
    desc: 'Cada toque toca de novo sem parar o anterior — os áudios se sobrepõem como um eco.',
  },
  {
    key: 'playpause',
    title: 'Play / Pause',
    icon: 'play-circle-outline',
    color: SOUND_COLORS[4],
    desc: 'Um áudio por vez. Tocar outro para o atual; tocar o mesmo de novo para.',
  },
];

export default function Ajustes() {
  const insets = useSafeAreaInsets();
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const user = useStore((s) => s.user);
  const sounds = useStore((s) => s.sounds);
  const toast = useStore((s) => s.showToast);

  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? '';
  const mine = sounds.filter((s) => s.owner_id === user?.id);

  const test = async () => {
    const s = sounds[0];
    if (!s) return toast('Nenhum áudio pra testar');
    try {
      for (let i = 0; i < 3; i++) {
        await playSound(s, mode);
        await new Promise((r) => setTimeout(r, 250));
      }
    } catch {
      toast('Não foi possível tocar o áudio');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16, gap: 12 }}
    >
      <T style={styles.title}>Ajustes</T>

      <T style={styles.section}>MODO DE REPRODUÇÃO</T>
      {MODES.map((m) => {
        const on = mode === m.key;
        return (
          <Pressable
            key={m.key}
            onPress={() => !on && setMode(m.key)}
            style={[
              styles.card,
              on
                ? { backgroundColor: colors.surface2, borderColor: m.color }
                : { backgroundColor: colors.surfaceDim, borderColor: colors.borderSoft },
            ]}
          >
            <View style={[styles.modeIcon, { backgroundColor: m.color }]}>
              <Icon name={m.icon} size={24} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={styles.cardTitle}>{m.title}</T>
              <T style={styles.cardDesc}>{m.desc}</T>
            </View>
            <View style={[styles.radio, on && { borderColor: m.color }]}>
              {on && <View style={[styles.radioDot, { backgroundColor: m.color }]} />}
            </View>
          </Pressable>
        );
      })}

      <Pressable onPress={test} style={styles.outline}>
        <T style={styles.outlineText}>Testar o modo atual</T>
      </Pressable>

      <T style={[styles.section, { marginTop: 12 }]}>CONTA</T>
      <View style={styles.account}>
        <View style={styles.avatar}>
          <T style={styles.avatarText}>{name.charAt(0).toUpperCase()}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T style={styles.cardTitle} numberOfLines={1}>
            {name}
          </T>
          <T style={styles.accountSub} numberOfLines={1}>
            {user?.email} · {mine.length} {mine.length === 1 ? 'áudio enviado' : 'áudios enviados'}
          </T>
        </View>
        <Pressable onPress={() => supabase.auth.signOut()} style={styles.logout}>
          <T style={styles.logoutText}>Sair</T>
        </Pressable>
      </View>

      <T style={styles.version}>app {String(Constants.expoConfig?.extra?.appVersion ?? '')}</T>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.extrabold, fontSize: 27, letterSpacing: -0.54, marginBottom: 8 },
  section: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.9, color: colors.textMuted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    borderWidth: 2,
  },
  modeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16 },
  cardDesc: { fontSize: 13.5, color: colors.textMuted2, marginTop: 3, lineHeight: 19 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  outline: {
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSoft },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink },
  accountSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  logout: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  version: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  logoutText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSoft },
});
