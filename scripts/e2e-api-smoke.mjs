import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.ERP_BASE_URL ?? "http://127.0.0.1:3000";
const email = "qa.erp@example.invalid";
const password = "TesteSeguro123";
const cookies = new Map();
const prisma = new PrismaClient();

function rememberCookies(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [response.headers.get("set-cookie")].filter(Boolean);

  for (const value of values) {
    const [pair] = value.split(";");
    const separator = pair.indexOf("=");
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
    headers: {
      ...(cookies.size ? { cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") } : {}),
      ...(init.body && !(init.body instanceof URLSearchParams) ? { "content-type": "application/json" } : {}),
      ...init.headers
    }
  });
  rememberCookies(response);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  return { response, body };
}

function assert(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ""}`);
  }
}

async function api(path, init = {}, expectedStatus = 200) {
  const result = await request(path, {
    ...init,
    body: init.body && !(init.body instanceof URLSearchParams) ? JSON.stringify(init.body) : init.body
  });
  assert(result.response.status === expectedStatus, `${init.method ?? "GET"} ${path} retornou ${result.response.status}`, result.body);
  return result.body.data;
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

  const csrfResult = await request("/api/auth/csrf");
  assert(csrfResult.response.status === 200, "Nao foi possivel obter token CSRF", csrfResult.body);
  const csrf = csrfResult.body;
  const form = new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: `${baseUrl}/dashboard`, json: "true" });
  const signedIn = await request("/api/auth/callback/credentials?json=true", {
    method: "POST",
    body: form,
    headers: { "content-type": "application/x-www-form-urlencoded" }
  });
  assert([200, 302].includes(signedIn.response.status), "Login QA falhou", signedIn.body);
  const sessionResult = await request("/api/auth/session");
  assert(sessionResult.response.status === 200, "Nao foi possivel consultar a sessao", sessionResult.body);
  const session = sessionResult.body;
  assert(session?.user?.currentTenantId, "Sessao autenticada nao foi criada", session);
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
  await prisma.inventoryMovement.deleteMany({ where: { OR: [{ reference: sale.code }, { reference: `NF-${stamp}` }] } });
  await prisma.sale.delete({ where: { id: sale.id } });
  await prisma.product.deleteMany({ where: { id: product.id } });

  console.log(JSON.stringify({
    status: "passed",
    checks: ["cadastro", "edicao", "filtros", "email-config", "venda", "baixa-estoque", "movimentacao-manual", "custo-historico", "fornecedor", "financeiro", "dashboard-real", "historico", "exclusao", "configuracao-fiscal", "emissao-homologacao", "bloqueio-duplicidade", "armazenamento-xml-pdf", "consulta-fiscal", "cancelamento-fiscal"],
    sale: { id: sale.id, code: sale.code, total: sale.total }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
