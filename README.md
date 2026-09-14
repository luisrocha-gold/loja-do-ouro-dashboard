# Loja do Ouro — Business Control Center

Dashboard privado de gestão da Loja do Ouro, construído em Next.js e alojado na Vercel.

## Objetivo

Centralizar vendas, operação, marketing e qualidade de dados num único painel executivo, preservando o detalhe necessário para gestão avançada.

## Fontes

- Shopify via Windsor.ai — fonte de verdade para encomendas e receita paga
- Meta Ads via Windsor.ai
- Google Ads via Windsor.ai
- Google Analytics 4 via Windsor.ai
- Klaviyo via Windsor.ai
- Search Console via Windsor.ai
- Google Merchant Center via Windsor.ai

## Interface

- Identidade visual oficial da Loja do Ouro
- Layout desktop premium com tipografia e hierarquia pensadas para utilização diária
- Layout específico para tablet e mobile
- KPIs executivos, pulse diário/semanal/mensal e filtros por período
- CRM, funil, geografia, rentabilidade, campanhas, operação e Decision Center
- Tabelas completas com scroll horizontal em ecrãs pequenos, sem remover detalhe

## Segurança

- Login por sessão assinada
- `DASHBOARD_USER`
- `DASHBOARD_PASSWORD`
- `DASHBOARD_SESSION_SECRET`
- `CRON_SECRET`
- `WINDSOR_API_KEY`

Nunca colocar segredos no repositório.

## Atualização noturna

A rota protegida `/api/cron/refresh` é executada diariamente pela Vercel durante a madrugada para validar e pré-aquecer as principais janelas de análise.

## Metodologia

Shopify permanece a fonte de verdade comercial. GA4, Klaviyo, Meta e Google utilizam metodologias de medição e atribuição próprias; por isso os respetivos valores são comparados e auditados, mas não são somados à receita Shopify.
