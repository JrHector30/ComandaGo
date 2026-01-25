const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const multer = require('multer');
const fs = require('fs-extra');
const OpenAI = require('openai'); // Import OpenAI

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI (fails gracefully if no key)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'mock-key', // Use dummy key to prevent crash if missing
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads', 'productos');
const uploadUsersDir = path.join(__dirname, 'public', 'uploads', 'usuarios');
fs.ensureDirSync(uploadDir);
fs.ensureDirSync(uploadUsersDir);

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// --- ROUTES ---

// 1. Users (Auth placeholder)
app.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    const { nombre, usuario, rol, password, foto } = req.body;
    try {
        const user = await prisma.user.create({
            data: { nombre, usuario, rol, password, foto }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, usuario, rol, password, foto } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { nombre, usuario, rol, password, foto }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ message: "User deleted" });
    } catch (error) {
        res.status(400).json({ error: "Cannot delete user" });
    }
});

app.post('/api/login', async (req, res) => {
    const { usuario, password } = req.body;
    const user = await prisma.user.findFirst({
        where: { usuario, password } // In prod, verify hash
    });
    if (user) {
        res.json(user);
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// 2. Tables
app.get('/api/tables', async (req, res) => {
    const tables = await prisma.mesa.findMany({
        include: {
            comandas: {
                where: { estado: { not: 'cerrada' } },
                include: {
                    detalles: {
                        include: {
                            plato: {
                                include: { categoria: true }
                            },
                            cocinero: true
                        }
                    },
                    usuario: true // Include Waiter Info
                }
            }
        }
    });
    res.json(tables);
});

app.post('/api/tables', async (req, res) => {
    const { numero, capacidad } = req.body;
    const table = await prisma.mesa.create({
        data: { numero, capacidad }
    });
    res.json(table);
});

app.put('/api/tables/:id/status', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const table = await prisma.mesa.update({
        where: { id: parseInt(id) },
        data: { estado }
    });
    res.json(table);
});

// 3. Categories (NEW)
app.get('/api/categories', async (req, res) => {
    const categories = await prisma.categoria.findMany({
        orderBy: { orden: 'asc' },
        include: {
            _count: {
                select: {
                    platos: {
                        where: { deleted: false }
                    }
                }
            }
        }
    });
    res.json(categories);
});

app.post('/api/categories', async (req, res) => {
    const { nombre, color, icono, orden, activo, enviarCocina } = req.body;
    try {
        const category = await prisma.categoria.create({
            data: {
                nombre,
                color,
                icono,
                orden: parseInt(orden || 0),
                activo: activo !== undefined ? activo : true,
                enviarCocina: enviarCocina !== undefined ? enviarCocina : true
            }
        });
        res.json(category);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, color, icono, orden, activo, enviarCocina } = req.body;
    const category = await prisma.categoria.update({
        where: { id: parseInt(id) },
        data: {
            nombre,
            color,
            icono,
            orden: parseInt(orden),
            activo,
            enviarCocina
        }
    });
    res.json(category);
});

app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    console.log("Attempting to FORCE DELETE category ID:", id);
    const catId = parseInt(id);
    try {
        // HARD DELETE (Physical Delete)
        // 1. Delete all products in this category explicitly
        // NOTE: This might fail if products are in orders (DetalleComanda). 
        // If that happens, we'd need to assume the user wants to keep data integrity or wipe it all.
        // For now, following user instruction to delete products first.
        await prisma.plato.deleteMany({
            where: { categoryId: catId }
        });

        // 2. Delete the category itself physicaly
        await prisma.categoria.delete({
            where: { id: catId }
        });

        console.log("Category FORCE DELETED successfully:", catId);
        res.json({ message: "Category and its products permanently deleted" });
    } catch (e) {
        console.error("Force Delete failed:", e);
        // Fallback: If FK constraint (likely DetalleComanda), we might need to soft delete or user has to handle it.
        // But the user asked for Bypass. If this fails, it's because of Order History.
        res.status(500).json({ error: "Error deleting category: " + e.message });
    }
});

