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

O servidor lê as tabelas `public.ldo_bi_*` quando a ligação privada está configurada. Na sua ausência, mantém a leitura direta através da chave Windsor já existente em produção. Não altera dados, acesso anónimo ou RLS. O login privado existente continua a proteger a aplicação.

São necessários `BI_SUPABASE_URL`, `BI_SUPABASE_PUBLISHABLE_KEY` e uma credencial válida em `BI_SUPABASE_ACCESS_TOKEN` pertencente a um membro BI. Tokens de sessão exigem renovação. Uma chave de servidor existente em `SUPABASE_SERVICE_ROLE_KEY` é também suportada; deve permanecer num segredo do ambiente Vercel, nunca no cliente ou no repositório.

A recolha guardada e os relatórios são responsabilidade do fluxo BI autorizado. O modo direto consulta os conectores, que podem servir cache upstream, e distingue os valores observados dos fechos oficiais. `/api/cron/refresh`, protegido por `CRON_SECRET`, verifica cobertura guardada e devolve `sources_refreshed: false`.

Dados em falta não são zero. Utilizadores distintos e ticket médio exigem consulta oficial de todo o período. A concordância de totais não certifica tracking. Custos incompletos não permitem calcular lucro.

No modo direto, Shopify representa uma coorte recolhida pela data de criação portuguesa, com estado observado na consulta e cobertura não certificada. Linhas de reversão são excluídas por `order_count`; conflitos e moedas incompatíveis suspendem os agregados. Não se substituem `total_sales`, `average_order_value` ou MER por valores desta coorte. GA4 consulta utilizadores no período inteiro. Campanhas, ações, públicos, CRM e pesquisa são conjuntos distintos, com limitações explícitas.

O build de produção verifica login e acesso às quatro fontes principais, sem registar credenciais ou dados comerciais. Uma falha bloqueia a publicação e preserva a versão existente. Ver [auditoria](docs/dashboard-audit.md).
