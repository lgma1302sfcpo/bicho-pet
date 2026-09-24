# Integração fiscal direta com a Secretaria da Fazenda de São Paulo

## Estado da implementação

O ERP possui um adaptador direto, sem provedor fiscal mensal, para NF-e modelo 55 e NFC-e modelo 65. A produção fica bloqueada por padrão e exige uma liberação explícita na tela fiscal.

Implementado no código:

- geração da chave de acesso de 44 posições e dígito verificador;
- XML NF-e/NFC-e versão 4.00;
- validação local do XML pelo esquema oficial `PL_010e_v1.02`;
- assinatura XML RSA-SHA1 com certificado A1;
- conexão HTTPS com autenticação mútua pelo certificado A1;
- serviços de homologação e produção da Secretaria da Fazenda de São Paulo;
- autorização síncrona e consulta de recibo quando a resposta for assíncrona;
- interpretação de códigos e motivos de rejeição;
- consulta por chave de acesso;
- cancelamento por evento, com armazenamento do XML e protocolo próprios;
- inutilização de faixa, com bloqueio de números já usados e histórico próprio;
- NFC-e em contingência offline, fila pendente e retransmissão posterior do mesmo XML assinado;
- QR Code versão 3, normal e offline;
- documento auxiliar em PDF, envio por e-mail e backup;
- proteção contra emissão duplicada e trilha de auditoria;
- verificação de validade do certificado e criptografia das credenciais armazenadas;
- monitor de esquemas e Notas Técnicas oficiais pelo comando `npm run fiscal:check-updates`.

## Dados reais já registrados

- Cadastro Nacional da Pessoa Jurídica: `55.742.132/0001-80`;
- Inscrição Estadual: `558.897.276.110`;
- Razão social: `Marcelo Vazquez de Oliveira Pet Shop`;
- nome fantasia: `Bicho Pet`;
- regime tributário: Simples Nacional;
- estado: São Paulo;
- ambiente: homologação;
- forma de transmissão: direta;
- produção: bloqueada;
- conferência do contador: pendente.

Nenhum endereço, código de município, certificado, senha, Classificação Nacional de Atividades Econômicas ou dado tributário de produto foi inventado.

## Informações ainda obrigatórias

Antes do primeiro teste na Secretaria da Fazenda, obter do cliente e do contador:

1. logradouro, número, complemento, bairro, município, código do município e Código de Endereçamento Postal do estabelecimento;
2. certificado A1 em arquivo `.pfx` ou `.p12` e sua senha, entregues por canal seguro;
3. confirmação de credenciamento para NF-e e NFC-e em São Paulo;
4. série e próxima numeração que devem continuar depois do Nex;
5. matriz tributária de cada produto: Nomenclatura Comum do Mercosul, Código Especificador da Substituição Tributária quando aplicável, origem, Código Fiscal de Operações e Prestações, Código de Situação da Operação no Simples Nacional, PIS e COFINS;
6. validação formal do contador para os códigos e para a continuidade de numeração;
7. endereço fiscal completo dos clientes quando houver NF-e modelo 55;
8. município do estabelecimento e Inscrição Municipal para iniciar uma integração de NFS-e.

O emitente informado é optante do Simples Nacional. A Nota Técnica 2025.002 v1.51 informa que as orientações específicas de IBS/CBS para Código de Regime Tributário 1 serão publicadas futuramente, pois a tributação desses contribuintes começa em 2027. Os campos já existem no cadastro do produto, mas não recebem valores automáticos ou inventados.

## Operação segura

1. preencher os dados faltantes;
2. anexar e validar o certificado A1;
3. manter ambiente de homologação e produção bloqueada;
4. executar `npm run fiscal:check-updates`;
5. conferir produtos com o contador e marcar cada cadastro fiscal como aprovado;
6. emitir NF-e e NFC-e de teste e conferir XML, Documento Auxiliar e impressão;
7. testar consulta, rejeição, cancelamento, inutilização e contingência;
8. conferir série e próxima numeração com o contador;
9. fazer backup externo dos XMLs;
10. somente então selecionar produção e liberar a transmissão direta.

O comando de monitoramento deve ser agendado diariamente no servidor de produção. Ele retorna código `2` quando encontra uma possível atualização e código `1` quando não consegue consultar o portal; nos dois casos a emissão deve ser revisada antes de continuar.

## Fontes oficiais acompanhadas

- [Esquemas XML da NF-e](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=)
- [Notas Técnicas vigentes](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=)
- [Serviços NF-e de São Paulo](https://portal.fazenda.sp.gov.br/servicos/nfe/Paginas/URL-WEBSERVICES.aspx)
- [Serviços NFC-e de São Paulo](https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/WebServices.aspx)
- [Contingência NFC-e em São Paulo](https://portal.fazenda.sp.gov.br/servicos/nfce/Paginas/Conting%C3%AAncia.aspx)
