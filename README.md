# Loja do Ouro — Performance Dashboard

Dashboard executivo para centralizar vendas Shopify, atribuição de encomendas e investimento/performance de Meta Ads e Google Ads.

## Dashboard v2

A versão v2 reorganiza a informação por decisão de gestão, em vez de apresentar uma lista extensa de métricas:

- **Visão executiva:** receita paga, encomendas, ticket médio, investimento total em Ads e ROAS blended.
- **Investimento em Ads:** Meta Ads e Google Ads separados, com total combinado e comparação com o período anterior.
- **Origem das encomendas:** Newsletter, Google, Facebook, Instagram e Outros/Direto.
- **Fugas de receita:** encomendas não pagas, valor por receber, checkouts abandonados e valor potencial não convertido.
- **Tendência diária:** receita vs. investimento em publicidade.
- **Detalhe de media:** Meta por campanha; Google agrupado em Brand, Non-Brand, Performance Max e campanhas locais.

## Metodologia de atribuição

O Shopify é a fonte de verdade para encomendas e receita. Cada encomenda paga recebe **uma única origem**, com base no último clique/visita registado no Customer Journey do Shopify, UTMs, source e referrer. Isso evita contar a mesma encomenda simultaneamente em Meta, Google e Newsletter.

As conversões mostradas no detalhe das campanhas são as conversões atribuídas pelas próprias plataformas e servem para otimização de media, não para construir o total de encomendas.

## Carrinhos / checkouts abandonados

O dashboard usa os `abandonedCheckouts` do Shopify. O respetivo montante é apresentado como **valor potencial não convertido**, e não como perda contabilística. O Shopify só cria este registo depois de o visitante avançar suficientemente no checkout.

## Fontes de dados

- Shopify Admin GraphQL API — encomendas, pagamentos, Customer Journey/UTM e abandoned checkouts.
- Windsor.ai — Meta Ads e Google Ads.

## Variáveis de ambiente

Consultar `.env.example`. Nunca guardar tokens ou chaves no repositório.
