import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding PROSEGUIT...');

  // Ciudad por defecto
  const mercedes = await prisma.ciudad.upsert({
    where: { nombre: 'Mercedes' },
    update: {},
    create: { nombre: 'Mercedes' },
  });

  // Sección Informática
  const informatica = await prisma.seccion.upsert({
    where: { nombre_ciudadId: { nombre: 'Informatica', ciudadId: mercedes.id } },
    update: {},
    create: { nombre: 'Informatica', ciudadId: mercedes.id },
  });

  // Oficina Informática General
  const ofInformatica = await prisma.oficina.upsert({
    where: { nombre_seccionId: { nombre: 'General', seccionId: informatica.id } },
    update: {},
    create: { nombre: 'General', seccionId: informatica.id },
  });

  // Usuario Admin
  const adminHash = await bcrypt.hash('admin123', 12);
  await prisma.usuario.upsert({
    where: { ficha: 9999 },
    update: {},
    create: {
      nombre: 'Admin',
      ficha: 9999,
      passwordHash: adminHash,
      rol: 'ADMIN',
      activo: true,
      forcePasswordChange: false,
      oficinaId: ofInformatica.id,
    },
  });

  // Usuario Ramiro (técnico)
  const ramiroHash = await bcrypt.hash('7844', 12);
  await prisma.usuario.upsert({
    where: { ficha: 7844 },
    update: {},
    create: {
      nombre: 'Ramiro Quesada',
      ficha: 7844,
      passwordHash: ramiroHash,
      rol: 'TECNICO',
      activo: true,
      forcePasswordChange: true,
      oficinaId: ofInformatica.id,
    },
  });

  console.log('Seed completado: Admin (9999/admin123), Ramiro (7844/7844)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
