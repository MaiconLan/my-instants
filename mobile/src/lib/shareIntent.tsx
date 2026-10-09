import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ReactNode } from 'react';

/**
 * Receber áudio de outros apps (WhatsApp, gravador...) exige código nativo próprio, que
 * o Expo Go não tem. No Expo Go o módulo nem é carregado: o app abre normal, só sem
 * aparecer na lista de compartilhamento. No APK (EAS/GitHub Actions) funciona.
 */
const available = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod: typeof import('expo-share-intent') | null = available
  ? require('expo-share-intent')
  : null;

export type IncomingFile = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

export function ShareIntentRoot({ children }: { children: ReactNode }) {
  if (!mod) return <>{children}</>;
  const Provider = mod.ShareIntentProvider;
  return <Provider options={{ resetOnBackground: false }}>{children}</Provider>;
}

export function useIncomingShare(): { file: IncomingFile | null; reset: () => void } {
  // `mod` é constante durante toda a vida do processo, então a ordem dos hooks não muda.
  if (!mod) return { file: null, reset: () => {} };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { hasShareIntent, shareIntent, resetShareIntent } = mod.useShareIntentContext();
  const f = hasShareIntent ? shareIntent.files?.[0] : undefined;
  if (!f) {
    // Texto/URL compartilhado: não é áudio, só limpa.
    return { file: null, reset: resetShareIntent };
  }
  const uri = f.path.startsWith('file://') || f.path.startsWith('content://')
    ? f.path
    : `file://${f.path}`;
  return {
    file: {
      uri,
      name: f.fileName ?? 'audio',
      mimeType: f.mimeType ?? '',
      size: f.size ?? 0,
    },
    reset: resetShareIntent,
  };
}
