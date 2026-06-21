import type { Auth, User } from "firebase/auth";

export function useFirebaseUser() {
  return useState<User | null>("firebase-user", () => null);
}

export function useFirebaseAuthReady() {
  return useState("firebase-auth-ready", () => false);
}

export function useFirebaseAuthClient(): Auth {
  const nuxtApp = useNuxtApp();
  return nuxtApp.$firebaseAuth as Auth;
}

export async function waitForFirebaseAuth() {
  const ready = useFirebaseAuthReady();
  if (ready.value) return;

  await new Promise<void>((resolve) => {
    const stop = watch(
      ready,
      (value) => {
        if (value) {
          stop();
          resolve();
        }
      },
      { immediate: true },
    );
  });
}
