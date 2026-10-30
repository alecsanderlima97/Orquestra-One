import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, getRedirectResult, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";

const config: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseClientConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

function getFirebaseApp() {
  if (!isFirebaseClientConfigured) throw new Error("O acesso Google ainda não foi configurado para este ambiente.");
  return getApps().length ? getApp() : initializeApp(config);
}

function getGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export async function startGoogleSignIn() {
  const app = getFirebaseApp();
  await signInWithRedirect(getAuth(app), getGoogleProvider());
}

export async function getGoogleRedirectToken() {
  const app = getFirebaseApp();
  const result = await getRedirectResult(getAuth(app));
  return result?.user.getIdToken() ?? null;
}

export async function getCurrentFirebaseUserToken() {
  const app = getFirebaseApp();
  const user = getAuth(app).currentUser;
  return user ? user.getIdToken() : null;
}
