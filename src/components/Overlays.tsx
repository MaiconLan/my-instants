import * as DocumentPicker from 'expo-document-picker';
import { AudioPlayer, createAudioPlayer } from 'expo-audio';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as api from '../lib/api';
import type { PickedFile, Sound } from '../lib/api';
import { playSound, probeDuration, shareSound } from '../lib/audio';
import { formatDuration, stripExt } from '../lib/format';
import { useStore } from '../lib/store';
import { colors, fonts, MAX_FILE_BYTES, SOUND_COLORS } from '../lib/theme';
import { Icon, IconName, T } from './ui';

function Sheet({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- Enviar: escolher arquivo ------------------------------------------------

function UploadSheet() {
  const open = useStore((s) => s.openOverlay);
  const toast = useStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > MAX_FILE_BYTES) {
      toast('Arquivo maior que 5 MB');
      return;
    }
    setBusy(true);
    const durationMs = await probeDuration(a.uri).catch(() => null);
    setBusy(false);
    open({
      kind: 'form',
      mode: 'new',
      file: { uri: a.uri, name: a.name, size: a.size ?? 0, durationMs },
    });
  };

  return (
    <Sheet onClose={() => open(null)}>
      <T style={styles.sheetTitle}>Enviar áudio</T>
      <Pressable onPress={pick} disabled={busy} style={styles.drop}>
        <Icon name="upload-file" size={40} color={colors.accent} />
        <T style={styles.dropTitle}>{busy ? 'Lendo arquivo…' : 'Escolher arquivo de áudio'}</T>
        <T style={styles.dropSub}>MP3 · M4A · OGG · OPUS · WAV — até 5 MB</T>
      </Pressable>
    </Sheet>
  );
}

// --- Novo / Editar -----------------------------------------------------------

