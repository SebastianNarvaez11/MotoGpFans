/**
 * Seed de referencia.
 *
 * Inserta únicamente los datos *estables* que no dependen de la ingesta:
 * las tres clases del campeonato, con los UUID de los tres espacios de
 * identificadores que expone la fuente. Todo lo demás (temporadas, eventos,
 * sesiones, pilotos, clasificaciones) lo trae la ingesta desde la API.
 *
 * Es idempotente: se puede ejecutar tantas veces como haga falta.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// El seed se ejecuta con `tsx`, que no carga `.env` por su cuenta (y
// prisma.config.ts solo aplica a los comandos de la CLI de Prisma). Sin esto,
// el cliente no encontraría DATABASE_URL.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Sin .env: se asume que las variables vienen ya del entorno (CI, producción).
}

const prisma = new PrismaClient();

/**
 * UUID verificados contra la API el 2026-08-24. La clave natural es el
 * acrónimo; los UUID son columnas puente hacia cada endpoint.
 */
const CATEGORIES = [
  {
    acronym: "MGP",
    name: "MotoGP",
    priority: 1,
    broadcastUuid: "93888447-8746-4161-882c-e08a1d48447e",
    resultsUuid: "e8c110ad-64aa-4e8e-8a86-f2f152f6a942",
    ridersUuid: "737ab122-76e1-4081-bedb-334caaa18c70",
  },
  {
    acronym: "MT2",
    name: "Moto2",
    priority: 2,
    broadcastUuid: "bc2b0143-1bfb-4ad0-9501-da2e474e3ea7",
    resultsUuid: "549640b8-fd9c-4245-acfd-60e4bc38b25c",
    ridersUuid: "ea854a67-73a4-4a28-ac77-d67b3b2a530a",
  },
  {
    acronym: "MT3",
    name: "Moto3",
    priority: 3,
    broadcastUuid: "7b0adf61-0a93-4e3d-a7ef-1fee93c2591f",
    resultsUuid: "954f7e65-2ef2-4423-b949-4961cc603e45",
    ridersUuid: "1ab203aa-e292-4842-8bed-971911357af1",
  },
] as const;

async function main() {
  console.log("Sembrando categorías…");

  for (const category of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { acronym: category.acronym },
      update: {
        name: category.name,
        priority: category.priority,
        broadcastUuid: category.broadcastUuid,
        resultsUuid: category.resultsUuid,
        ridersUuid: category.ridersUuid,
      },
      create: { ...category },
    });
    console.log(`  ✓ ${row.acronym} — ${row.name}`);
  }

  console.log("Seed completado.");
}

main()
  .catch((error) => {
    console.error("Seed fallido:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
