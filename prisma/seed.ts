import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { BASE_PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function main() {
  const permissionIds: string[] = [];

  for (const permission of BASE_PERMISSIONS) {
    const result = await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        module: permission.module,
        description: permission.description
      },
      create: permission
    });

    permissionIds.push(result.id);
  }

  const adminRoles = await prisma.role.findMany({
    where: {
      OR: [{ isSystem: true }, { name: "Administrador" }]
    },
    select: { id: true }
  });

  for (const role of adminRoles) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId
      })),
      skipDuplicates: true
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
