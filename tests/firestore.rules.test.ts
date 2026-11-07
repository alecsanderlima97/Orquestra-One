import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { accessForRole } from "../src/lib/roles";

let env: RulesTestEnvironment;

const A = "empresaA";
const B = "empresaB";

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "orquestra-one-rules-test", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const user = (uiRole: string, tenantId: string | null, extra: Record<string, unknown> = {}) => ({ name: uiRole, uiRole, tenantId, active: true, access: accessForRole(uiRole), ...extra });
    await setDoc(doc(db, "users/dono"), user("Proprietário", A, { role: "company_owner" }));
    await setDoc(doc(db, "users/prof"), user("Profissional", A, { role: "company_user" }));
    await setDoc(doc(db, "users/visu"), user("Visualizador", A, { role: "viewer" }));
    await setDoc(doc(db, "users/inativo"), user("Administrador", A, { role: "company_admin", active: false }));
    await setDoc(doc(db, "users/semacesso"), { tenantId: A, active: true, role: "company_admin" });
    await setDoc(doc(db, "users/outra"), user("Proprietário", B, { role: "company_owner" }));
    await setDoc(doc(db, "users/plataforma"), { role: "platform_owner", active: true });
    await setDoc(doc(db, `companies/${A}`), { name: "A", status: "ativo" });
    await setDoc(doc(db, `companies/${A}/workOrders/os1`), { client: "X" });
    await setDoc(doc(db, `companies/${A}/finance/f1`), { amountCents: 100 });
    await setDoc(doc(db, `companies/${A}/team/tm-prof`), { role: "Profissional" });
    await setDoc(doc(db, `companies/${A}/audit/a1`), { action: "x" });
    await setDoc(doc(db, "invitations/i1"), { email: "x@gmail.com", tenantId: A });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const by = (uid: string, data: Record<string, unknown>) => ({ ...data, _by: uid, _at: serverTimestamp() });

describe("isolamento entre empresas", () => {
  it("dono da empresa A lê e grava a própria OS", async () => {
    await assertSucceeds(getDoc(doc(as("dono"), `companies/${A}/workOrders/os1`)));
    await assertSucceeds(setDoc(doc(as("dono"), `companies/${A}/workOrders/os2`), by("dono", { client: "Y" })));
  });
  it("dono da empresa B não lê nem grava dados da empresa A", async () => {
    await assertFails(getDoc(doc(as("outra"), `companies/${A}/workOrders/os1`)));
    await assertFails(getDocs(collection(as("outra"), `companies/${A}/finance`)));
    await assertFails(setDoc(doc(as("outra"), `companies/${A}/workOrders/os9`), by("outra", { client: "invasor" })));
  });
  it("visitante sem login não acessa nada", async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, `companies/${A}/workOrders/os1`)));
    await assertFails(getDoc(doc(anon, `companies/${A}`)));
  });
});

describe("permissões por função", () => {
  it("profissional edita OS mas não vê o financeiro", async () => {
    await assertSucceeds(setDoc(doc(as("prof"), `companies/${A}/workOrders/os1`), by("prof", { client: "X", status: "done" })));
    await assertFails(getDocs(collection(as("prof"), `companies/${A}/finance`)));
  });
  it("visualizador lê mas não grava nem apaga", async () => {
    await assertSucceeds(getDoc(doc(as("visu"), `companies/${A}/finance/f1`)));
    await assertFails(setDoc(doc(as("visu"), `companies/${A}/finance/f2`), by("visu", { amountCents: 1 })));
    await assertFails(deleteDoc(doc(as("visu"), `companies/${A}/workOrders/os1`)));
  });
  it("usuário desativado perde todo acesso", async () => {
    await assertFails(getDoc(doc(as("inativo"), `companies/${A}/workOrders/os1`)));
  });
  it("perfil sem mapa de acesso não lê nada", async () => {
    await assertFails(getDoc(doc(as("semacesso"), `companies/${A}/workOrders/os1`)));
  });
});

describe("dados só do servidor", () => {
  it("ninguém grava o próprio perfil (função, empresa, acesso)", async () => {
    await assertSucceeds(getDoc(doc(as("prof"), "users/prof")));
    await assertFails(setDoc(doc(as("prof"), "users/prof"), { role: "company_owner" }, { merge: true }));
    await assertFails(getDoc(doc(as("prof"), "users/dono")));
  });
  it("equipe não é gravada pelo navegador, nem pelo dono", async () => {
    await assertSucceeds(getDoc(doc(as("dono"), `companies/${A}/team/tm-prof`)));
    await assertFails(setDoc(doc(as("dono"), `companies/${A}/team/tm-prof`), { role: "Administrador" }));
  });
  it("empresa, convites e auditoria não são gravados pelo navegador", async () => {
    await assertFails(setDoc(doc(as("dono"), `companies/${A}`), { status: "ativo", plan: "premium" }, { merge: true }));
    await assertFails(getDoc(doc(as("dono"), "invitations/i1")));
    await assertSucceeds(getDoc(doc(as("dono"), `companies/${A}/audit/a1`)));
    await assertFails(setDoc(doc(as("dono"), `companies/${A}/audit/a2`), { action: "falso" }));
    await assertFails(getDoc(doc(as("prof"), `companies/${A}/audit/a1`)));
  });
  it("plataforma lê a empresa, mas não os dados operacionais", async () => {
    await assertSucceeds(getDoc(doc(as("plataforma"), `companies/${A}`)));
    await assertFails(getDoc(doc(as("plataforma"), `companies/${A}/workOrders/os1`)));
  });
});

describe("quem alterou", () => {
  it("gravação sem carimbo ou em nome de outra pessoa é recusada", async () => {
    await assertFails(setDoc(doc(as("dono"), `companies/${A}/workOrders/os3`), { client: "sem carimbo" }));
    await assertFails(setDoc(doc(as("prof"), `companies/${A}/workOrders/os3`), by("dono", { client: "fingindo ser o dono" })));
    await assertFails(setDoc(doc(as("prof"), `companies/${A}/workOrders/os3`), { client: "hora falsa", _by: "prof", _at: new Date(2020, 0, 1) }));
    await assertSucceeds(updateDoc(doc(as("prof"), `companies/${A}/workOrders/os1`), by("prof", { status: "waiting" })));
  });
  it("histórico: só inclusão, em nome próprio, e só o gestor da equipe lê", async () => {
    const entry = { actorUid: "prof", collection: "workOrders", docId: "os1", action: "update", at: serverTimestamp() };
    await assertSucceeds(addDoc(collection(as("prof"), `companies/${A}/activity`), entry));
    await assertFails(addDoc(collection(as("prof"), `companies/${A}/activity`), { ...entry, actorUid: "dono" }));
    await assertFails(addDoc(collection(as("prof"), `companies/${A}/activity`), { ...entry, extra: "x" }));
    await assertFails(addDoc(collection(as("outra"), `companies/${A}/activity`), { ...entry, actorUid: "outra" }));
    await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), `companies/${A}/activity/h1`), { ...entry, at: new Date() }); });
    await assertFails(getDoc(doc(as("prof"), `companies/${A}/activity/h1`)));
    await assertSucceeds(getDoc(doc(as("dono"), `companies/${A}/activity/h1`)));
    await assertFails(deleteDoc(doc(as("dono"), `companies/${A}/activity/h1`)));
    await assertFails(setDoc(doc(as("dono"), `companies/${A}/activity/h1`), { ...entry, actorUid: "dono", action: "delete" }));
  });
});
