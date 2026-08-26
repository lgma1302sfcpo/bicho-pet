import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.ERP_BASE_URL ?? "http://127.0.0.1:3000";
const email = "qa.erp@example.invalid";
const password = "TesteSeguro123";
const cookies = new Map();
const prisma = new PrismaClient();

function rememberCookies(response, cookieJar = cookies) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);

  for (const value of values) {
    const [pair] = value.split(";");
    const separator = pair.indexOf("=");
    cookieJar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

async function request(path, init = {}, cookieJar = cookies) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
    headers: {
      ...(cookieJar.size ? { cookie: [...cookieJar].map(([key, value]) => `${key}=${value}`).join("; ") } : {}),
      ...(init.body && !(init.body instanceof URLSearchParams) ? { "content-type": "application/json" } : {}),
      ...init.headers
    }
  });
  rememberCookies(response, cookieJar);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
  }
}

async function api(path, init = {}, expectedStatus = 200, cookieJar = cookies) {
  const result = await request(path, {
    ...init,
    body: init.body && !(init.body instanceof URLSearchParams) ? JSON.stringify(init.body) : init.body
  }, cookieJar);
  assert(result.response.status === expectedStatus, `${init.method ?? "GET"} ${path} retornou ${result.response.status}`, result.body);
  return result.body.data;
}

async function loginCredentials(loginEmail, loginPassword, cookieJar = cookies) {
  const csrfResult = await request("/api/auth/csrf", {}, cookieJar);
  assert(csrfResult.response.status === 200, "Nao foi possivel obter token CSRF", csrfResult.body);
  const csrf = csrfResult.body;
  const form = new URLSearchParams({ csrfToken: csrf.csrfToken, email: loginEmail, password: loginPassword, callbackUrl: `${baseUrl}/dashboard`, json: "true" });
  const signedIn = await request("/api/auth/callback/credentials?json=true", {
    method: "POST",
    body: form,
    headers: { "content-type": "application/x-www-form-urlencoded" }
  }, cookieJar);
  assert([200, 302].includes(signedIn.response.status), "Login QA falhou", signedIn.body);
  const sessionResult = await request("/api/auth/session", {}, cookieJar);
  assert(sessionResult.response.status === 200, "Nao foi possivel consultar a sessao", sessionResult.body);
  const session = sessionResult.body;
  assert(session?.user?.currentTenantId, "Sessao autenticada nao foi criada", session);
  return session;
}

async function login() {
  const registration = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      companyName: "ERP QA Pet Shop",
      companyDocument: "99999999000199",
      ownerName: "Usuario QA",
      email,
      password,
      confirmPassword: password
    }),
    headers: { "content-type": "application/json" }
  });
  assert([201, 409].includes(registration.response.status), "Nao foi possivel preparar usuario QA", registration.body);

  return loginCredentials(email, password);
}