// 4. Products (Modified)
app.get('/api/products', async (req, res) => {
    const { categoryId } = req.query;
    const where = { activo: true };
    if (categoryId) where.categoriaId = parseInt(categoryId);

    const products = await prisma.plato.findMany({
        where,
        include: { categoria: true }
    });
    res.json(products);
});

app.post('/api/products', async (req, res) => {
    const { nombre, precio, categoriaId, descripcion, imagen } = req.body;
    const product = await prisma.plato.create({
        data: {
            nombre,
            precio: parseFloat(precio),
            categoriaId: parseInt(categoriaId),
            descripcion,
            imagen
        }
    });
    res.json(product);
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    if (data.precio) data.precio = parseFloat(data.precio);
    if (data.categoriaId) data.categoriaId = parseInt(data.categoriaId);

    const product = await prisma.plato.update({
        where: { id: parseInt(id) },
        data
    });
    res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.plato.delete({ where: { id: parseInt(id) } });
        res.json({ message: "Product permanently deleted" });
    } catch (error) {
        if (error.code === 'P2003') {
            // Foreign key constraint failed -> Soft Delete
            await prisma.plato.update({
                where: { id: parseInt(id) },
                data: { activo: false }
            });
            res.json({ message: "Product soft deleted (archived because it has sales history)" });
        } else {
            console.error(error);
            res.status(500).json({ error: "Error deleting product" });
        }
    }
});

// AI Description Generator
app.post('/api/generate-description', async (req, res) => {
    const { productName } = req.body;
    if (!productName) return res.status(400).json({ error: "Product name is required" });

    // MOCK MODE: If no valid key is present or we want to force mock for dev without cost
    if (!process.env.OPENAI_API_KEY) {
        console.log(`[AI-MOCK] Generating description for: ${productName}`);

        // Smart Templates based on keywords
        let desc = `Delicioso plato de ${productName}, preparado con ingredientes frescos y seleccionados.`;
        const p = productName.toLowerCase();

        if (p.includes('ceviche') || p.includes('marisco')) {
            desc = "Fresco y vibrante, marinado en limón sutil y ají limo, acompañado de camote glaseado y choclo tierno.";
        } else if (p.includes('pollo') || p.includes('brasa')) {
            desc = "Jugoso y dorado, sazonado con nuestra receta secreta de especias y cocido a la perfección.";
        } else if (p.includes('arroz') || p.includes('chaufa')) {
            desc = "Salteado al wok con fuego alto para ese sabor ahumado inconfundible, mezclado con trozos generosos de carne y verduras.";
        } else if (p.includes('lomo') || p.includes('saltado')) {
            desc = "Tradición peruana en su máxima expresión: trozos de carne flambeados al wok, cebolla crujiente y tomate fresco.";
        } else if (p.includes('sopa') || p.includes('caldo')) {
            desc = "Reconfortante y sustancioso, cocinado a fuego lento para concentrar todos los sabores caseros.";
        } else if (p.includes('bistec') || p.includes('carne')) {
            desc = "Corte premium a la parrilla, servido en su punto ideal para resaltar su terneza y sabor.";
        } else if (p.includes('cafe') || p.includes('mate')) {
            desc = "Aroma intenso y sabor equilibrado, perfecto para acompañar una buena conversación.";
        }

        return res.json({
            description: desc,
            mode: 'mock'
        });
    }

    // REAL AI MODE
    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Eres un experto gastronómico peruano. Redacta una descripción corta (máximo 2 líneas), apetitosa y elegante para el menú de un restaurante. Enfócate en sabor y tradición." },
                { role: "user", content: `Describe este plato: ${productName}` }
            ],
            model: "gpt-3.5-turbo",
        });

        res.json({
            description: completion.choices[0].message.content,
            mode: 'ai'
        });
    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({ error: "Error generating description" });
    }
});

