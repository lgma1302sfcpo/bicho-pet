# Auditoria e orçamento — ERP Comercial / ReservaPet

Data da auditoria: 24/08/2026.

## Resultado técnico

- Build de produção: aprovado.
- ESLint: aprovado sem avisos.
- TypeScript: aprovado.
- Testes automatizados: 27 de 27 aprovados.
- Fluxo integrado no PostgreSQL: cadastro, edição, filtros, venda, histórico e exclusão aprovados.
- O teste integrado pode ser repetido com `node scripts/e2e-api-smoke.mjs` enquanto a aplicação estiver em `localhost:3000`.

## O que foi entregue nesta auditoria

- CRUD de clientes: cadastro, edição e exclusão por empresa.
- CRUD de produtos: cadastro, edição e exclusão por empresa.
- Correção do filtro booleano de clientes encontrado no teste integrado.
- Envio individual de e-mail por cliente usando a API Resend, com confirmação, escape de HTML e idempotência.
- Bloqueio seguro e mensagem clara enquanto `RESEND_API_KEY` e `EMAIL_FROM` não estiverem configurados.
- Relatório de vendas com busca, período, faturamento, ticket médio e exportação Excel.
- Recibo de venda em PDF, identificado corretamente como documento não fiscal.
- Preservação das vendas antigas quando um cliente é excluído.

## Limites atuais importantes

O produto pode ser vendido como MVP/piloto comercial, mas ainda não deve ser anunciado como ERP completo.

- Estoque, PDV e financeiro continuam desativados no menu.
- Os itens da venda ainda são digitados livremente e não baixam automaticamente o estoque de produtos.
- Não existe emissão legal de NFC-e/NF-e. O PDF atual é somente recibo não fiscal.
- O e-mail está implementado, mas precisa de domínio verificado e chave Resend para um teste real.
- Faltam política de backup/recuperação, monitoramento, termos de uso, política de privacidade/LGPD e rotina de suporte para produção.
- A lista de relatórios usa as 50 vendas mais recentes; paginação e relatórios contábeis/fiscais ficam para a próxima fase.

## Custos externos mensais estimados

Conversão de referência: PTAX de venda de R$ 5,1625 por US$ em 21/08/2026.

### Piloto seguro, sem nota fiscal integrada

| Item | Estimativa |
|---|---:|
| Vercel Pro | US$ 20 ≈ R$ 103,25/mês |
| Neon Free para início | R$ 0/mês |
| Resend Free, até 3.000 e-mails/mês e 100/dia | R$ 0/mês |
| Domínio | aproximadamente R$ 40–70/ano |
| DNS, SSL e CDN Cloudflare Free | R$ 0/mês |
| Reserva para backup/monitoramento | R$ 20–40/mês |
| **Total recorrente inicial** | **aproximadamente R$ 127–149/mês** |

O Neon Free oferece 0,5 GB e janela de restauração de 6 horas. Quando o uso crescer, o plano Launch indica gasto típico de US$ 15/mês (aproximadamente R$ 77,44), levando a infraestrutura para cerca de R$ 205–227/mês.

### Adicional para NFC-e/NF-e legal

Para pet shop físico, a opção de referência é o plano Focus NFe Retail: R$ 59,90/mês, incluindo 500 NFC-e e 100 NF-e; excedentes de R$ 0,05 por NFC-e e R$ 0,15 por NF-e. Também é necessário certificado digital A1 e configuração fiscal feita junto ao contador.

Reserve ainda:

- certificado A1: cotar com certificadora (normalmente cobrança anual);
- implantação fiscal e homologação: serviço separado;
- eventuais custos do contador e adequação tributária;
- taxas de pagamento, se cobrança recorrente/cartão for automatizada.

## Preço sugerido ao primeiro cliente

### Opção recomendada de entrada

- Implantação: **R$ 900 a R$ 1.500**, podendo dividir em 2 vezes.
- Mensalidade: **R$ 249/mês nos primeiros 3 meses**, como preço fundador/piloto.
- Depois da estabilização: **R$ 299/mês**.
- Inclui hospedagem, domínio, backup básico, atualizações corretivas e até 2 horas de suporte por mês.
- Não inclui nota fiscal legal, novas funções grandes, computador/impressora/leitor, certificado ou taxas de pagamento.

Essa mensalidade só é sustentável usando Neon Free no início. Ao migrar para banco pago, reajuste para pelo menos **R$ 349/mês**.

### Com emissão fiscal integrada

- Implantação/desenvolvimento fiscal adicional: **R$ 1.500 a R$ 3.000** após levantar regime tributário, CSC, série, certificado A1, NCM/CFOP/CST/CSOSN e regras com o contador.
- Mensalidade sugerida: **R$ 399 a R$ 449/mês**, já considerando o gateway fiscal básico e mais responsabilidade de suporte.

## Condições comerciais para proteger o desenvolvedor iniciante

- Definir por escrito o que está incluído e chamar a primeira versão de piloto.
- Cobrar implantação; não entregar desenvolvimento ilimitado dentro da mensalidade.
- Limitar suporte mensal e cobrar melhorias por orçamento.
- Manter infraestrutura e domínio preferencialmente em contas do cliente, com você como administrador técnico.
- Fazer backup e testar restauração antes de colocar vendas reais.
- Incluir reajuste anual e regra de reajuste quando custos de infraestrutura aumentarem.
- Não prometer NFC-e/NF-e antes da homologação com contador e SEFAZ/provedor.

## Fontes de preços consultadas

- Vercel: https://vercel.com/pricing
- Neon: https://neon.com/pricing
- Resend: https://resend.com/pricing
- Resend API: https://resend.com/docs/api-reference/emails/send-email
- Focus NFe: https://2025.focusnfe.com.br/precos/
- Cloudflare: https://www.cloudflare.com/plans/
- PTAX Banco Central: https://ptax.bcb.gov.br/ptax_internet/consultarUltimaCotacaoDolar.do
