"use client";

import { useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { ACCESS_LABEL, INVITABLE_ROLES, PERMISSION_AREAS, ROLE_PRESETS, accessSummary, isGoogleAccount, isValidEmail, type AccessLevel } from "@/src/lib/roles";
import { useDemoData, type InvitationRecord, type TeamRecord } from "@/src/components/demo-data";
import { EmptyState, Modal, PanelHeader, SelectField, TextField, rowOpenProps } from "@/src/components/ui-parts";

const INVITE_BADGE: Record<InvitationRecord["status"], { label: string; className: string }> = {
  pending: { label: "Pendente", className: "status-pending" },
  accepted: { label: "Aceito", className: "status-confirmed" },
  revoked: { label: "Revogado", className: "status-overdue" },
  expired: { label: "Expirado", className: "status-waiting" },
};

function AccessDots({ level }: { level: AccessLevel }) {
  return <span className={`access-dot access-${level}`} title={ACCESS_LABEL[level]}>{level === "edit" ? "Edita" : level === "view" ? "Vê" : "—"}</span>;
}

export function TeamView() {
  const data = useDemoData();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberId, setMemberId] = useState<string>();
  const [matrixOpen, setMatrixOpen] = useState(false);
  const pending = data.invitations.filter((invite) => invite.status === "pending").length;
  const activeCount = data.team.filter((member) => member.active !== false).length;

  function remove(member: TeamRecord) {
    if (member.role === "Proprietário") return;
    if (window.confirm(`Remover ${member.name} da equipe? A pessoa perde o acesso na hora. Os registros que ela criou continuam no sistema.`)) data.removeTeamMember(member.id);
  }

  return <section className="panel full-panel">
    <PanelHeader eyebrow={`${activeCount} pessoas ativas${pending ? ` · ${pending} convite(s) pendente(s)` : ""}`} title="Equipe e permissões" action="Convidar pessoa" onAction={() => setInviteOpen(true)} />
    <div className="view-toolbar"><div className="permissions-note"><ShieldCheck size={17} /><span>Ninguém entra por cadastro direto: o proprietário convida pelo Gmail da pessoa, define a função e ela acessa só o que a função permite. A empresa fica ligada ao proprietário, que é o dono do sistema.</span></div></div>
    <p className="view-hint">Dê dois cliques (ou toque) em uma pessoa para alterar a função ou o acesso.</p>
    <div className="team-table">
      <div className="table-head team-head"><span>Nome</span><span>Função</span><span>Permissões</span><span>Status</span><span /></div>
      {data.team.map((member) => {
        const owner = member.role === "Proprietário";
        const active = member.active !== false;
        return <div className="team-row row-openable" key={member.id} {...rowOpenProps(() => setMemberId(member.id))}>
          <span className={`client-avatar client-${member.tone}`}>{member.initials}</span>
          <div className="team-name"><strong>{member.name}{owner && <Lock size={11} aria-label="Proprietário" />}</strong><span>{member.email}</span></div>
          <span className="team-access">{member.role}</span>
          <span className="team-access">{member.access}</span>
          <span className={`status-pill ${active ? "status-confirmed" : "status-waiting"}`}><span className="status-dot" />{active ? "Ativo" : "Inativo"}</span>
          <div className="row-actions">
            <button className="table-action" type="button" onClick={() => setMemberId(member.id)}>{owner ? "Ver" : "Permissões"}</button>
            {!owner && <button className="table-action" type="button" onClick={() => data.updateTeamMember(member.id, { active: !active })}>{active ? "Desativar" : "Reativar"}</button>}
            {!owner && <button className="table-action table-action-danger" type="button" onClick={() => remove(member)}>Remover</button>}
          </div>
        </div>;
      })}
    </div>
    <section className="invite-section">
      <div className="table-head"><span>Convites</span><span>Função</span><span>Validade</span><span>Status</span></div>
      {data.invitations.map((invite) => {
        const badge = INVITE_BADGE[invite.status];
        return <div className="invite-row" key={invite.id}>
          <span><strong>{invite.email}</strong><small>{invite.kind === "owner" ? "Proprietário da empresa (criado pela Central Admin)" : "Membro da equipe"} · {invite.createdAt}</small></span>
          <span>{invite.role}</span>
          <span>{invite.status === "pending" ? invite.expiresAt : "—"}</span>
          <span className={`status-pill ${badge.className}`}><span className="status-dot" />{badge.label}</span>
          <div className="row-actions">
            {invite.status === "pending" && <button className="table-action table-action-success" type="button" title="Na versão real, o aceite acontece quando a pessoa entra com o Google. Aqui você simula." onClick={() => data.acceptInvite(invite.id)}>Simular aceite</button>}
            {invite.status !== "accepted" && <button className="table-action" type="button" onClick={() => data.resendInvite(invite.id)}>Reenviar</button>}
            {invite.status === "pending" && <button className="table-action table-action-danger" type="button" onClick={() => { if (window.confirm(`Revogar o convite de ${invite.email}?`)) data.revokeInvite(invite.id); }}>Revogar</button>}
          </div>
        </div>;
      })}
      {!data.invitations.length && <EmptyState message="Nenhum convite enviado ainda." />}
    </section>
    <section className="invite-section">
      <button className="secondary-button" type="button" onClick={() => setMatrixOpen((value) => !value)} aria-expanded={matrixOpen}>{matrixOpen ? "Esconder" : "Ver"} o que cada função pode fazer</button>
      {matrixOpen && <div className="access-matrix" role="table" aria-label="Permissões por função">
        <div className="access-matrix-row access-matrix-head" role="row"><span>Função</span>{PERMISSION_AREAS.map((area) => <span key={area.id}>{area.label}</span>)}</div>
        {Object.entries(ROLE_PRESETS).map(([role, preset]) => <div className="access-matrix-row" role="row" key={role}><span><strong>{role}</strong><small>{preset.summary}</small></span>{PERMISSION_AREAS.map((area) => <AccessDots key={area.id} level={preset.access[area.id]} />)}</div>)}
      </div>}
    </section>
    {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} />}
    {memberId && <MemberDialog memberId={memberId} onClose={() => setMemberId(undefined)} />}
  </section>;
}