// Image Upload
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Check if it's a user photo upload (via query param or field, but for simplicity we rely on where the consumer puts it or if we want separate endpoints)
    // Actually, Multer is configured to one destination. 
    // To support multiple destinations dynamically, we need to change storage config or move file.
    // Let's Simple Fix: Move file if 'type=user' query param is present.

    let filePath = `/uploads/productos/${req.file.filename}`;

    if (req.query.type === 'user') {
        const newPath = path.join(uploadUsersDir, req.file.filename);
        fs.moveSync(req.file.path, newPath);
        filePath = `/uploads/usuarios/${req.file.filename}`;
    }

    res.json({ url: filePath });
});


// 5. Orders (Comandas)
app.get('/api/orders', async (req, res) => {
    // For Kitchen: Fetch active orders
    const { status } = req.query;
    const where = status ? { estado: status } : { estado: { in: ['enviada', 'preparando', 'lista'] } };

    const orders = await prisma.comanda.findMany({
        where,
        include: {
            mesa: true,
            detalles: {
                include: {
                    plato: true,
                    cocinero: true // Include cook info
                }
            }
        },
        orderBy: { fecha: 'asc' }
    });
    res.json(orders);
});

// Kitchen Queue Endpoint (Item-based)
app.get('/api/kitchen/queue', async (req, res) => {
    const queue = await prisma.detalleComanda.findMany({
        where: {
            estado: { not: 'entregado' }, // Show everything not yet delivered
            comanda: { estado: { not: 'cerrada' } }, // Only active orders
            plato: {
                categoria: { enviarCocina: true } // FILTER: Only Kitchen Categories
            }
        },
        include: {
            plato: true,
            comanda: { include: { mesa: true } },
            cocinero: true
        },
        orderBy: { id: 'asc' } // FIFO
    });
    res.json(queue);
});

app.post('/api/orders', async (req, res) => {
    const { mesaId, usuarioId, detalles } = req.body; // detalles: [{ platoId, cantidad }]

    // Check if there is an active order for this table
    let order = await prisma.comanda.findFirst({
        where: { mesaId: parseInt(mesaId), estado: { not: 'cerrada' } }
    });

    if (!order) {
        order = await prisma.comanda.create({
            data: {
                mesaId: parseInt(mesaId),
                usuarioId: parseInt(usuarioId),
                estado: 'enviada',
                detalles: {
                    create: detalles.map(d => ({
                        platoId: d.platoId,
                        cantidad: d.cantidad,
                        estado: 'pendiente',
                        observacion: d.observacion || null
                    }))
                }
            },
            include: { detalles: true }
        });
        // Update table status
        await prisma.mesa.update({
            where: { id: parseInt(mesaId) },
            data: { estado: 'ocupada' }
        });
    } else {
        // Append to existing order
        for (const d of detalles) {
            // Check if same product is already 'pendiente' in this order
            // Only merge if there is no special observation
            let existingDetail = null;
            if (!d.observacion) {
                existingDetail = await prisma.detalleComanda.findFirst({
                    where: {
                        comandaId: order.id,
                        platoId: d.platoId,
                        estado: 'pendiente',
                        observacion: null // Only merge with non-observed items
                    }
                });
            }

            if (existingDetail) {
                await prisma.detalleComanda.update({
                    where: { id: existingDetail.id },
                    data: { cantidad: existingDetail.cantidad + d.cantidad }
                });
            } else {
                await prisma.detalleComanda.create({
                    data: {
                        comandaId: order.id,
                        platoId: d.platoId,
                        cantidad: d.cantidad,
                        estado: 'pendiente',
                        observacion: d.observacion || null
                    }
                });
            }
        }
    }

    res.json(order);
});

