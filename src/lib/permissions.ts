export const AUTH_PERMISSIONS = {
  DASHBOARD_READ: "dashboard.read",
  IDENTITY_USERS_READ: "identity.users.read",
  IDENTITY_USERS_CREATE: "identity.users.create",
  IDENTITY_ROLES_READ: "identity.roles.read",
  IDENTITY_ROLES_CREATE: "identity.roles.create",
  IDENTITY_PERMISSIONS_READ: "identity.permissions.read",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_READ: "audit.read",
  CUSTOMERS_READ: "customers.read",
  CUSTOMERS_WRITE: "customers.write",
  PRODUCTS_READ: "products.read",
  PRODUCTS_WRITE: "products.write",
  INVENTORY_READ: "inventory.read",
  INVENTORY_WRITE: "inventory.write",
  SALES_READ: "sales.read",
  SALES_WRITE: "sales.write",
  SALES_PDV: "sales.pdv",
  FINANCE_READ: "finance.read",
  FINANCE_WRITE: "finance.write",
  REPORTS_READ: "reports.read"
  ,FISCAL_READ: "fiscal.read"
  ,FISCAL_WRITE: "fiscal.write"
} as const;

export type PermissionKey = (typeof AUTH_PERMISSIONS)[keyof typeof AUTH_PERMISSIONS];

export type PermissionSeed = {
  key: PermissionKey;
  name: string;
  module: string;
  description: string;
};

export const BASE_PERMISSIONS: PermissionSeed[] = [
  {
    key: AUTH_PERMISSIONS.DASHBOARD_READ,
    name: "Visualizar dashboard",
    module: "dashboard",
    description: "Acessa indicadores e gráficos principais."
  },
  {
    key: AUTH_PERMISSIONS.IDENTITY_USERS_READ,
    name: "Visualizar usuários",
    module: "identity",
    description: "Consulta usuários da empresa ativa."
  },
  {
    key: AUTH_PERMISSIONS.IDENTITY_USERS_CREATE,
    name: "Criar usuários",
    module: "identity",
    description: "Cria usuários vinculados a cargos."
  },
  {
    key: AUTH_PERMISSIONS.IDENTITY_ROLES_READ,
    name: "Visualizar cargos",
    module: "identity",
    description: "Consulta cargos e suas permissões."
  },
  {
    key: AUTH_PERMISSIONS.IDENTITY_ROLES_CREATE,
    name: "Criar cargos",
    module: "identity",
    description: "Cria cargos por empresa."
  },
  {
    key: AUTH_PERMISSIONS.IDENTITY_PERMISSIONS_READ,
    name: "Visualizar permissões",
    module: "identity",
    description: "Consulta o catálogo de permissões do sistema."
  },
  {
    key: AUTH_PERMISSIONS.SETTINGS_MANAGE,
    name: "Gerenciar configurações",
    module: "settings",
    description: "Altera configurações da empresa, filiais e integrações."
  },
  {
    key: AUTH_PERMISSIONS.AUDIT_READ,
    name: "Visualizar auditoria",
    module: "audit",
    description: "Consulta logs e trilhas de auditoria."
  },
  {
    key: AUTH_PERMISSIONS.CUSTOMERS_READ,
    name: "Visualizar clientes",
    module: "customers",
    description: "Consulta cadastro, histórico e filtros de clientes."
  },
  {
    key: AUTH_PERMISSIONS.CUSTOMERS_WRITE,
    name: "Gerenciar clientes",
    module: "customers",
    description: "Cria e altera clientes da empresa ativa."
  },
  {
    key: AUTH_PERMISSIONS.PRODUCTS_READ,
    name: "Visualizar produtos",
    module: "products",
    description: "Consulta cadastros de produtos."
  },
  {
    key: AUTH_PERMISSIONS.PRODUCTS_WRITE,
    name: "Gerenciar produtos",
    module: "products",
    description: "Cria e altera cadastros de produtos."
  },
  {
    key: AUTH_PERMISSIONS.INVENTORY_READ,
    name: "Visualizar estoque",
    module: "inventory",
    description: "Consulta saldos e movimentações de estoque."
  },
  {
    key: AUTH_PERMISSIONS.INVENTORY_WRITE,
    name: "Movimentar estoque",
    module: "inventory",
    description: "Registra entradas, saídas, ajustes e inventários."
  },
  {
    key: AUTH_PERMISSIONS.SALES_READ,
    name: "Visualizar vendas",
    module: "sales",
    description: "Consulta o histórico de vendas da empresa ativa."
  },
  {
    key: AUTH_PERMISSIONS.SALES_WRITE,
    name: "Cadastrar vendas",
    module: "sales",
    description: "Registra vendas e atualiza o histórico do cliente."
  },
  {
    key: AUTH_PERMISSIONS.SALES_PDV,
    name: "Operar PDV",
    module: "sales",
    description: "Acessa e opera vendas no ponto de venda."
  },
  {
    key: AUTH_PERMISSIONS.FINANCE_READ,
    name: "Visualizar financeiro",
    module: "finance",
    description: "Consulta contas, fluxo de caixa e conciliação."
  },
  {
    key: AUTH_PERMISSIONS.FINANCE_WRITE,
    name: "Gerenciar financeiro",
    module: "finance",
    description: "Cria, atualiza e exclui lançamentos financeiros."
  },
  {
    key: AUTH_PERMISSIONS.REPORTS_READ,
    name: "Visualizar relatórios",
    module: "reports",
    description: "Acessa relatórios e exportações."
  },
  {
    key: AUTH_PERMISSIONS.FISCAL_READ,
    name: "Visualizar documentos fiscais",
    module: "fiscal",
    description: "Consulta configurações, documentos e eventos fiscais."
  },
  {
    key: AUTH_PERMISSIONS.FISCAL_WRITE,
    name: "Gerenciar documentos fiscais",
    module: "fiscal",
    description: "Configura e executa operações fiscais autorizadas."
  }
];

export function hasPermission(userPermissions: string[] | undefined, permission: PermissionKey) {
  return Boolean(userPermissions?.includes(permission));
}