async function main() {
  await login();
  const stamp = Date.now().toString(36).toUpperCase();
  const customerName = `Cliente QA ${stamp}`;
  const productCode = `QA-${stamp}`;

  const customer = await api("/api/customers", {
    method: "POST",
    body: {
      name: customerName,
      email: `cliente-${stamp.toLowerCase()}@example.invalid`,
      phone: "13999990000",
      whatsapp: "13999990000",
      city: "Santos",
      state: "SP",
      creditLimit: 100,
      tags: ["qa", "vip"]
    }
  }, 201);

  const customerFilter = await api(`/api/customers?search=${encodeURIComponent(customerName)}&includeNeverPurchased=true&contactableOnly=true`);
  assert(customerFilter.customers.some((item) => item.id === customer.id), "Filtro de cliente nao encontrou o cadastro");

  const updatedCustomer = await api(`/api/customers/${customer.id}`, {
    method: "PUT",
    body: {
      name: `${customerName} Editado`,
      email: customer.email,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      city: "Sao Vicente",
      state: "SP",
      creditLimit: 150,
      tags: ["qa", "editado"],
      status: "ACTIVE"
    }
  });
  assert(updatedCustomer.city === "Sao Vicente" && updatedCustomer.creditLimit === 150, "Edicao de cliente nao persistiu", updatedCustomer);

  const emailAttempt = await request(`/api/customers/${customer.id}/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subject: "Oferta QA", message: "Mensagem de teste sem envio externo." })
  });
  assert(
    emailAttempt.response.status === 503 && emailAttempt.body?.error?.code === "EMAIL_NOT_CONFIGURED",
    "Endpoint de email nao informou configuracao ausente de forma segura",
    emailAttempt.body
  );

  const product = await api("/api/products", {
    method: "POST",
    body: {
      name: `Racao QA ${stamp}`,
      code: productCode,
      category: "Racao",
      subcategory: "Premium",
      brand: "Marca QA",
      supplier: "Fornecedor QA",
      unit: "UN",
      species: "DOG",
      costPrice: 40,
      salePrice: 60,
      stockQuantity: 2,
      minStock: 5,
      maxStock: 20
      ,fiscalItemType: "GOOD"
      ,ncm: "23091000"
      ,originCode: "0"
      ,defaultCfop: "5102"
      ,icmsCode: "102"
      ,pisCode: "49"
      ,cofinsCode: "49"
      ,fiscalApproved: true
    }
  }, 201);

  const productFilter = await api(`/api/products?search=${productCode}&category=Racao&species=DOG&lowStockOnly=true`);
  assert(productFilter.products.some((item) => item.id === product.id), "Filtros de produto/estoque baixo falharam");

  const updatedProduct = await api(`/api/products/${product.id}`, {
    method: "PUT",
    body: {
      name: `${product.name} Editada`,
      code: product.code,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      supplier: product.supplier,
      unit: product.unit,
      species: product.species,
      costPrice: 50,
      salePrice: 75,
      stockQuantity: 10,
      minStock: 5,
      maxStock: 20,
      status: "ACTIVE"
      ,fiscalItemType: "GOOD"
      ,ncm: "23091000"
      ,originCode: "0"
      ,defaultCfop: "5102"
      ,icmsCode: "102"
      ,pisCode: "49"
      ,cofinsCode: "49"
      ,fiscalApproved: true
    }
  });
  assert(updatedProduct.salePrice === 75 && updatedProduct.marginPercent === 50, "Edicao de produto nao persistiu", updatedProduct);

  const secondBranch = await api("/api/identity/branches", { method: "POST", body: { name: `Loja QA ${stamp}` } }, 201);
  const secondEmail = `loja-${stamp.toLowerCase()}@example.invalid`;
  const employeePermissions = [
    "dashboard.read",
    "products.read",
    "inventory.read",
    "inventory.write",
    "sales.read",
    "finance.read"
  ];
  const invitation = await api("/api/identity/invitations", {
    method: "POST",
    body: { email: secondEmail, branchId: secondBranch.id, permissionKeys: employeePermissions }
  }, 201);
  assert(invitation.invitationUrl, "Convite nao retornou um link de aceite", invitation);
  const invitationToken = new URL(invitation.invitationUrl).searchParams.get("token");
  assert(invitationToken, "Token do convite nao foi gerado", invitation);
  const invitationPreview = await api(`/api/auth/invitations/${invitationToken}`);
  assert(invitationPreview.email === secondEmail && invitationPreview.branchName === secondBranch.name, "Convite nao ficou vinculado ao email e a loja", invitationPreview);
  await api(`/api/auth/invitations/${invitationToken}`, {
    method: "POST",
    body: { name: `Operador Loja ${stamp}`, password, confirmPassword: password }
  });
  const secondCookies = new Map();
  const secondSession = await loginCredentials(secondEmail, password, secondCookies);
  assert(secondSession.user.currentBranchId === secondBranch.id && secondSession.user.canAccessAllBranches === false, "Login da segunda loja nao ficou restrito a filial", secondSession);
  assert(employeePermissions.every((permission) => secondSession.user.permissions.includes(permission)), "Funcionario nao recebeu as permissoes selecionadas", secondSession);
  assert(!secondSession.user.permissions.includes("finance.write") && !secondSession.user.permissions.includes("fiscal.write"), "Funcionario recebeu acesso total indevidamente", secondSession);
  const forbiddenFinanceWrite = await request("/api/finance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "EXPENSE", status: "PENDING", description: "Nao deve criar", category: "Teste", amount: 10, dueDate: new Date().toISOString().slice(0, 10), paymentMethod: "PIX" })
  }, secondCookies);
  assert(forbiddenFinanceWrite.response.status === 403, "Funcionario sem permissao conseguiu alterar o financeiro", forbiddenFinanceWrite.body);
  const secondStoreCatalog = await api(`/api/products?search=${productCode}`, {}, 200, secondCookies);
  assert(secondStoreCatalog.products[0].stockQuantity === 0, "Segunda loja herdou indevidamente o estoque da principal", secondStoreCatalog);
  const secondStockEntry = await api("/api/inventory", { method: "POST", body: { productId: product.id, type: "ENTRY", quantity: 3, reason: "Estoque inicial da segunda loja", reference: `FILIAL-${stamp}` } }, 201, secondCookies);
  assert(secondStockEntry.newBalance === 3, "Estoque da segunda loja nao foi atualizado", secondStockEntry);
  const mainStoreStillIndependent = await api(`/api/products?search=${productCode}`);
  assert(mainStoreStillIndependent.products[0].stockQuantity === 10, "Movimento da segunda loja alterou o estoque principal", mainStoreStillIndependent);

  const sale = await api("/api/sales", {
    method: "POST",
    body: {
      customerId: customer.id,
      paymentMethod: "PIX",
      discount: 5,
      surcharge: 0,
      notes: "Venda de teste automatizado",
      items: [{ productId: updatedProduct.id, description: updatedProduct.name, quantity: 2, unitPrice: 75 }]
    }
  }, 201);
  assert(sale.total === 145, "Calculo da venda esta incorreto", sale);
  const sales = await api("/api/sales");
  const recordedSale = sales.find((item) => item.id === sale.id);
  assert(recordedSale, "Venda criada nao apareceu no historico");
  assert(recordedSale.items[0].costPrice === 50, "Custo historico nao foi registrado", recordedSale);
  assert(recordedSale.items[0].supplier === "Fornecedor QA", "Fornecedor nao foi registrado na venda", recordedSale);
  const secondStoreSales = await api("/api/sales", {}, 200, secondCookies);
  assert(!secondStoreSales.some((item) => item.id === sale.id), "Relatorio da segunda loja exibiu venda da loja principal", secondStoreSales);
  const secondStoreFinance = await api("/api/finance", {}, 200, secondCookies);
  assert(!secondStoreFinance.some((entry) => entry.saleId === sale.id), "Financeiro da segunda loja exibiu receita da loja principal", secondStoreFinance);
  const secondStoreDashboard = await api("/api/dashboard", {}, 200, secondCookies);
  assert(!secondStoreDashboard.latestSales.some((item) => item.id === sale.id), "Dashboard da segunda loja exibiu venda da loja principal", secondStoreDashboard);
  const stockAfterSale = await api(`/api/products?search=${productCode}`);
  assert(stockAfterSale.products[0].stockQuantity === 8, "Estoque nao foi baixado pela venda", stockAfterSale);

  const fiscalConfiguration = await api("/api/fiscal", {
    method: "PUT",
    body: {
      legalName: "ERP QA Pet Shop Limitada",
      tradeName: "ERP QA Pet Shop",
      cnpj: "11222333000181",
      stateRegistration: "110042490114",
      municipalRegistration: "123456",
      taxRegime: "SIMPLES_NACIONAL",
      cnae: "4789004",
      street: "Avenida Ana Costa",
      number: "100",
      district: "Gonzaga",
      city: "Santos",
      cityCode: "3548500",
      state: "SP",
      zipCode: "11060000",
      phone: "1333334444",
      email: "fiscal@example.invalid",
      environment: "HOMOLOGATION",
      provider: "SANDBOX",
      providerBaseUrl: "",
      providerToken: "",
      certificateType: "NONE",
      certificateExpiresAt: "",
      certificateName: "",
      certificateBase64: "",
      certificatePassword: "",
      nfceSecurityCodeId: "",
      nfceSecurityCode: "",
      enableNfe: false,
      enableNfce: true,
      enableNfse: false,
      autoEmail: false,
      accountantApproved: true
    }
  });
  assert(fiscalConfiguration.environment === "HOMOLOGATION" && fiscalConfiguration.accountantApproved === true, "Configuracao fiscal nao foi salva", fiscalConfiguration);

  const fiscalDocument = await api("/api/fiscal/documents", { method: "POST", body: { saleId: sale.id, type: "NFCE", series: 1 } }, 201);
  assert(fiscalDocument.status === "AUTHORIZED" && fiscalDocument.accessKey.includes("SEM-VALIDADE-FISCAL"), "Documento de homologacao nao foi autorizado ou identificado corretamente", fiscalDocument);
  const duplicateFiscal = await request("/api/fiscal/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ saleId: sale.id, type: "NFCE", series: 1 }) });
  assert(duplicateFiscal.response.status === 409 && duplicateFiscal.body?.error?.code === "DUPLICATE_FISCAL_DOCUMENT", "Protecao contra emissao duplicada falhou", duplicateFiscal.body);
  const fiscalOverview = await api("/api/fiscal");
  const storedFiscal = fiscalOverview.documents.find((item) => item.id === fiscalDocument.id);
  assert(storedFiscal?.hasXml && storedFiscal?.hasPdf && storedFiscal?.events.length >= 2, "Arquivos ou historico fiscal nao foram armazenados", storedFiscal);
  await api(`/api/fiscal/documents/${fiscalDocument.id}/query`, { method: "POST" });
  const cancelledFiscal = await api(`/api/fiscal/documents/${fiscalDocument.id}/cancel`, { method: "POST", body: { reason: "Cancelamento automatizado de homologacao" } });
  assert(cancelledFiscal.status === "CANCELLED", "Cancelamento fiscal de homologacao falhou", cancelledFiscal);

  const inventoryAfterSale = await api("/api/inventory");
  assert(inventoryAfterSale.movements.some((movement) => movement.reference === sale.code && movement.type === "EXIT"), "Venda nao gerou movimentacao de estoque", inventoryAfterSale.movements.slice(0, 3));
  const stockEntry = await api("/api/inventory", { method: "POST", body: { productId: product.id, type: "ENTRY", quantity: "2,000", reason: "Compra de fornecedor", reference: `NF-${stamp}` } }, 201);
  assert(stockEntry.newBalance === 10, "Entrada manual nao atualizou o estoque", stockEntry);

  const financeAfterSale = await api("/api/finance");
  assert(financeAfterSale.some((entry) => entry.saleId === sale.id && entry.type === "REVENUE" && entry.amount === 145), "Venda nao gerou receita financeira", financeAfterSale.slice(0, 3));
  const expense = await api("/api/finance", { method: "POST", body: { type: "EXPENSE", status: "PENDING", description: "Compra de mercadorias", category: "Fornecedores", amount: "R$ 125,50", dueDate: new Date().toISOString().slice(0, 10), paymentMethod: "PIX" } }, 201);
  await api(`/api/finance/${expense.id}`, { method: "PATCH", body: { status: "PAID" } });
  const paidFinance = await api("/api/finance");
  assert(paidFinance.some((entry) => entry.id === expense.id && entry.status === "PAID"), "Baixa financeira nao foi persistida");
  await api(`/api/finance/${expense.id}`, { method: "DELETE" });

  const dashboard = await api("/api/dashboard");
  assert(dashboard.metrics.revenue > 0 && dashboard.latestSales.length > 0, "Dashboard nao foi alimentada pelos dados persistidos", dashboard);

  await api(`/api/products/${product.id}`, { method: "DELETE" });
  await api(`/api/customers/${customer.id}`, { method: "DELETE" });
  const deletedProduct = await api(`/api/products?search=${productCode}`);
  const deletedCustomer = await api(`/api/customers?search=${encodeURIComponent(customerName)}&includeNeverPurchased=true`);
  assert(deletedProduct.products.length === 0, "Produto ainda aparece apos exclusao");
  assert(deletedCustomer.customers.length === 0, "Cliente ainda aparece apos exclusao");

  await prisma.financialEntry.deleteMany({ where: { saleId: sale.id } });
  await prisma.fiscalDocument.deleteMany({ where: { saleId: sale.id } });
  await prisma.inventoryMovement.deleteMany({ where: { OR: [{ reference: sale.code }, { reference: `NF-${stamp}` }, { reference: `FILIAL-${stamp}` }] } });
  await prisma.sale.delete({ where: { id: sale.id } });
  await prisma.product.deleteMany({ where: { id: product.id } });
  const secondUser = await prisma.user.findUnique({ where: { email: secondEmail }, select: { id: true } });
  if (secondUser) {
    await prisma.userTenantRole.deleteMany({ where: { userId: secondUser.id } });
    await prisma.user.delete({ where: { id: secondUser.id } });
  }
  await prisma.userInvitation.deleteMany({ where: { id: invitation.id } });
  await prisma.role.deleteMany({ where: { id: invitation.roleId } });
  await prisma.branch.deleteMany({ where: { id: secondBranch.id } });
  await prisma.tenant.deleteMany({ where: { document: "99999999000199" } });
  await prisma.user.deleteMany({ where: { email } });

  console.log(JSON.stringify({
    status: "passed",
    checks: ["cadastro", "edicao", "filtros", "email-config", "convite-funcionario", "aceite-convite", "permissoes-limitadas", "bloqueio-acesso-nao-autorizado", "login-por-loja", "estoque-separado-por-loja", "relatorios-separados-por-loja", "financeiro-separado-por-loja", "dashboard-separada-por-loja", "venda", "baixa-estoque", "movimentacao-manual", "custo-historico", "fornecedor", "financeiro", "dashboard-real", "historico", "exclusao", "configuracao-fiscal", "emissao-homologacao", "bloqueio-duplicidade", "armazenamento-xml-pdf", "consulta-fiscal", "cancelamento-fiscal"],
    sale: { id: sale.id, code: sale.code, total: sale.total }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
