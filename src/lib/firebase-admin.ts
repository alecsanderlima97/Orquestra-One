import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { initializeFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return getApps().length ? getApps()[0] : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function getFirebaseAdminAuth() {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseAdminServices() {
  const app = getAdminApp();
  return app ? { auth: getAuth(app), firestore: initializeFirestore(app, { preferRest: true }) } : null;
}
