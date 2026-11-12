import type { SectionId } from "@/src/domain/types";

/** Textos do assistente: um passo do tour e dicas por tela. */
export const SECTION_GUIDE: Record<SectionId, { title: string; tour: string; tips: string[] }> = {
  overview: {
    title: "Visão geral",
    tour: "Seu painel do dia: agenda de hoje, ordens em andamento e o que tem para receber e pagar.",
    tips: ["Use \"Novo registro\" para criar O.S., agendamento, cliente ou lançamento de qualquer tela.", "O sino no topo avisa o que precisa de atenção: agendamentos próximos, contas vencidas e estoque baixo."],
  },
  agenda: {
    title: "Agenda",
    tour: "Seus agendamentos por dia, semana (7 dias) ou mês. Toque num horário vazio para agendar.",
    tips: ["Arraste o agendamento para mudar o horário.", "Na visão Semana, puxe a seta embaixo do cartão para mudar a duração.", "Toque duas vezes no agendamento para abrir a ordem de serviço ou o cliente.", "No campo Observações, use o microfone para ditar em vez de digitar."],
  },
  quotes: {
    title: "Orçamentos",
    tour: "Monte orçamentos, envie pelo WhatsApp e, quando o cliente aprovar, transforme em ordem de serviço com um toque.",
    tips: ["O orçamento aprovado vira O.S. com os itens já preenchidos.", "Orçamento aprovado não pode mais ser alterado, para manter o histórico."],
  },
  orders: {
    title: "Ordens de serviço",
    tour: "Cada serviço do começo ao fim: diário do que foi feito, materiais, fotos, assinatura do cliente e PDF.",
    tips: ["Em Detalhes: adicione fotos do antes e depois e colha a assinatura do cliente na tela.", "\"PDF da O.S.\" gera o documento para enviar ou imprimir.", "Registre no diário o que foi feito; dá para ditar pelo microfone.", "A baixa dos materiais no estoque acontece só quando você fecha a ordem."],
  },
  finance: {
    title: "Financeiro",
    tour: "Contas a receber e a pagar, ligadas aos serviços. Veja o que vence hoje e o que está atrasado.",
    tips: ["Marque como recebido ou pago assim que o dinheiro entrar ou sair.", "Lançamentos criados a partir de uma O.S. ficam ligados a ela."],
  },
  stock: {
    title: "Estoque e ferramentas",
    tour: "Materiais e ferramentas com quantidade mínima. O sistema avisa quando algo está acabando.",
    tips: ["Vincule materiais na O.S.; a baixa acontece no fechamento.", "Ferramentas ficam separadas dos materiais de consumo."],
  },
  clients: {
    title: "Clientes",
    tour: "Ficha completa de cada cliente com histórico de serviços e atalho para o WhatsApp.",
    tips: ["Digite o CEP ou o CNPJ para preencher o endereço e os dados automaticamente."],
  },
  suppliers: {
    title: "Fornecedores",
    tour: "Seus fornecedores e parceiros, com categoria e contato para comprar mais rápido.",
    tips: ["O CNPJ preenche razão social e endereço automaticamente."],
  },
  reports: {
    title: "Relatórios",
    tour: "Resumo do negócio com dados da agenda, das ordens, do financeiro e do estoque.",
    tips: ["Use os relatórios para ver quanto entrou, quanto saiu e quais serviços mais aparecem."],
  },
  team: {
    title: "Equipe",
    tour: "Convide sua equipe pelo Gmail e escolha o que cada pessoa pode ver e alterar.",
    tips: ["Cada função tem um acesso diferente; veja a tabela de permissões antes de convidar.", "Ao remover alguém, o acesso é cortado na hora. O que a pessoa registrou continua no sistema."],
  },
  settings: {
    title: "Configurações",
    tour: "Preferências da sua operação.",
    tips: ["Ajuste aqui como sua equipe enxerga e recebe avisos."],
  },
};

export const TOUR_ORDER: SectionId[] = ["overview", "agenda", "quotes", "orders", "finance", "stock", "clients", "suppliers", "reports", "team"];
