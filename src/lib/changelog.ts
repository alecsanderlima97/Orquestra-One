/**
 * Novidades mostradas pelo assistente quando o sistema é atualizado.
 * Para anunciar uma atualização: adicione uma entrada NO TOPO com versão nova.
 */
export type ChangelogEntry = { version: string; date: string; title: string; items: string[] };

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2026.11.12",
    date: "12/11/2026",
    title: "Assistente e ordem de serviço completa",
    items: [
      "Assistente: botão Ajuda no canto da tela, com tour pelas abas, dicas de cada tela e as novidades.",
      "Ordem de serviço em PDF, com fotos e assinatura do cliente.",
      "Fotos e PDFs anexados na O.S. (antes e depois do serviço).",
      "Assinatura do cliente na tela, com o dedo ou o mouse.",
      "Aviso no sino dos agendamentos que começam nos próximos 30 minutos.",
      "Funciona sem internet: o que você registrar é enviado quando a conexão voltar.",
      "Botão Sair no menu.",
    ],
  },
];

export const CURRENT_VERSION = CHANGELOG[0].version;

/** Entradas mais novas que a última versão vista (todas, se nunca viu). */
export function unseenEntries(lastSeen: string | null) {
  if (!lastSeen) return CHANGELOG.slice(0, 1);
  return CHANGELOG.filter((entry) => entry.version > lastSeen);
}
