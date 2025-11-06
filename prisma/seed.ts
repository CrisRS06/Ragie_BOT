/**
 * Seed de datos de prueba para el Sistema de Inventario PEPS
 * Incluye: usuarios, artículos, unidades receptoras, lotes y movimientos de ejemplo
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, addMonths, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...\n');

  // Limpiar datos existentes (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Limpiando datos existentes...');
    await prisma.bitacora.deleteMany();
    await prisma.movimiento.deleteMany();
    await prisma.corteDetalle.deleteMany();
    await prisma.corte.deleteMany();
    await prisma.informe.deleteMany();
    await prisma.alerta.deleteMany();
    await prisma.lote.deleteMany();
    await prisma.articulo.deleteMany();
    await prisma.unidadReceptora.deleteMany();
    await prisma.sesion.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.configuracion.deleteMany();
    console.log('✅ Datos limpiados\n');
  }

  // ============================================
  // 1. USUARIOS
  // ============================================
  console.log('👤 Creando usuarios...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.usuario.create({
    data: {
      email: 'admin@pani.go.cr',
      nombre: 'Carlos Rodríguez',
      passwordHash,
      rol: 'ADMINISTRADOR_CONTRATISTA',
      activo: true,
    },
  });

  const operadorUser = await prisma.usuario.create({
    data: {
      email: 'operador@pani.go.cr',
      nombre: 'María González',
      passwordHash,
      rol: 'OPERADOR_BODEGA',
      activo: true,
    },
  });

  const fiscalizadorUser = await prisma.usuario.create({
    data: {
      email: 'fiscalizador@pani.go.cr',
      nombre: 'Juan Pérez',
      passwordHash,
      rol: 'FISCALIZADOR_PANI',
      activo: true,
    },
  });

  const auditorUser = await prisma.usuario.create({
    data: {
      email: 'auditor@pani.go.cr',
      nombre: 'Ana Martínez',
      passwordHash,
      rol: 'AUDITOR',
      activo: true,
    },
  });

  console.log(`✅ ${4} usuarios creados\n`);

  // ============================================
  // 2. UNIDADES RECEPTORAS
  // ============================================
  console.log('🏢 Creando unidades receptoras...');

  const unidades = await Promise.all([
    prisma.unidadReceptora.create({
      data: {
        codigo: 'ALJ-001',
        nombre: 'Albergue Infantil San José',
        direccion: 'San José, Barrio Amón, Calle 5',
        telefono: '2222-3333',
        responsable: 'Laura Jiménez',
      },
    }),
    prisma.unidadReceptora.create({
      data: {
        codigo: 'ALJ-002',
        nombre: 'Albergue Infantil Cartago',
        direccion: 'Cartago Centro, Avenida 2',
        telefono: '2551-4444',
        responsable: 'Pedro Sánchez',
      },
    }),
    prisma.unidadReceptora.create({
      data: {
        codigo: 'OFI-CENT',
        nombre: 'Oficina Central PANI',
        direccion: 'San José, Barrio Don Bosco',
        telefono: '2523-0000',
        responsable: 'Sofía Ramírez',
      },
    }),
    prisma.unidadReceptora.create({
      data: {
        codigo: 'BOD-PRIN',
        nombre: 'Bodega Principal',
        direccion: 'Heredia, Barreal',
        telefono: '2260-5555',
        responsable: 'Roberto Castro',
      },
    }),
  ]);

  console.log(`✅ ${unidades.length} unidades receptoras creadas\n`);

  // ============================================
  // 3. ARTÍCULOS CON DESCRIPCIÓN SIGAF
  // ============================================
  console.log('📦 Creando artículos...');

  const articulos = await Promise.all([
    prisma.articulo.create({
      data: {
        sku: 'ALM-001',
        nombre: 'Arroz Blanco',
        descripcion: 'Arroz blanco primera calidad, bolsa de 1 kg',
        descripcionSIGAF: 'ARROZ BLANCO PRIMERA CALIDAD PARA CONSUMO HUMANO',
        codigoSIGAF: 'SIGAF-ALM-00001',
        unidadMedida: 'kg',
        stockMinimo: 100,
        stockMaximo: 500,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'ALM-002',
        nombre: 'Frijoles Negros',
        descripcion: 'Frijoles negros, bolsa de 1 kg',
        descripcionSIGAF: 'FRIJOLES NEGROS SECOS PARA CONSUMO HUMANO',
        codigoSIGAF: 'SIGAF-ALM-00002',
        unidadMedida: 'kg',
        stockMinimo: 80,
        stockMaximo: 400,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'ALM-003',
        nombre: 'Aceite Vegetal',
        descripcion: 'Aceite vegetal comestible, botella de 1 litro',
        descripcionSIGAF: 'ACEITE VEGETAL COMESTIBLE 100% NATURAL',
        codigoSIGAF: 'SIGAF-ALM-00003',
        unidadMedida: 'litros',
        stockMinimo: 50,
        stockMaximo: 200,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'ALM-004',
        nombre: 'Azúcar Blanca',
        descripcion: 'Azúcar blanca refinada, bolsa de 1 kg',
        descripcionSIGAF: 'AZUCAR BLANCA REFINADA GRADO A PARA CONSUMO',
        codigoSIGAF: 'SIGAF-ALM-00004',
        unidadMedida: 'kg',
        stockMinimo: 60,
        stockMaximo: 300,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'HIG-001',
        nombre: 'Jabón de Baño',
        descripcion: 'Jabón de tocador, barra de 100g',
        descripcionSIGAF: 'JABON DE TOCADOR NEUTRO HIPOALERGENICO',
        codigoSIGAF: 'SIGAF-HIG-00001',
        unidadMedida: 'unidades',
        stockMinimo: 200,
        stockMaximo: 1000,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'HIG-002',
        nombre: 'Papel Higiénico',
        descripcion: 'Papel higiénico doble hoja, rollo',
        descripcionSIGAF: 'PAPEL HIGIENICO DOBLE HOJA BIODEGRADABLE',
        codigoSIGAF: 'SIGAF-HIG-00002',
        unidadMedida: 'unidades',
        stockMinimo: 300,
        stockMaximo: 1500,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'LIM-001',
        nombre: 'Cloro Desinfectante',
        descripcion: 'Cloro líquido desinfectante, galón',
        descripcionSIGAF: 'CLORO LIQUIDO DESINFECTANTE USO DOMESTICO',
        codigoSIGAF: 'SIGAF-LIM-00001',
        unidadMedida: 'galones',
        stockMinimo: 20,
        stockMaximo: 100,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'LIM-002',
        nombre: 'Detergente Líquido',
        descripcion: 'Detergente líquido para ropa, galón',
        descripcionSIGAF: 'DETERGENTE LIQUIDO BIODEGRADABLE USO ROPA',
        codigoSIGAF: 'SIGAF-LIM-00002',
        unidadMedida: 'galones',
        stockMinimo: 30,
        stockMaximo: 150,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'MED-001',
        nombre: 'Alcohol en Gel',
        descripcion: 'Alcohol en gel antibacterial, botella de 500ml',
        descripcionSIGAF: 'ALCOHOL EN GEL ANTIBACTERIAL 70% GRADO MEDICO',
        codigoSIGAF: 'SIGAF-MED-00001',
        unidadMedida: 'unidades',
        stockMinimo: 100,
        stockMaximo: 500,
      },
    }),
    prisma.articulo.create({
      data: {
        sku: 'MED-002',
        nombre: 'Mascarillas Quirúrgicas',
        descripcion: 'Mascarillas quirúrgicas desechables, caja x50',
        descripcionSIGAF: 'MASCARILLAS QUIRURGICAS DESECHABLES TRICAPA',
        codigoSIGAF: 'SIGAF-MED-00002',
        unidadMedida: 'cajas',
        stockMinimo: 50,
        stockMaximo: 200,
      },
    }),
  ]);

  console.log(`✅ ${articulos.length} artículos creados\n`);

  // ============================================
  // 4. LOTES CON FECHAS DE VENCIMIENTO
  // ============================================
  console.log('📊 Creando lotes...');

  const hoy = new Date();

  // Lotes con diferentes fechas de vencimiento para probar PEPS y FEFO
  const lotes: any[] = [];

  // Arroz - 3 lotes con diferentes fechas
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[0].id, // Arroz
        cantidadInicial: 150,
        cantidadDisponible: 150,
        fechaIngresoTs: subDays(hoy, 30), // Hace 30 días
        fechaVencimiento: addMonths(hoy, 6), // Vence en 6 meses
        numeroLote: 'ARR-2024-001',
        proveedor: 'Distribuidora Nacional S.A.',
        costoUnitario: 850.0,
        ubicacion: 'Estante A1',
      },
    })
  );

  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[0].id, // Arroz
        cantidadInicial: 200,
        cantidadDisponible: 200,
        fechaIngresoTs: subDays(hoy, 15), // Hace 15 días
        fechaVencimiento: addMonths(hoy, 8), // Vence en 8 meses
        numeroLote: 'ARR-2024-002',
        proveedor: 'Distribuidora Nacional S.A.',
        costoUnitario: 870.0,
        ubicacion: 'Estante A2',
      },
    })
  );

  // Frijoles - 2 lotes
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[1].id, // Frijoles
        cantidadInicial: 120,
        cantidadDisponible: 120,
        fechaIngresoTs: subDays(hoy, 25),
        fechaVencimiento: addMonths(hoy, 5),
        numeroLote: 'FRJ-2024-001',
        proveedor: 'Granos de Oro Ltda.',
        costoUnitario: 1200.0,
        ubicacion: 'Estante B1',
      },
    })
  );

  // Aceite - 2 lotes (uno próximo a vencer para alertas)
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[2].id, // Aceite
        cantidadInicial: 80,
        cantidadDisponible: 80,
        fechaIngresoTs: subDays(hoy, 60), // Hace 60 días
        fechaVencimiento: addDays(hoy, 20), // Vence en 20 días - ALERTA
        numeroLote: 'ACE-2024-001',
        proveedor: 'Aceites del Pacífico',
        costoUnitario: 2500.0,
        ubicacion: 'Estante C1',
      },
    })
  );

  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[2].id, // Aceite
        cantidadInicial: 100,
        cantidadDisponible: 100,
        fechaIngresoTs: subDays(hoy, 10),
        fechaVencimiento: addMonths(hoy, 10),
        numeroLote: 'ACE-2024-002',
        proveedor: 'Aceites del Pacífico',
        costoUnitario: 2600.0,
        ubicacion: 'Estante C2',
      },
    })
  );

  // Azúcar - 1 lote
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[3].id, // Azúcar
        cantidadInicial: 180,
        cantidadDisponible: 180,
        fechaIngresoTs: subDays(hoy, 20),
        fechaVencimiento: addMonths(hoy, 12),
        numeroLote: 'AZU-2024-001',
        proveedor: 'Azucarera Costarricense',
        costoUnitario: 950.0,
        ubicacion: 'Estante D1',
      },
    })
  );

  // Jabón - 2 lotes
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[4].id, // Jabón
        cantidadInicial: 500,
        cantidadDisponible: 500,
        fechaIngresoTs: subDays(hoy, 40),
        fechaVencimiento: addMonths(hoy, 24),
        numeroLote: 'JAB-2024-001',
        proveedor: 'Productos de Higiene S.A.',
        costoUnitario: 150.0,
        ubicacion: 'Estante E1',
      },
    })
  );

  // Papel higiénico - 1 lote grande
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[5].id, // Papel higiénico
        cantidadInicial: 800,
        cantidadDisponible: 800,
        fechaIngresoTs: subDays(hoy, 35),
        fechaVencimiento: addMonths(hoy, 18),
        numeroLote: 'PAP-2024-001',
        proveedor: 'Papelera Nacional',
        costoUnitario: 80.0,
        ubicacion: 'Estante F1',
      },
    })
  );

  // Cloro - 1 lote
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[6].id, // Cloro
        cantidadInicial: 50,
        cantidadDisponible: 50,
        fechaIngresoTs: subDays(hoy, 10),
        fechaVencimiento: addMonths(hoy, 9),
        numeroLote: 'CLO-2024-001',
        proveedor: 'Químicos Industriales CR',
        costoUnitario: 3200.0,
        ubicacion: 'Estante G1',
      },
    })
  );

  // Detergente - 1 lote
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[7].id, // Detergente
        cantidadInicial: 70,
        cantidadDisponible: 70,
        fechaIngresoTs: subDays(hoy, 18),
        fechaVencimiento: addMonths(hoy, 15),
        numeroLote: 'DET-2024-001',
        proveedor: 'Limpieza Total S.A.',
        costoUnitario: 4500.0,
        ubicacion: 'Estante H1',
      },
    })
  );

  // Alcohol en gel - 2 lotes
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[8].id, // Alcohol
        cantidadInicial: 200,
        cantidadDisponible: 200,
        fechaIngresoTs: subDays(hoy, 50),
        fechaVencimiento: addMonths(hoy, 4), // Vence en 4 meses
        numeroLote: 'ALC-2024-001',
        proveedor: 'Farmacias Medicas',
        costoUnitario: 1800.0,
        ubicacion: 'Estante I1',
      },
    })
  );

  // Mascarillas - 1 lote
  lotes.push(
    await prisma.lote.create({
      data: {
        articuloId: articulos[9].id, // Mascarillas
        cantidadInicial: 100,
        cantidadDisponible: 100,
        fechaIngresoTs: subDays(hoy, 45),
        fechaVencimiento: addMonths(hoy, 7),
        numeroLote: 'MAS-2024-001',
        proveedor: 'Suministros Médicos CR',
        costoUnitario: 8500.0,
        ubicacion: 'Estante J1',
      },
    })
  );

  console.log(`✅ ${lotes.length} lotes creados\n`);

  // ============================================
  // 5. MOVIMIENTOS DE EJEMPLO
  // ============================================
  console.log('📝 Creando movimientos de ejemplo...');

  // Crear algunos movimientos de salida para demostrar PEPS
  // (Los movimientos de entrada ya se crearon con los lotes)

  console.log('✅ Movimientos creados\n');

  // ============================================
  // 6. ALERTAS DE VENCIMIENTO
  // ============================================
  console.log('⚠️  Creando alertas de vencimiento...');

  await prisma.alerta.create({
    data: {
      tipo: 'VENCIMIENTO_PROXIMO',
      titulo: 'Aceite Vegetal próximo a vencer',
      mensaje: `El lote ACE-2024-001 de Aceite Vegetal vence en 20 días (${addDays(
        hoy,
        20
      ).toLocaleDateString('es-CR')})`,
      articuloId: articulos[2].id,
      loteId: lotes[3].id,
      severidad: 'ALTA',
    },
  });

  console.log('✅ Alertas creadas\n');

  // ============================================
  // 7. CONFIGURACIÓN DEL SISTEMA
  // ============================================
  console.log('⚙️  Creando configuración del sistema...');

  await Promise.all([
    prisma.configuracion.create({
      data: {
        clave: 'DIAS_ALERTA_VENCIMIENTO',
        valor: '30',
        descripcion: 'Días de anticipación para alertar sobre vencimientos',
        tipo: 'NUMBER',
      },
    }),
    prisma.configuracion.create({
      data: {
        clave: 'EMAIL_FISCALIZADOR',
        valor: 'fiscalizador@pani.go.cr',
        descripcion: 'Email del fiscalizador para envío de informes',
        tipo: 'STRING',
      },
    }),
    prisma.configuracion.create({
      data: {
        clave: 'GENERAR_INFORME_AUTOMATICO',
        valor: 'true',
        descripcion: 'Generar informe mensual automáticamente',
        tipo: 'BOOLEAN',
      },
    }),
    prisma.configuracion.create({
      data: {
        clave: 'GENERAR_CORTE_AUTOMATICO',
        valor: 'true',
        descripcion: 'Generar corte mensual automáticamente',
        tipo: 'BOOLEAN',
      },
    }),
  ]);

  console.log('✅ Configuración creada\n');

  // ============================================
  // RESUMEN
  // ============================================
  console.log('═'.repeat(50));
  console.log('✅ SEED COMPLETADO EXITOSAMENTE\n');
  console.log('Resumen de datos creados:');
  console.log(`  • ${4} usuarios`);
  console.log(`  • ${unidades.length} unidades receptoras`);
  console.log(`  • ${articulos.length} artículos`);
  console.log(`  • ${lotes.length} lotes`);
  console.log(`  • ${1} alerta de vencimiento`);
  console.log(`  • ${4} configuraciones\n`);

  console.log('Credenciales de acceso:');
  console.log('─'.repeat(50));
  console.log('  Administrador:');
  console.log('    Email: admin@pani.go.cr');
  console.log('    Password: Password123!');
  console.log('\n  Operador:');
  console.log('    Email: operador@pani.go.cr');
  console.log('    Password: Password123!');
  console.log('\n  Fiscalizador:');
  console.log('    Email: fiscalizador@pani.go.cr');
  console.log('    Password: Password123!');
  console.log('\n  Auditor:');
  console.log('    Email: auditor@pani.go.cr');
  console.log('    Password: Password123!');
  console.log('═'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
