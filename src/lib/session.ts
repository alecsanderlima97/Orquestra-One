import { cookies } from "next/headers";
import { getFirebaseAdminServices } from "@/src/lib/firebase-admin";

export async function getOneSession() {
  const session = (await cookies()).get("orquestra_one_session")?.value;
  const services = getFirebaseAdminServices();
  if (!session || !services) return null;
  try {
    return await services.auth.verifySessionCookie(session, true);
  } catch {
    return null;
  }
}

export async function getPlatformSession() {
  const identity = await getOneSession();
  if (!identity) return null;
  const services = getFirebaseAdminServices();
  if (!services) return null;
  const profile = (await services.firestore.doc(`users/${identity.uid}`).get()).data();
  return profile && ["platform_owner", "orquestra_admin"].includes(String(profile.role)) && profile.active === true ? { identity, profile } : null;
}
