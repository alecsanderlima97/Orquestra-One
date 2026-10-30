# Orquestra One

Base inicial do SaaS de gestão para autônomos e pequenas equipes da Orquestra.cs.

## Estado atual

Esta primeira versão é uma fundação visual e de domínio para validação local:

- dashboard operacional responsivo;
- login visual de demonstração;
- agenda de serviços;
- ordens de serviço;
- financeiro com valores formatados em BRL;
- estoque e ferramentas;
- clientes;
- fornecedores, relatórios e equipe;
- ações rápidas;
- manifest PWA;
- tipos de domínio e dados de demonstração separados da interface.

Os dados ainda são mockados. Firebase, autenticação, Firestore, autorização server-side, Storage e integração com o Portal Orquestra.cs não foram simulados como se estivessem ativos.

## Executar localmente

```bash
npm install
npm run dev
```

Verificações:

```bash
npm run typecheck
npm run build
```

## Próxima fase técnica

1. Confirmar contrato entre Portal Orquestra.cs e One.
2. Integrar autenticação e resolução de tenant no servidor.
3. Implementar memberships, permissões e testes de isolamento.
4. Substituir mocks por casos de uso Firestore idempotentes.
5. Implementar agenda, OS, financeiro e estoque com auditoria.

Não adicionar credenciais reais ao repositório. Deploy, domínio, cobrança e integração comercial dependem de configuração e validação separadas.
