# Loja do Ouro · Administração

Dashboard privado Next.js para consultar os fechos do negócio. A entrada destaca ontem, a semana civil anterior e o mês civil anterior em Europe/Lisbon. O calendário permite consultar outras datas completas.

## Desenvolvimento

```sh
npm ci
npm test
npm run build
npm run dev
```

Copiar `.env.example` para um ficheiro de ambiente local e preencher apenas as credenciais autorizadas. Nunca incluir credenciais ou dados comerciais no Git.

## Dados

O servidor lê exclusivamente tabelas `public.ldo_bi_*` do projeto indicado em `.env.example`. Não altera dados. Não abre acesso anónimo nem modifica RLS. O login privado existente continua a proteger a aplicação.

São necessários `BI_SUPABASE_URL`, `BI_SUPABASE_PUBLISHABLE_KEY` e uma credencial válida em `BI_SUPABASE_ACCESS_TOKEN` pertencente a um membro BI. Tokens de sessão exigem renovação. Uma chave de servidor existente em `SUPABASE_SERVICE_ROLE_KEY` é também suportada; deve permanecer num segredo do ambiente Vercel, nunca no cliente ou no repositório.

A recolha e os relatórios são responsabilidade do fluxo BI autorizado. Abrir o dashboard não atualiza as fontes. `/api/cron/refresh`, protegido por `CRON_SECRET`, verifica cobertura e devolve `sources_refreshed: false`.

Dados em falta não são zero. Utilizadores distintos e ticket médio exigem consulta oficial de todo o período. A concordância de totais não certifica tracking. Custos incompletos não permitem calcular lucro.

Ver [auditoria e gate de publicação](docs/dashboard-audit.md). Esta versão deve ser revista com a ligação privada ativa antes da promoção para produção.
