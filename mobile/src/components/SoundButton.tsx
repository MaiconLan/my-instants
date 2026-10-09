import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Sound } from '../lib/api';
import { useAudioStore, PlayMode } from '../lib/audio';
import { formatDuration } from '../lib/format';
import { colors, fonts } from '../lib/theme';
import { Icon, T } from './ui';

type Props = {
  sound: Sound;
  mode: PlayMode;
  isFav: boolean;
  onPress: (s: Sound) => void;
  onMore: (s: Sound) => void;
  onShare: (s: Sound) => void;
  onFav: (s: Sound) => void;
};

function ProgressFill({ id }: { id: string }) {
  const p = useAudioStore((s) => s.active[id]?.progress ?? 0);
  if (p <= 0) return null;
  return <View style={[styles.progress, { width: `${p * 100}%` }]} />;
}

export const SoundButton = memo(function SoundButton({
  sound,
  mode,
  isFav,
  onPress,
  onMore,
  onShare,
  onFav,
}: Props) {
  const count = useAudioStore((s) => s.active[sound.id]?.count ?? 0);
  const playing = count > 0;
  const bg = sound.color;

  return (
    <Pressable
      onPress={() => onPress(sound)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bg, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <ProgressFill id={sound.id} />

      <View style={styles.top}>
        <T style={styles.name} numberOfLines={3}>
          {sound.name}
        </T>
        <Pressable
          onPress={() => onMore(sound)}
          hitSlop={6}
          style={styles.more}
          accessibilityLabel="Ações do áudio"
        >
          <Icon name="more-vert" size={22} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={[styles.circle, playing && { backgroundColor: colors.ink }]}>
          <Icon
            name={
              playing ? (mode === 'caos' ? 'graphic-eq' : 'stop') : 'play-arrow'
            }
            size={26}
            color={playing ? bg : colors.ink}
          />
        </View>
        {count > 1 && (
          <View style={[styles.badge, { backgroundColor: colors.ink }]}>
            <T style={[styles.badgeText, { color: bg }]}>×{count}</T>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <T style={styles.dur}>{formatDuration(sound.duration_ms)}</T>
        <View style={styles.footerIcons}>
          {!sound.is_public && <Icon name="lock" size={16} color={colors.ink} />}
          <Pressable onPress={() => onFav(sound)} hitSlop={8}>
            <Icon
              name={isFav ? 'favorite' : 'favorite-border'}
              size={20}
              color={colors.ink}
            />
          </Pressable>
          <Pressable onPress={() => onShare(sound)} hitSlop={8}>
            <Icon name="share" size={20} color={colors.ink} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1 / 0.92,
    borderRadius: 22,
    padding: 12,
    overflow: 'hidden',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,14,8,.16)',
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  name: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 18,
    color: colors.ink,
  },
  more: {
    width: 30,
    height: 30,
    marginTop: -4,
    marginRight: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(26,22,18,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: 0,
    top: 0,
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.mono, fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dur: { fontFamily: fonts.mono, fontSize: 11, color: colors.ink, opacity: 0.75 },
  footerIcons: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