function RoleDescription({ role }: { role: string }) {
  const preset = ROLE_PRESETS[role];
  if (!preset) return null;
  return <div className="role-description"><p>{preset.description}</p><ul className="role-access-list">{PERMISSION_AREAS.map((area) => <li key={area.id}><span>{area.label}</span><AccessDots level={preset.access[area.id]} /></li>)}</ul></div>;
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const data = useDemoData();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Profissional");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const normalized = email.trim().toLowerCase();

  function send() {
    if (!isValidEmail(normalized)) return setError("Informe um e-mail válido.");
    if (data.team.some((member) => member.email.toLowerCase() === normalized)) return setError("Esta pessoa já faz parte da equipe.");
    if (data.invitations.some((invite) => invite.status === "pending" && invite.email.toLowerCase() === normalized)) return setError("Já existe um convite pendente para este e-mail. Use Reenviar na lista.");
    data.invite(normalized, role, "team");
    setSent(true);
  }

  if (sent) return <Modal eyebrow="Convite criado" title={normalized} onClose={onClose} footer={<button className="primary-button" type="button" onClick={onClose}>Concluir</button>}>
    <p className="agenda-period-hint">Convite como <strong>{role}</strong> válido por 7 dias. Na versão publicada, a pessoa recebe o e-mail e entra com o Google desta conta; só assim o acesso é liberado, já com as permissões da função.</p>
  </Modal>;

  return <Modal eyebrow="Convidar para a equipe" title="Quem vai usar o sistema?" onClose={onClose} footer={<><button className="secondary-button" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" type="button" onClick={send}>Enviar convite</button></>}>
    <TextField label="Gmail da pessoa" type="email" value={email} onChange={(value) => { setEmail(value); setError(""); }} inputMode="email" placeholder="nome@gmail.com" required />
    {normalized && isValidEmail(normalized) && !isGoogleAccount(normalized) && <p className="agenda-period-hint">O acesso é por login do Google. Esse e-mail precisa ser uma conta Google (por exemplo, Google Workspace) para a pessoa conseguir entrar.</p>}
    <SelectField label="Função" value={role} onChange={setRole} options={INVITABLE_ROLES.map((item) => ({ value: item, label: `${item} — ${accessSummary(item)}` }))} />
    <RoleDescription role={role} />
    {error && <p className="agenda-edit-error" role="alert">{error}</p>}
  </Modal>;
}

function MemberDialog({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const data = useDemoData();
  const member = data.team.find((item) => item.id === memberId);
  const [role, setRole] = useState(member?.role ?? "Profissional");
  if (!member) return null;
  const owner = member.role === "Proprietário";
  const active = member.active !== false;
  const changed = role !== member.role;

  function save() {
    if (!member) return;
    data.updateTeamMember(member.id, { role, access: accessSummary(role) });
    onClose();
  }

  return <Modal eyebrow={owner ? "Proprietário da empresa" : "Função e acesso"} title={member.name} onClose={onClose} footer={<>
    <button className="secondary-button" type="button" onClick={onClose}>{owner ? "Fechar" : "Cancelar"}</button>
    {!owner && <button className="primary-button" type="button" onClick={save} disabled={!changed}>Salvar função</button>}
  </>}>
    <dl className="order-detail-grid"><div><dt>E-mail (login Google)</dt><dd>{member.email}</dd></div><div><dt>Situação</dt><dd>{active ? "Ativo" : "Inativo — sem acesso"}</dd></div></dl>
    {owner ? <p className="agenda-period-hint">O proprietário é o dono do sistema e não pode ser alterado, desativado nem removido por aqui. A troca de proprietário é feita pela Central Admin.</p> : <SelectField label="Função" value={role} onChange={setRole} options={INVITABLE_ROLES.map((item) => ({ value: item, label: `${item} — ${accessSummary(item)}` }))} />}
    <RoleDescription role={owner ? "Proprietário" : role} />
  </Modal>;
}
