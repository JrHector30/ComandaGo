const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Clear data
    try {
        await prisma.detalleComanda.deleteMany();
        await prisma.comanda.deleteMany();
        await prisma.mesa.deleteMany();
        await prisma.plato.deleteMany();
        await prisma.user.deleteMany();
        console.log('Database cleared.');
    } catch (e) {
        console.log('Error clearing data (tables might differ):', e.message);
    }
    // 1. Users
    const users = [
        { nombre: 'Juan Pérez', usuario: 'juan', rol: 'mozo', password: '123', foto: '' },
        { nombre: 'Carlos Chef', usuario: 'chef', rol: 'cocina', password: '123', foto: '' },
        { nombre: 'Ana Cajera', usuario: 'ana', rol: 'caja', password: '123', foto: '' },
        { nombre: 'Admin General', usuario: 'admin', rol: 'admin', password: '123', foto: '' },
    ];

    for (const u of users) {
        await prisma.user.create({ data: u });
    }

    // 2. Tables
    for (let i = 1; i <= 15; i++) {
        await prisma.mesa.create({
            data: {
                numero: `${i}`,
                capacidad: i <= 4 ? 2 : 4,
                estado: 'libre'
            }
        });
    }

    // 3. Categories
    const categorias = [
        { nombre: 'Desayunos', icono: '🍳', color: '#E8F5E9', orden: 1 },
        { nombre: 'Sopas', icono: '🍲', color: '#F3E5F5', orden: 2 },
        { nombre: 'Pasta', icono: '🍝', color: '#E3F2FD', orden: 3 },
        { nombre: 'Mariscos', icono: '🦞', color: '#EDE7F6', orden: 4 },
        { nombre: 'Plato Principal', icono: '🍖', color: '#FCE4EC', orden: 5 },
        { nombre: 'Postres', icono: '🍰', color: '#FFF3E0', orden: 6 },
        { nombre: 'Bebidas', icono: '☕', color: '#FFEBEE', orden: 7 },
        { nombre: 'Alcohol', icono: '🍷', color: '#E0F2F1', orden: 8 },
    ];

    for (const c of categorias) {
        await prisma.categoria.create({ data: c });
    }

    // 4. Menu (Platos) linked to Categories
    // Helper to find category ID
    const getCatId = async (name) => {
        const c = await prisma.categoria.findUnique({ where: { nombre: name } });
        return c.id;
    };

    const platos = [
        { nombre: 'Milanesa Napolitana', categoria: 'Plato Principal', precio: 35.00, descripcion: 'Con papas fritas' },
        { nombre: 'Hamburguesa Completa', categoria: 'Plato Principal', precio: 25.00, descripcion: 'Con queso y tocino' },
        { nombre: 'Papas Fritas', categoria: 'Plato Principal', precio: 15.00, descripcion: 'Porción grande' },
        { nombre: 'Sopa de Pollo', categoria: 'Sopas', precio: 12.00, descripcion: 'Casera' },
        { nombre: 'Coca Cola 500ml', categoria: 'Bebidas', precio: 5.00 },
        { nombre: 'Agua Mineral', categoria: 'Bebidas', precio: 3.50 },
        { nombre: 'Flan Casero', categoria: 'Postres', precio: 8.00 },
    ];

    for (const p of platos) {
        const catId = await getCatId(p.categoria);
        await prisma.plato.create({
            data: {
                nombre: p.nombre,
                precio: parseFloat(p.precio),
                descripcion: p.descripcion,
                categoriaId: catId
            }
        });
    }

    console.log('Database seeded!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
