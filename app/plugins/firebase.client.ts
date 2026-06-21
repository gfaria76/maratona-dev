import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, onIdTokenChanged, type Auth, type User } from "firebase/auth";

declare module "#app" {
  interface NuxtApp {
    $firebaseApp: FirebaseApp;
    $firebaseAuth: Auth;
  }
}

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig();
  const firebaseConfig = runtimeConfig.public.firebase;
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });
  const auth = getAuth(app);

  const user = useState<User | null>("firebase-user", () => null);
  const ready = useState("firebase-auth-ready", () => false);
  const tokenCookie = useCookie<string | null>("firebase_id_token", {
    sameSite: "lax",
    secure: window.location.protocol === "https:",
    maxAge: 60 * 60,
  });

  onIdTokenChanged(auth, async (nextUser) => {
    user.value = nextUser;
    tokenCookie.value = nextUser ? await nextUser.getIdToken() : null;
    ready.value = true;
  });

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
    },
  };
});
