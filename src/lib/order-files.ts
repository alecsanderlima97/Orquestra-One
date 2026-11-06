import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getApp } from "firebase/app";
import { blobToDataUrl, compressImage } from "@/src/lib/image-tools";

export type OrderAttachment = { id: string; name: string; kind: "photo" | "file"; url: string; path?: string; sizeBytes: number; createdAt: string };

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const DEMO_MAX_BYTES = 400 * 1024;
const ALLOWED = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

function safeName(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80) || "arquivo";
}

/**
 * Prepara e envia um anexo da O.S. Fotos são reduzidas no aparelho.
 * Com empresa conectada vai para o Firebase Storage (pasta da empresa); na demonstração fica no navegador.
 */
export async function storeOrderAttachment(file: File, orderId: string, tenantId: string | null, createdAt: string): Promise<OrderAttachment> {
  if (!ALLOWED.test(file.type)) throw new Error("Envie uma foto (JPG, PNG, WEBP, HEIC) ou um PDF.");
  const isPhoto = file.type.startsWith("image/");
  const blob: Blob = isPhoto ? await compressImage(file).catch(() => file) : file;
  if (blob.size > MAX_ATTACHMENT_BYTES) throw new Error("Arquivo acima de 10 MB.");
  const id = `anx-${crypto.randomUUID().slice(0, 8)}`;
  const name = isPhoto ? `${safeName(file.name).replace(/\.[^.]+$/, "")}.jpg` : safeName(file.name);
  if (!tenantId) {
    if (blob.size > DEMO_MAX_BYTES) throw new Error("Na demonstração os anexos ficam no navegador e precisam ter até 400 KB.");
    return { id, name, kind: isPhoto ? "photo" : "file", url: await blobToDataUrl(blob), sizeBytes: blob.size, createdAt };
  }
  const path = `companies/${tenantId}/workOrders/${orderId}/${id}-${name}`;
  const target = ref(getStorage(getApp()), path);
  await uploadBytes(target, blob, { contentType: isPhoto ? "image/jpeg" : file.type });
  return { id, name, kind: isPhoto ? "photo" : "file", url: await getDownloadURL(target), path, sizeBytes: blob.size, createdAt };
}

export async function deleteStoredAttachment(attachment: OrderAttachment) {
  if (!attachment.path) return;
  await deleteObject(ref(getStorage(getApp()), attachment.path)).catch(() => undefined);
}