// Transfer Table Endpoint
app.post('/api/tables/transfer', async (req, res) => {
    const { fromTableId, toTableId } = req.body;

    try {
        const toTable = await prisma.mesa.findUnique({ where: { id: parseInt(toTableId) } });
        if (toTable.estado !== 'libre') {
            return res.status(400).json({ error: 'La mesa de destino debe estar libre.' });
        }

        // Find active comanda for source table
        const activeComanda = await prisma.comanda.findFirst({
            where: { mesaId: parseInt(fromTableId), estado: { in: ['pendiente', 'enviada', 'preparando', 'lista', 'entregada'] } } // Any active state
        });

        if (!activeComanda) {
            return res.status(400).json({ error: 'Mesa de origen sin pedido activo.' });
        }

        // Transaction: Update Comanda -> Update Old Table -> Update New Table
        await prisma.$transaction([
            prisma.comanda.update({
                where: { id: activeComanda.id },
                data: { mesaId: parseInt(toTableId) }
            }),
            prisma.mesa.update({
                where: { id: parseInt(fromTableId) },
                data: { estado: 'libre' }
            }),
            prisma.mesa.update({
                where: { id: parseInt(toTableId) },
                data: { estado: 'ocupada' }
            })
        ]);

        res.json({ message: 'Traslado exitoso' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const order = await prisma.comanda.update({
        where: { id: parseInt(id) },
        data: { estado }
    });
    res.json(order);
});

// Update specific order detail (Status or Quantity)
app.put('/api/orders/details/:id', async (req, res) => {
    const { id } = req.params;
    const { estado, cantidad, cocineroId } = req.body;

    // Prepare data object dynamically
    const data = {};
    if (estado) {
        data.estado = estado;
        // Timestamp Logic
        if (estado === 'preparando') data.fechaPreparacion = new Date();
        if (estado === 'listo') data.fechaListo = new Date();
    }
    if (cantidad) data.cantidad = parseInt(cantidad);
    if (cocineroId) data.cocineroId = parseInt(cocineroId);

    try {
        const detail = await prisma.detalleComanda.update({
            where: { id: parseInt(id) },
            data,
            include: { cocinero: true } // Return cook info
        });
        res.json(detail);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Staff Stats Endpoint
app.get('/api/staff/stats', async (req, res) => {
    try {
        // 1. Waiters Stats (Users with 'comandas')
        // We group by usuarioId in Comanda
        const waiters = await prisma.user.findMany({
            where: { rol: 'mozo' },
            include: {
                comandas: {
                    where: { estado: 'cerrada' },
                    include: { detalles: { include: { plato: true } } }
                }
            }
        });

        const waiterStats = waiters.map(w => {
            const totalTables = w.comandas.length;
            const totalSales = w.comandas.reduce((acc, order) => {
                const orderTotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                return acc + orderTotal;
            }, 0);

            return {
                id: w.id,
                nombre: w.nombre,
                rol: w.rol,
                totalTables,
                totalSales
            };
        });

        // 2. Kitchen Stats (Users with 'detallesCocina')
        const cooks = await prisma.user.findMany({
            where: { rol: 'cocina' },
            include: {
                detallesCocina: {
                    where: { estado: 'listo' } // or 'entregado'
                }
            }
        });

        const cookStats = cooks.map(c => {
            const totalDishes = c.detallesCocina.length;

            // Calculate Avg Time (min)
            let totalTimeMs = 0;
            let countTime = 0;

            c.detallesCocina.forEach(d => {
                if (d.fechaPreparacion && d.fechaListo) {
                    const start = new Date(d.fechaPreparacion);
                    const end = new Date(d.fechaListo);
                    const diff = end - start;
                    if (diff > 0) {
                        totalTimeMs += diff;
                        countTime++;
                    }
                }
            });

            const avgTimeMin = countTime > 0 ? (totalTimeMs / countTime / 60000) : 0;

            return {
                id: c.id,
                nombre: c.nombre,
                rol: c.rol,
                totalDishes,
                avgTimeMin
            };
        });

        res.json({ waiters: waiterStats, cooks: cookStats });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error fetching staff stats" });
    }
});

// Delete specific order detail
app.delete('/api/orders/details/:id', async (req, res) => {
    const { id } = req.params;
    await prisma.detalleComanda.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Item deleted" });
});

// Deprecated specific route, keeping for backward compat if needed (aliasing to generic PUT)
app.put('/api/orders/details/:id/status', async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const detail = await prisma.detalleComanda.update({
        where: { id: parseInt(id) },
        data: { estado }
    });
    res.json(detail);
});

// 6. Checkout (Updated)
// 6. Checkout (Updated)
app.post('/api/checkout/:mesaId', async (req, res) => {
    const { mesaId } = req.params;
    const { paymentMethod, docType, totalReceived, tip, observation, email } = req.body;

    try {
        const order = await prisma.comanda.findFirst({
            where: { mesaId: parseInt(mesaId), estado: { not: 'cerrada' } },
            include: { detalles: { include: { plato: true } } }
        });

        if (!order) return res.status(404).json({ error: "No active order" });

        // Calculate total
        const total = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);

        // Close order with payment details
        const closedOrder = await prisma.comanda.update({
            where: { id: order.id },
            data: {
                estado: 'cerrada',
                metodoPago: paymentMethod || 'efectivo',
                tipoDocumento: docType || 'sin_comprobante',
                montoRecibido: parseFloat(totalReceived || 0),
                propina: parseFloat(tip || 0),
                observacion: observation || null,
                emailCliente: email || null
            }
        });

        // Free table
        await prisma.mesa.update({
            where: { id: parseInt(mesaId) },
            data: { estado: 'libre' }
        });

        res.json({ ...closedOrder, total, message: "Ticket generated" });
    } catch (error) {
        console.error("Error finalizing payment:", error);
        res.status(500).json({ error: "Error al registrar pago: " + error.message });
    }
});

// 7. Cashier Arqueo Routes
// 7. Cashier Arqueo Routes (REAL IMPLEMENTATION)
app.get('/api/cashier/balance', async (req, res) => {
    try {
        // Find the LATEST Arqueo
        const lastArqueo = await prisma.arqueo.findFirst({
            orderBy: { id: 'desc' }
        });

        // Default state if no history exists
        let currentArqueo = lastArqueo;
        if (!currentArqueo) {
            // If absolutely no history, we can return a "Closed" state ready to open
            return res.json({
                estado: 'cerrado',
                inicio: 0,
                egresos: 0,
                ingresos: { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0 },
                totalCaja: 0,
                totalBruto: 0,
                totalPendiente: 0,
                ventas: []
            });
        }

        // Determine Time Range
        // If OPEN: From fechaInicio to NOW
        // If CLOSED: From fechaInicio to fechaFin
        const startDate = currentArqueo.fechaInicio;
        const endDate = currentArqueo.estado === 'abierto' ? new Date() : currentArqueo.fechaFin;

        // Fetch Sales within this range
        const sales = await prisma.comanda.findMany({
            where: {
                estado: 'cerrada',
                fecha: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: { detalles: { include: { plato: true } } }
        });

        // Calculate Totals
        let totalBruto = 0;
        let incomeDetails = {
            efectivo: 0,
            tarjeta: 0,
            yape: 0,
            izipay: 0
        };

        sales.forEach(order => {
            const orderTotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0) + (order.propina || 0);
            totalBruto += orderTotal;

            const method = order.metodoPago?.toLowerCase() || 'efectivo';

            if (method.includes('izipay')) incomeDetails.izipay += orderTotal;
            else if (method.includes('yape') || method.includes('plin')) incomeDetails.yape += orderTotal;
            else if (method.includes('tarjeta')) incomeDetails.tarjeta += orderTotal;
            else if (incomeDetails[method] !== undefined) incomeDetails[method] += orderTotal;
            else incomeDetails.efectivo += orderTotal;
        });

        // Calculate Locked/Pending Amounts (Only relevant if Open, but let's calculate anyway for info)
        const openOrders = await prisma.comanda.findMany({
            where: { estado: { not: 'cerrada' } },
            include: { detalles: { include: { plato: true } } }
        });

        const totalPendiente = openOrders.reduce((acc, order) => {
            return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
        }, 0);

        const inicio = currentArqueo.montoInicial;
        const egresos = 0.00; // Future feature
        const totalCaja = inicio + incomeDetails.efectivo - egresos;

        const ventasDetalladas = sales.map(order => ({
            id: order.id,
            hora: order.fecha,
            items: order.detalles.map(d => ({
                cantidad: d.cantidad,
                descripcion: d.plato.nombre,
                precio: d.plato.precio,
                total: d.cantidad * d.plato.precio
            })),
            total: order.detalles.reduce((s, d) => s + (d.cantidad * d.plato.precio), 0),
            metodo: order.metodoPago,
            doc: order.tipoDocumento
        }));

        res.json({
            id: currentArqueo.id,
            estado: currentArqueo.estado,
            fechaInicio: currentArqueo.fechaInicio,
            fechaFin: currentArqueo.fechaFin,
            inicio,
            egresos,
            ingresos: incomeDetails,
            totalCaja,
            totalBruto,
            totalPendiente,
            ventas: ventasDetalladas
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error fetching balance" });
    }
});

// 8. Critical Reset (Simulation Mode)
app.delete('/api/admin/reset-simulation', async (req, res) => {
    try {
        console.log("EXECUTING HARD RESET...");

        // 1. Wipe Transactional Data
        await prisma.detalleComanda.deleteMany({});
        await prisma.comanda.deleteMany({});
        await prisma.arqueo.deleteMany({});

        // 2. Wipe Ghost Items (Physical Delete of Soft Deleted or specific categories)
        // Delete Products first
        await prisma.plato.deleteMany({
            where: {
                OR: [
                    { deleted: true },
                    { categoria: { nombre: { in: ['Desayunos', 'Desayuno'] } } }
                ]
            }
        });
        // Delete Categories
        await prisma.categoria.deleteMany({
            where: {
                OR: [
                    { deleted: true },
                    { nombre: { in: ['Desayunos', 'Desayuno'] } }
                ]
            }
        });

        // 3. Reset SQLite Sequences (IDs)
        // Note: For SQLite, we delete from sqlite_sequence
        await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name IN ('DetalleComanda', 'Comanda', 'Arqueo');`);

        // 4. Reset Tables Status
        await prisma.mesa.updateMany({ data: { estado: 'libre' } });

        console.log("HARD RESET COMPLETE.");
        res.json({ message: "Historial eliminado y contadores reiniciados." });
    } catch (e) {
        console.error("Reset Failed:", e);
        res.status(500).json({ error: "Error en el reseteo: " + e.message });
    }
});

// Toggle Shift (Open/Close)
app.post('/api/cashier/toggle', async (req, res) => {
    try {
        const lastArqueo = await prisma.arqueo.findFirst({ orderBy: { id: 'desc' } });
        const currentState = lastArqueo?.estado || 'cerrado';

        if (currentState === 'cerrado') {
            // OPEN NEW SHIFT
            const newArqueo = await prisma.arqueo.create({
                data: {
                    montoInicial: req.body.montoInicial || 0, // Allow passing start amount
                    usuarioId: 1, // Placeholder
                    estado: 'abierto',
                    fechaInicio: new Date()
                }
            });
            return res.json({ message: "Caja Abierta", arqueo: newArqueo });
        } else {
            // CLOSE EXISTING SHIFT
            // 1. Validate Pending Orders
            const pendingOrdersCount = await prisma.comanda.count({
                where: { estado: { not: 'cerrada' } }
            });

            if (pendingOrdersCount > 0) {
                return res.status(400).json({
                    error: "No se puede cerrar caja: Hay mesas con pagos pendientes.",
                    pendingCount: pendingOrdersCount
                });
            }

            // 2. Close it
            const closedArqueo = await prisma.arqueo.update({
                where: { id: lastArqueo.id },
                data: {
                    estado: 'cerrado',
                    fechaFin: new Date(),
                    // We could update final amounts here too if we want to freeze them
                }
            });
            return res.json({ message: "Caja Cerrada", arqueo: closedArqueo });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// History Endpoint (Paginated & Filtered)
app.get('/api/cashier/history', async (req, res) => {
    try {
        const { date, page = 1, limit = 5 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        // Filter Logic
        let where = {};
        if (date) {
            // Fix: Construct range in Peru Time (UTC-5)
            // Input date is YYYY-MM-DD
            // We want 00:00:00 Peru Time to 23:59:59 Peru Time
            // 00:00 Peru = 05:00 UTC

            const startStr = `${date}T00:00:00.000-05:00`;
            const endStr = `${date}T23:59:59.999-05:00`;

            const startDate = new Date(startStr);
            const endDate = new Date(endStr);

            where.fechaInicio = {
                gte: startDate,
                lte: endDate
            };
        }

        const totalCount = await prisma.arqueo.count({ where });
        const arqueos = await prisma.arqueo.findMany({
            where,
            orderBy: { fechaInicio: 'desc' }, // Descending
            skip,
            take
        });

        // Calculate Stats for EACH Arqueo
        const historyData = await Promise.all(arqueos.map(async (arq) => {
            const startDate = arq.fechaInicio;
            const endDate = arq.estado === 'abierto' ? new Date() : arq.fechaFin;

            const sales = await prisma.comanda.findMany({
                where: {
                    estado: 'cerrada',
                    fecha: { gte: startDate, lte: endDate }
                },
                include: { detalles: { include: { plato: true } } }
            });

            let totalBruto = 0;
            let incomeDetails = { efectivo: 0, tarjeta: 0, yape: 0, izipay: 0 };

            sales.forEach(order => {
                const orderTotal = order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0) + (order.propina || 0);
                totalBruto += orderTotal;
                const method = order.metodoPago?.toLowerCase() || 'efectivo';

                if (method.includes('izipay')) incomeDetails.izipay += orderTotal;
                else if (method.includes('yape') || method.includes('plin')) incomeDetails.yape += orderTotal;
                else if (method.includes('tarjeta')) incomeDetails.tarjeta += orderTotal;
                else if (incomeDetails[method] !== undefined) incomeDetails[method] += orderTotal;
                else incomeDetails.efectivo += orderTotal;
            });

            // Pending (only relevant if open, but can calculate snapshot if needed)
            let totalPendiente = 0;
            if (arq.estado === 'abierto') {
                const openOrders = await prisma.comanda.findMany({
                    where: { estado: { not: 'cerrada' } },
                    include: { detalles: { include: { plato: true } } }
                });
                totalPendiente = openOrders.reduce((acc, order) => {
                    return acc + order.detalles.reduce((sum, d) => sum + (d.plato.precio * d.cantidad), 0);
                }, 0);
            }

            const totalCaja = arq.montoInicial + incomeDetails.efectivo; // - egresos

            return {
                id: arq.id,
                fechaInicio: arq.fechaInicio,
                fechaFin: arq.fechaFin,
                estado: arq.estado,
                inicio: arq.montoInicial,
                egresos: 0, // Mock
                ingresos: incomeDetails,
                totalCaja,
                totalBruto,
                totalPendiente
            };
        }));

        res.json({
            data: historyData,
            meta: {
                total: totalCount,
                page: parseInt(page),
                totalPages: Math.ceil(totalCount / take)
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Error fetching history" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
