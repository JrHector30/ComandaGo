-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Mesa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'libre'
);

-- CreateTable
CREATE TABLE "Plato" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT,
    "precio" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mesaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    CONSTRAINT "Comanda_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Comanda_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetalleComanda" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comandaId" INTEGER NOT NULL,
    "platoId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    CONSTRAINT "DetalleComanda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleComanda_platoId_fkey" FOREIGN KEY ("platoId") REFERENCES "Plato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_numero_key" ON "Mesa"("numero");

