import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || !/\/proseguit_test_[a-z0-9_]+(?:\?|$)/.test(databaseUrl)) {
  throw new Error('El seed de QA solo puede ejecutarse sobre una base proseguit_test_*');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const ciudad = await prisma.ciudad.create({ data: { nombre: 'Mercedes QA' } });
  const seccion = await prisma.seccion.create({
    data: { nombre: 'Informática QA', ciudadId: ciudad.id },
  });

  const [soporte, oficina] = await Promise.all([
    prisma.oficina.create({
      data: { nombre: 'Soporte QA', tipo: 'SOPORTE', seccionId: seccion.id },
    }),
    prisma.oficina.create({
      data: { nombre: 'Oficina destino QA', tipo: 'OFICINA', seccionId: seccion.id },
    }),
  ]);

  await Promise.all([
    prisma.tipoEquipo.create({ data: { nombre: 'PC QA', icono: 'computer' } }),
    prisma.servicioExterno.create({
      data: { nombre: 'Servicio técnico QA', contacto: 'qa@invalid.local' },
    }),
  ]);

  const [adminHash, tecnicoHash] = await Promise.all([
    bcrypt.hash('admin123', 4),
    bcrypt.hash('7844', 4),
  ]);

  await Promise.all([
    prisma.usuario.create({
      data: {
        nombre: 'Administrador QA',
        ficha: 9999,
        passwordHash: adminHash,
        rol: 'ADMIN',
        activo: true,
        forcePasswordChange: false,
        oficinaId: soporte.id,
      },
    }),
    prisma.usuario.create({
      data: {
        nombre: 'Técnico QA',
        ficha: 7844,
        passwordHash: tecnicoHash,
        rol: 'TECNICO',
        activo: true,
        forcePasswordChange: false,
        oficinaId: oficina.id,
      },
    }),
  ]);
}

main()
  .then(() => console.log('Fixtures aislados de QA creados'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
