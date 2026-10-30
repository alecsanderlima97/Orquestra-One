# Entrada segura e multiempresa

O One não deve criar uma segunda base de empresas, planos, cobrança ou `accessStatus`. O Portal Orquestra.cs é a fonte de verdade comercial.

## Fluxo de convite

1. A Central Admin cria o convite do proprietário, vinculado ao tenant do Portal e com expiração.
2. O proprietário entra pelo Google e o servidor valida o token Firebase.
3. O servidor consulta `users/{uid}`, `companies/{tenantId}` e `invitations` no mesmo projeto Firebase do Portal. Nenhum tenant ou papel é aceito diretamente do navegador.
4. A sessão é criada em cookie `HttpOnly`, `Secure` e `SameSite=Lax`.
5. Um proprietário ou administrador autorizado cria convites de equipe. O servidor limita o convite ao tenant do criador e à allowlist de permissões.

## Dados operacionais do One

Cada registro precisa ter `tenantId`, `createdBy`, `updatedAt` e evento de auditoria. Ordens, diário, movimentações de estoque e financeiro precisam também de `correlationId`/`originId` para manter fechamento idempotente.

## Bloqueios obrigatórios

- `platform_owner` e `orquestra_admin`: somente Central Admin.
- `company_owner` e `company_admin`: apenas o próprio tenant.
- `company_user` e `viewer`: permissões granulares definidas no servidor.
- Tenant bloqueado no Portal não acessa o One, mas seus dados não são excluídos.

## O que falta configurar fora do código

Preencher as variáveis públicas e do Admin SDK na Vercel, habilitar Google como provedor no Firebase Authentication e garantir que os usuários da Central Admin possuam perfil ativo com papel `platform_owner` ou `orquestra_admin` em `users/{uid}`. A API do One já rejeita convites sem empresa, convites expirados, empresas bloqueadas e funções fora da allowlist.
