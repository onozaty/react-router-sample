import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient;
}

if (!global.__prisma__) {
  global.__prisma__ = new PrismaClient();
}
const prisma = global.__prisma__;

export { prisma };
