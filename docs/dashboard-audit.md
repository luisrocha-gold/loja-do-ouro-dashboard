# Auditoria e redesign do dashboard — 15/09/2026

## Resultado

Revisão de 17/09/2026 para publicação autorizada pelo utilizador. A versão de 15/09 foi revertida porque o ambiente de produção não tinha credenciais BI. Esta revisão preserva a leitura Windsor existente como alternativa explícita aos fechos. O build verifica as fontes em produção antes de promover o código. A inspeção visual autenticada continua por concluir.

## Problemas encontrados na versão anterior

- O dashboard publicado lia Windsor diretamente, separado dos runs, relatórios e controlos guardados em Supabase. A hora de abertura era apresentada como atualização.
- O ticket médio era calculado como receita paga / encomendas pagas, divergindo de `average_order_value` oficial Shopify.
- Vendas, coorte de encomendas pagas e pagamentos ocorridos no período eram conceitos misturados.
- Valores ausentes e erros de consulta podiam tornar-se zero; custos ausentes podiam produzir margem aparente.
- “Últimos 7 dias” não era a semana civil anterior. Datas eram calculadas em UTC.
- Comparações mensais podiam usar uma janela móvel de igual duração em vez do mês civil anterior.
- Utilizadores distintos GA4 eram somados em partes do código.
- Google usava `conversion_value` em vez do campo verificado `conversions_value`; conversions podia ser interpretada como compras.
- Saldos de pagamento parcial podiam ser inflacionados para o valor integral da encomenda.
- O gráfico dependia de um ajuste posterior no browser para tentar corrigir duas escalas diferentes.
- Regras heurísticas de atribuição por texto, pontuações regionais e concordância percentual entre populações distintas eram apresentadas como validação ou fundamento para aumentar investimento.

## Alterações

- Três janelas principais: ontem em Europe/Lisbon, segunda–domingo anterior e mês civil anterior. Calendário histórico com validação de datas.
- Resumo executivo; vendas e operação; marketing e canais; públicos e regiões; relatórios e qualidade.
- Indicadores oficiais provenientes dos fechos `ldo_bi_daily` e `ldo_bi_datasets`. Sem ligação BI, o modo direto apresenta a coorte Shopify observada e os indicadores Meta/Google/GA4, sem inventar vendas oficiais, ticket médio ou MER.
- `null` quando há lacunas, campos inválidos, duplicados no grão ou denominadores indisponíveis. Nunca somar médias ou utilizadores distintos.
- Totais exatos do período prevalecem quando mais recentes; revisões diárias posteriores prevalecem nas métricas aditivas. Momento e fonte acessíveis por indicador.
- Coorte de encomendas com paginação completa exigida para totais operacionais; referências repetidas detetadas. Movimentos financeiros exigem `processed_at` e EUR.
- Escala única em euros para vendas e investimento. MER explicitamente distinto de lucro e de ROAS atribuído.
- Controlos calculados de composição Shopify e investimento detalhe versus total (tolerância €0,02), e reconciliação GA4 por identificadores exatos e múltiplos eventos por ID.
- Histórico de relatórios e alertas preservado. Nenhuma escrita de dados, campanha, encomenda, tracking, permissões ou emails foi introduzida.
- Autenticação existente mantida. Sem credenciais de dados no código, Git ou navegador; leitura limitada aos nomes de tabelas BI permitidos.
- A rota cron passa a ser um monitor explícito de cobertura. Não simula atualização upstream; a recolha continua a pertencer ao processo BI autorizado.

## Cobertura verificada na base

- Dados diários de vendas Shopify, sessões Shopify, Meta, Google e GA4 de 01/08 a 14/09/2026.
- Preparação Shopify apenas de 10/08 a 14/09: agosto deve aparecer incompleto para estas métricas.
- Ticket médio oficial consultado para agosto e semanas fechadas; totais de utilizadores GA4 consultados no período inteiro.
- Não há julho para comparar agosto. Não apresentar variações inventadas.
- Detalhes de encomendas, anúncios, públicos e produtos não cobrem todos os períodos históricos. Produtos limitados a 50; utilizadores por segmento não são aditivos.
- Não há relatórios Klaviyo/SEO/Merchant/Stories reconciliados nos fechos. O modo direto mostra atribuição Klaviyo separada de pagamentos, pesquisa orgânica e estado observado Merchant; continua a declarar ausência de Stories e reconciliação financeira de newsletters.

## Verificação

- Compilação Next.js e TypeScript concluída.
- Testes de datas portuguesas, mudanças de hora, semanas civis, mês bissexto, datas inválidas, lacunas, duplicação, não aditividade, precedência de revisões, moeda, saldo parcial e reconciliação por ID.
- Integração HTTP de 15 combinações período/secção com uma cópia local dos dados guardados, nunca incluída no repositório.
- Revisão de 17/09: 17 testes passaram; 15 combinações período/secção do modo direto verificadas por HTTP com respostas controladas e uma amostra Shopify recolhida. Login, redirecionamento anónimo, proteção cron, datas inválidas e ausência de segredos no HTML verificados. Estas respostas de teste não são publicadas.
- A política do browser bloqueou a pré-visualização local. Não foi concluída a inspeção visual nem a navegação autenticada na versão publicada.

## Publicação de 17/09 e trabalho pendente

1. Publicar o layout com a leitura direta existente e login preservado, conforme autorização do utilizador. A verificação do build bloqueia uma publicação sem fontes disponíveis.
2. Configurar posteriormente a ligação BI privada conforme `.env.example` para disponibilizar relatórios oficiais Shopify e versões dos fechos. Preferir credencial de membro BI sujeita a RLS e renovação segura.
3. Confirmar a experiência desktop, tablet e telemóvel com uma sessão autenticada. Testes HTTP e compilação não substituem inspeção visual.
4. Completar CRM/SEO/Merchant com relatórios fechados e reconciliados antes de considerar integral a cobertura. O histórico Git permite reverter código; esta publicação não altera dados guardados.
