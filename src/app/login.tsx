import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName, T } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { colors, fonts, SOUND_COLORS } from '../lib/theme';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function Field({
  label,
  icon,
  value,
  onChangeText,
  error,
  secure,
  hint,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label: string;
  icon: IconName;
  value: string;
  onChangeText: (t: string) => void;
  error?: string | null;
  secure?: boolean;
  hint?: string;
  keyboardType?: 'email-address';
  autoCapitalize?: 'none' | 'words';
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T style={styles.label}>{label}</T>
      <View style={[styles.box, error ? { borderColor: colors.danger } : null]}>
        <Icon name={icon} size={22} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          secureTextEntry={secure && !show}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          placeholder={hint}
          placeholderTextColor={colors.textMuted}
        />
        {secure && (
          <Pressable onPress={() => setShow(!show)} hitSlop={8}>
            <Icon name={show ? 'visibility-off' : 'visibility'} size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {error ? <T style={styles.err}>{error}</T> : null}
    </View>
  );
}

export default function Login() {
  const insets = useSafeAreaInsets();
  const toast = useStore((s) => s.showToast);
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = {
    name: signup && !name.trim() ? 'Digite seu nome' : null,
    email: !EMAIL_RE.test(email.trim()) ? 'E-mail inválido' : null,
    password: signup
      ? password.length < 6
        ? 'A senha precisa ter pelo menos 6 caracteres'
        : null
      : !password
        ? 'Digite sua senha'
        : null,
    confirm: signup && confirm !== password ? 'As senhas não batem' : null,
  };
  const show = (k: keyof typeof errors) => (submitted ? errors[k] : null);

  const submit = async () => {
    setSubmitted(true);
    setServerError(null);
    if (Object.values(errors).some(Boolean)) return;
    setBusy(true);
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (data.session) toast(`Conta criada. Bem-vindo, ${name.trim()}!`);
        else setServerError('Conta criada. Confirme o e-mail para entrar.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        const n = (data.user.user_metadata?.name as string | undefined) ?? 'de volta';
        toast(`Oi, ${n}!`);
      }
    } catch (e: any) {
      const m: string = e?.message ?? '';
      setServerError(
        /invalid login/i.test(m)
          ? 'E-mail ou senha incorretos.'
          : /already registered/i.test(m)
            ? 'Esse e-mail já tem conta.'
            : /network|fetch/i.test(m)
              ? 'Sem conexão. Tente de novo.'
              : m || 'Algo deu errado.',
      );
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setServerError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setServerError('Digite seu e-mail acima pra receber o link.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setServerError(error.message);
    else toast(`Link de redefinição enviado pra ${email.trim()}`);
  };

  const switchTo = (s: boolean) => {
    setSignup(s);
    setSubmitted(false);
    setServerError(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
      >
        <View style={styles.brand}>
          {[0, 2, 4, 6].map((i) => (
            <View key={i} style={[styles.brandSq, { backgroundColor: SOUND_COLORS[i] }]} />
          ))}
        </View>
        <T style={styles.title}>{signup ? 'Crie sua conta' : 'Bem-vindo de volta'}</T>
        <T style={styles.sub}>
          {signup
            ? 'Pra enviar seus áudios e ver os dos amigos.'
            : 'Entre pra tocar e mandar os áudios da galera.'}
        </T>

        <View style={styles.seg}>
          {[false, true].map((s) => (
            <Pressable
              key={String(s)}
              onPress={() => switchTo(s)}
              style={[styles.segTab, signup === s && { backgroundColor: colors.text }]}
            >
              <T
                style={[
                  styles.segText,
                  { color: signup === s ? colors.ink : colors.textMuted },
                ]}
              >
                {s ? 'Criar conta' : 'Entrar'}
              </T>
            </Pressable>
          ))}
        </View>

        {signup && (
          <Field
            label="Seu nome"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            error={show('name')}
            autoCapitalize="words"
          />
        )}
        <Field
          label="E-mail"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          error={show('email')}
          keyboardType="email-address"
        />
        <Field
          label="Senha"
          icon="lock-outline"
          value={password}
          onChangeText={setPassword}
          error={show('password')}
          secure
          hint={signup ? 'Mínimo 6 caracteres' : undefined}
        />
        {signup && (
          <Field
            label="Confirmar senha"
            icon="lock-outline"
            value={confirm}
            onChangeText={setConfirm}
            error={show('confirm')}
            secure
          />
        )}

        {!signup && (
          <Pressable onPress={forgot} style={{ alignSelf: 'flex-end' }}>
            <T style={styles.link}>Esqueci a senha</T>
          </Pressable>
        )}

        {serverError && (
          <View style={styles.errorBox}>
            <Icon name="error-outline" size={22} color={colors.danger} />
            <T style={styles.errorText}>{serverError}</T>
          </View>
        )}

        <Pressable onPress={submit} disabled={busy} style={[styles.primary, busy && { opacity: 0.7 }]}>
          <T style={styles.primaryText}>
            {signup ? (busy ? 'Criando conta…' : 'Criar conta') : busy ? 'Entrando…' : 'Entrar'}
          </T>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', gap: 6 },
  brandSq: { width: 30, height: 30, borderRadius: 10 },
  title: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 35, letterSpacing: -0.7 },
  sub: { fontSize: 15, color: colors.textMuted, marginTop: -6 },
  seg: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 4 },
  segTab: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.bold, fontSize: 15 },
  label: { fontSize: 13, color: colors.textMuted2 },
  box: {
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceDim,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, padding: 0 },
  err: { fontSize: 12.5, color: colors.danger },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.accent },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.errorBg,
    borderRadius: 14,
    padding: 14,
  },
  errorText: { flex: 1, fontSize: 14, color: colors.text },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
});
