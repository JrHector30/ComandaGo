const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Iniciando limpieza profunda de la base de datos...');

    try {
        // 1. DetalleComanda (Hijos de Comanda y Plato)
        const deletedDetalles = await prisma.detalleComanda.deleteMany({});
        console.log(`✅ DetalleComanda eliminados: ${deletedDetalles.count}`);

        // 2. Comanda (Padres de Detalle, Hijos de Mesa/Usuario)
        const deletedComandas = await prisma.comanda.deleteMany({});
        console.log(`✅ Comandas eliminadas: ${deletedComandas.count}`);

        // 3. Plato (Hijos de Categoria)
        const deletedPlatos = await prisma.plato.deleteMany({});
        console.log(`✅ Platos eliminados: ${deletedPlatos.count}`);

        // 4. Categoria (Padres de Plato)
        const deletedCategorias = await prisma.categoria.deleteMany({});
        console.log(`✅ Categorías eliminadas: ${deletedCategorias.count}`);

        // 5. Arqueo (Opcional pero recomendado para consistencia financiera)
        // const deletedArqueos = await prisma.arqueo.deleteMany({});
        // console.log(`✅ Arqueos eliminados: ${deletedArqueos.count}`);

        // 6. Reset AutoIncrement (SQLite specific)
        console.log('🔄 Reseteando contadores de ID...');
        try {
            await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='DetalleComanda';`);
            await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Comanda';`);
            await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Plato';`);
            await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Categoria';`);
        } catch (err) {
            console.warn("⚠️ No se pudo resetear sqlite_sequence (quizás no existe aún):", err.message);
        }

        console.log('✨ Base de datos limpia y lista para nuevos registros.');

    } catch (e) {
        console.error('❌ Error durante la limpieza:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