function FormSheet({
  file,
  sound,
}: {
  file?: PickedFile;
  sound?: Sound;
}) {
  const user = useStore((s) => s.user)!;
  const mode = useStore((s) => s.mode);
  const open = useStore((s) => s.openOverlay);
  const toast = useStore((s) => s.showToast);
  const addSound = useStore((s) => s.addSound);
  const patchSound = useStore((s) => s.patchSound);
  const set = useStore((s) => s.set);

  const editing = !!sound;
  const [name, setName] = useState(
    sound ? sound.name : stripExt(file!.name).replace(/[_]+/g, ' ').slice(0, 80),
  );
  const [color, setColor] = useState(
    sound?.color ?? SOUND_COLORS[Math.floor(Math.random() * SOUND_COLORS.length)],
  );
  const [isPublic, setIsPublic] = useState(sound ? sound.is_public : true);
  const [submitted, setSubmitted] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => () => player.current?.remove(), []);

  const durationMs = sound ? sound.duration_ms : file!.durationMs;
  const fileName = sound ? sound.name : file!.name;
  const nameError = submitted && !name.trim() ? 'Dê um nome pro áudio' : null;

  const preview = () => {
    if (editing) {
      playSound(sound!, 'playpause').catch(() => toast('Não foi possível tocar o áudio'));
      return;
    }
    player.current?.remove();
    const p = createAudioPlayer({ uri: file!.uri });
    player.current = p;
    p.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish) setPreviewing(false);
    });
    setPreviewing(true);
    p.play();
  };

  const submit = async () => {
    setSubmitted(true);
    if (!name.trim() || progress !== null) return;
    setProgress(0);
    const tick = setInterval(
      () => setProgress((p) => (p === null ? p : Math.min(90, p + 6))),
      150,
    );
    try {
      if (editing) {
        const patch = { name: name.trim(), color, is_public: isPublic };
        await api.updateSound(sound!.id, patch);
        patchSound(sound!.id, patch);
        open(null);
        toast('Alterações salvas');
      } else {
        const created = await api.uploadSound(user.id, file!, {
          name: name.trim(),
          color,
          isPublic,
        });
        addSound(created);
        set({ filter: 'todos', sort: 'recentes', query: '' });
        setProgress(100);
        open(null);
        toast(isPublic ? 'Áudio enviado — visível pra todos' : 'Áudio enviado — só você vê');
      }
    } catch (e: any) {
      setProgress(null);
      toast(e?.message ? `Erro: ${e.message}` : 'Não foi possível enviar');
    } finally {
      clearInterval(tick);
    }
  };

  const sending = progress !== null;

  return (
    <Sheet onClose={() => !sending && open(null)}>
      <T style={styles.sheetTitle}>{editing ? 'Editar áudio' : 'Novo áudio'}</T>

      <View style={[styles.fileCard, { backgroundColor: color }]}>
        <Icon name="audio-file" size={28} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <T style={styles.fileName} numberOfLines={1}>
            {fileName}
          </T>
          <T style={styles.fileDur}>{formatDuration(durationMs)}</T>
        </View>
        <Pressable onPress={preview} style={styles.previewBtn} hitSlop={6}>
          <Icon name={previewing ? 'graphic-eq' : 'play-arrow'} size={24} color={color} />
        </Pressable>
      </View>

      <View style={styles.labelRow}>
        <T style={styles.label}>Nome do áudio</T>
        <T style={styles.counter}>{name.length}/80</T>
      </View>
      <TextInput
        value={name}
        onChangeText={(t) => setName(t.slice(0, 80))}
        style={[styles.input, nameError ? { borderColor: colors.danger } : null]}
        placeholder="Ex.: Alexa tan tan tan"
        placeholderTextColor={colors.textMuted}
        editable={!sending}
      />
      {nameError && <T style={styles.err}>{nameError}</T>}

      <T style={[styles.label, { marginTop: 14 }]}>Cor do botão</T>
      <View style={styles.swatches}>
        {SOUND_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              c === color && styles.swatchOn,
            ]}
          />
        ))}
      </View>

      <Pressable onPress={() => setIsPublic(!isPublic)} style={styles.checkRow} disabled={sending}>
        <View style={[styles.checkbox, isPublic && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
          {isPublic && <Icon name="check" size={18} color={colors.ink} />}
        </View>
        <View style={{ flex: 1 }}>
          <T style={styles.checkTitle}>Áudio público</T>
          <T style={styles.checkDesc}>
            {isPublic
              ? 'Todos os amigos logados veem e podem tocar.'
              : 'Desmarcado: só você vê este áudio.'}
          </T>
        </View>
      </Pressable>

      {sending && !editing && (
        <View style={{ marginTop: 14 }}>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${progress}%` }]} />
          </View>
          <T style={styles.progText}>Enviando… {progress}%</T>
        </View>
      )}

      <View style={styles.btnRow}>
        <Pressable onPress={() => open(null)} disabled={sending} style={styles.cancel}>
          <T style={styles.cancelText}>Cancelar</T>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={sending}
          style={[styles.primary, sending && { opacity: 0.6 }]}
        >
          <T style={styles.primaryText}>{editing ? 'Salvar' : 'Enviar'}</T>
        </Pressable>
      </View>
    </Sheet>
  );
}

// --- Ações (⋮) ---------------------------------------------------------------

function ActionRow({
  icon,
  label,
  onPress,
  color = colors.text,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionRow}>
      <Icon name={icon} size={24} color={color} />
      <T style={[styles.actionText, { color }]}>{label}</T>
    </Pressable>
  );
}

function ActionsSheet({ sound }: { sound: Sound }) {
  const user = useStore((s) => s.user);
  const mode = useStore((s) => s.mode);
  const isFav = useStore((s) => s.favorites.has(sound.id));
  const open = useStore((s) => s.openOverlay);
  const toast = useStore((s) => s.showToast);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const mine = sound.owner_id === user?.id;

  return (
    <Sheet onClose={() => open(null)}>
      <View style={styles.actionHead}>
        <View style={[styles.actionSwatch, { backgroundColor: sound.color }]} />
        <View style={{ flex: 1 }}>
          <T style={styles.actionName} numberOfLines={2}>
            {sound.name}
          </T>
          <T style={styles.actionMeta}>
            Enviado por {mine ? 'você' : (sound.owner_name ?? 'um amigo')} ·{' '}
            {sound.is_public ? 'Público' : 'Privado'}
            {sound.duration_ms ? ` · ${formatDuration(sound.duration_ms)}` : ''}
          </T>
        </View>
      </View>

      <ActionRow
        icon="play-arrow"
        label="Tocar"
        onPress={() => {
          open(null);
          playSound(sound, mode).catch(() => toast('Não foi possível tocar o áudio'));
        }}
      />
      <ActionRow
        icon="share"
        label="Compartilhar"
        onPress={() => {
          open(null);
          shareSound(sound).catch(() => toast('Não foi possível compartilhar'));
        }}
      />
      <ActionRow
        icon={isFav ? 'favorite' : 'favorite-border'}
        label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        onPress={() => {
          open(null);
          toggleFavorite(sound.id);
        }}
      />
      {mine && (
        <>
          <ActionRow
            icon="edit"
            label="Editar nome e visibilidade"
            onPress={() => open({ kind: 'form', mode: 'edit', soundId: sound.id })}
          />
          <ActionRow
            icon="delete-outline"
            label="Excluir"
            color={colors.danger}
            onPress={() => open({ kind: 'delete', soundId: sound.id })}
          />
        </>
      )}
    </Sheet>
  );
}

// --- Excluir -------------------------------------------------------------------

function DeleteDialog({ sound }: { sound: Sound }) {
  const open = useStore((s) => s.openOverlay);
  const toast = useStore((s) => s.showToast);
  const removeSound = useStore((s) => s.removeSound);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.deleteSound(sound);
      removeSound(sound);
      open(null);
      toast('Áudio excluído');
    } catch (e: any) {
      setBusy(false);
      toast(e?.message ? `Erro: ${e.message}` : 'Não foi possível excluir');
    }
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={() => open(null)} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.dialogWrap}>
        <Pressable style={styles.scrimAbs} onPress={() => !busy && open(null)} />
        <View style={styles.dialog}>
          <Icon name="delete" size={32} color={colors.danger} />
          <T style={styles.dialogTitle}>Excluir “{sound.name}”?</T>
          <T style={styles.dialogText}>
            O áudio sai da lista de todo mundo e o arquivo é apagado. Não dá pra desfazer.
          </T>
          <View style={styles.dialogBtns}>
            <Pressable onPress={() => open(null)} disabled={busy} style={styles.dialogCancel}>
              <T style={styles.cancelText}>Cancelar</T>
            </Pressable>
            <Pressable
              onPress={confirm}
              disabled={busy}
              style={[styles.dialogDel, busy && { opacity: 0.6 }]}
            >
              <T style={styles.primaryText}>{busy ? 'Excluindo…' : 'Excluir'}</T>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- Raiz --------------------------------------------------------------------

export function Overlays() {
  const overlay = useStore((s) => s.overlay);
  const sounds = useStore((s) => s.sounds);
  if (!overlay) return null;

  if (overlay.kind === 'upload') return <UploadSheet />;
  if (overlay.kind === 'form' && overlay.mode === 'new') {
    return <FormSheet file={overlay.file} />;
  }
  const sound = sounds.find(
    (s) => 'soundId' in overlay && s.id === overlay.soundId,
  );
  if (!sound) return null;
  if (overlay.kind === 'form') return <FormSheet key={sound.id} sound={sound} />;
  if (overlay.kind === 'actions') return <ActionsSheet sound={sound} />;
  return <DeleteDialog sound={sound} />;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim },
  scrimAbs: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.handle,
    marginBottom: 14,
  },
  sheetTitle: { fontFamily: fonts.extrabold, fontSize: 22, marginBottom: 16 },

  drop: {
    height: 140,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.handle,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  dropTitle: { fontFamily: fonts.bold, fontSize: 16, marginTop: 4 },
  dropSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },

  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    marginBottom: 16,
  },
  fileName: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  fileDur: { fontFamily: fonts.mono, fontSize: 12, color: colors.ink, opacity: 0.75 },
  previewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted2 },
  counter: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  err: { fontSize: 12.5, color: colors.danger, marginTop: 4 },

  swatches: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  swatchOn: { borderWidth: 3, borderColor: colors.text },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface2,
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: { fontFamily: fonts.bold, fontSize: 15.5 },
  checkDesc: { fontSize: 13, color: colors.textMuted2, marginTop: 2 },

  track: { height: 6, borderRadius: 3, backgroundColor: colors.borderSoft, overflow: 'hidden' },
  bar: { height: 6, backgroundColor: colors.accent },
  progText: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted, marginTop: 6 },

  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancel: { height: 50, paddingHorizontal: 20, justifyContent: 'center' },
  cancelText: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.textSoft },
  primary: {
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 28,
    backgroundColor: colors.accent,
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },

  actionHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  actionSwatch: { width: 48, height: 48, borderRadius: 14 },
  actionName: { fontFamily: fonts.bold, fontSize: 18 },
  actionMeta: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  actionRow: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionText: { fontFamily: fonts.medium, fontSize: 15.5 },

  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: {
    width: '100%',
    backgroundColor: colors.surface2,
    borderRadius: 28,
    padding: 24,
    gap: 10,
  },
  dialogTitle: { fontFamily: fonts.extrabold, fontSize: 20, marginTop: 4 },
  dialogText: { fontSize: 14.5, color: colors.textMuted2, lineHeight: 20 },
  dialogBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  dialogCancel: { height: 46, paddingHorizontal: 18, justifyContent: 'center' },
  dialogDel: {
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 22,
    backgroundColor: colors.dangerBtn,
    justifyContent: 'center',
  },
});
