/**
 * O share intent chega como uma URL `myinstants://dataUrl=...` que não é uma rota. Quem
 * trata o conteúdo é o hook `useIncomingShare`, então aqui só mandamos para a home.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return path.includes('dataUrl=') ? '/' : path;
}
