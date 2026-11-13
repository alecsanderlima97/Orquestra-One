import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import { accessForRole } from "../src/lib/roles";

let env: RulesTestEnvironment;
const A = "empresaA";
const path = (tenant: string) => `companies/${tenant}/workOrders/OS-1/foto.jpg`;
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "orquestra-one-rules-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});
afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/prof"), { tenantId: A, active: true, access: accessForRole("Profissional") });
    await setDoc(doc(db, "users/visu"), { tenantId: A, active: true, access: accessForRole("Visualizador") });
    await setDoc(doc(db, "users/fin"), { tenantId: A, active: true, access: { ...accessForRole("Financeiro"), orders: "none" } });
    await setDoc(doc(db, "users/outra"), { tenantId: "empresaB", active: true, access: accessForRole("Proprietário") });
    await uploadBytes(ref(ctx.storage(), path(A)), jpeg, { contentType: "image/jpeg" });
  });
});

const storageAs = (uid: string) => env.authenticatedContext(uid).storage();

describe("anexos das O.S.", () => {
  it("quem edita ordens envia foto da própria empresa", async () => {
    await assertSucceeds(uploadBytes(ref(storageAs("prof"), `companies/${A}/workOrders/OS-1/nova.jpg`), jpeg, { contentType: "image/jpeg" }));
  });
  it("não aceita tipo de arquivo fora da lista", async () => {
    await assertFails(uploadBytes(ref(storageAs("prof"), `companies/${A}/workOrders/OS-1/x.html`), jpeg, { contentType: "text/html" }));
  });
  it("visualizador vê mas não envia", async () => {
    await assertSucceeds(getBytes(ref(storageAs("visu"), path(A))));
    await assertFails(uploadBytes(ref(storageAs("visu"), `companies/${A}/workOrders/OS-1/v.jpg`), jpeg, { contentType: "image/jpeg" }));
  });
  it("sem acesso a ordens não lê", async () => {
    await assertFails(getBytes(ref(storageAs("fin"), path(A))));
  });
  it("outra empresa não lê nem envia", async () => {
    await assertFails(getBytes(ref(storageAs("outra"), path(A))));
    await assertFails(uploadBytes(ref(storageAs("outra"), `companies/${A}/workOrders/OS-1/i.jpg`), jpeg, { contentType: "image/jpeg" }));
  });
});
