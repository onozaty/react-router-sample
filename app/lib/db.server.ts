import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient;
}

let prisma: PrismaClient;

if (!global.__prisma__) {
  global.__prisma__ = new PrismaClient();
}
prisma = global.__prisma__;

export { prisma };
