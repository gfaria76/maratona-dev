/**
 * middleware/auth.ts
 *
 * Protege a rota /prova exigindo login com Google @ufms.br.
 * Aplicado apenas nas páginas que usam definePageMeta({ middleware: 'auth' }).
 */
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return;

  await waitForFirebaseAuth();

  const user = useFirebaseUser();
  const email = String(user.value?.email || "").toLowerCase();

  if (!user.value) {
    return navigateTo("/");
  }

  if (!email.endsWith("@ufms.br")) {
    const { signOut } = await import("firebase/auth");
    await signOut(useFirebaseAuthClient());
    return navigateTo("/?error=domain");
  }
});
