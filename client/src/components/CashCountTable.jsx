import React, { useEffect, useState } from 'react';
import { MoreVertical, FileText, X, AlertCircle, Trash, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CashCountTable = ({ onStatusChange }) => {
    // State for Global Status (Header Button)
    const [currentStatus, setCurrentStatus] = useState(null);

    // State for History Table
    const [history, setHistory] = useState({ data: [], meta: { page: 1, totalPages: 1 } });
    const [filterDate, setFilterDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // UI State
    const [menuOpen, setMenuOpen] = useState(false);
    const [paloteoOpen, setPaloteoOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // 1. Fetch Current Status
    const fetchStatus = () => {
        fetch('/api/cashier/balance')
            .then(res => res.json())
            .then(data => {
                setCurrentStatus(data);
                if (onStatusChange) onStatusChange(data.estado);
            })
            .catch(err => console.error("Error fetching status:", err));
    };

    // 2. Fetch History
    const fetchHistory = (page = 1, date = '') => {
        let url = `/api/cashier/history?page=${page}&limit=5`;
        if (date) url += `&date=${date}`;

        fetch(url)
            .then(res => res.json())
            .then(data => setHistory(data))
            .catch(err => console.error("Error fetching history:", err));
    };

    useEffect(() => {
        fetchStatus();
        fetchHistory(currentPage, filterDate);

        const interval = setInterval(() => {
            fetchStatus();
        }, 10000);

        return () => clearInterval(interval);
    }, [currentPage, filterDate]);

    // Handle Shift Toggle
    const handleToggleShift = () => {
        if (!currentStatus) return;

        if (currentStatus.estado === 'abierto') {
            if (!window.confirm("¿Estás seguro de cerrar caja? Asegúrate de que no haya cuentas pendientes.")) return;
        }

        const montoInicial = currentStatus.estado === 'cerrado' ? parseFloat(prompt("Ingrese monto inicial:", "0.00") || 0) : 0;

        fetch('/api/cashier/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ montoInicial })
        })
            .then(async res => {
                const body = await res.json();
                if (!res.ok) throw new Error(body.error || "Error al cambiar estado");
                return body;
            })
            .then(() => {
                fetchStatus();
                fetchHistory(1, filterDate);
            })
            .catch(err => alert(err.message));
    };

    // Date Formatter
    const formatDate = (dateString, includeTime = true) => {
        if (!dateString) return "--:--";
        const d = new Date(dateString);
        return d.toLocaleString('es-PE', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            ...(includeTime ? { hour: '2-digit', minute: '2-digit', second: '2-digit' } : {}),
            hour12: false
        }).replace(',', '');
    };

    // PDF GENERATION LOGIC
    const generatePDF = async () => {
        // Determine what to print. 
        // If "currentStatus" is active, prioritize that? 
        // Or if the user wants a report for a specific filtered day?
        // REQUIREMENT: "Arqueo de Caja". Usually means the current closing report.
        // We'll use 'currentStatus' (which contains all info for the latest/active session).

        if (!currentStatus) return;
        setIsGenerating(true);

        try {
            // Fetch fresh details just in case (optional, but using currentStatus should suffice if it has 'ventas')
            // Actually, currentStatus from /api/cashier/balance ALREADY has 'ventas' with simple structure.
            // But we need 'Mozo' which might be missing in the simple 'ventas' map in backend (let's check).
            // The backend update I just did was for /api/cashier/arqueo/:id.
            // Let's use THAT to be safe and get specific full details including Waiter.

            const targetId = currentStatus.id;
            const res = await fetch(`/api/cashier/arqueo/${targetId}`);
            const fullData = await res.json();

            const doc = new jsPDF();

            // HEADER
            doc.setFontSize(18);
            doc.text("ComandaGo - Arqueo de Caja", 14, 20);

            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Fecha: ${formatDate(new Date())}`, 14, 28);
            doc.text(`Estado: ${fullData.estado.toUpperCase()}`, 14, 34);

            // SUMMARY SECTION
            const startY = 45;
            doc.setFillColor(240, 240, 240);
            doc.rect(14, startY, 180, 25, 'F');

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text("Resumen Financiero", 18, startY + 8);

            doc.setFontSize(10);
            doc.text(`Total Ventas: S/. ${fullData.totalBruto?.toFixed(2) || '0.00'}`, 18, startY + 18);
            doc.text(`Efectivo: S/. ${(fullData.ingresos?.efectivo || 0).toFixed(2)}`, 80, startY + 18);
            doc.text(`Tarjetas: S/. ${(fullData.ingresos?.tarjeta || 0).toFixed(2)}`, 130, startY + 18);
            doc.text(`Egresos: S/. ${(fullData.egresos || 0).toFixed(2)}`, 18, startY + 28); // If added later

            // DETAILS TABLE
            const tableRows = fullData.ventas?.map(v => [
                formatDate(v.hora, true).split(' ')[1], // Time only
                v.items.map(i => `${i.cantidad}x ${i.descripcion}`).join(', '), // Order summary
                v.mozo || 'General',
                v.metodo || 'Efectivo',
                `S/. ${v.total.toFixed(2)}`
            ]) || [];

            autoTable(doc, {
                startY: startY + 35,
                head: [['Hora', 'Pedido', 'Mozo', 'Método', 'Monto']],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [40, 40, 40], textColor: 255 },
                styles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 80 },
                    4: { halign: 'right' }
                }
            });

            // Save
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`Arqueo_Caja_${dateStr}.pdf`);

        } catch (e) {
            console.error(e);
            alert("Error generando PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    // Paloteo Modal
    const PaloteoModal = () => {
        if (!paloteoOpen || !currentStatus) return null;
        const data = currentStatus;
        const productCounts = {};
        if (data.ventas) {
            data.ventas.forEach(v => {
                v.items.forEach(item => {
                    productCounts[item.descripcion] = (productCounts[item.descripcion] || 0) + item.cantidad;
                });
            });
        }

        return (
            <div className="modal-overlay" onClick={() => setPaloteoOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                    <div className="modal-header">
                        <h2>Resumen Actual</h2>
                        <button className="glass-button" onClick={() => setPaloteoOpen(false)}><X size={18} /></button>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ textAlign: 'left' }}>
                                    <th>Producto</th>
                                    <th style={{ textAlign: 'center' }}>Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(productCounts).length === 0 ? (
                                    <tr><td colSpan="2" className="text-center text-muted">No hay ventas registradas</td></tr>
                                ) : (
                                    Object.entries(productCounts).map(([name, count]) => (
                                        <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '8px 0' }}>{name}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="glass-panel" style={{ padding: 20, marginBottom: 20, overflow: 'visible' }}>

            {/* Header: Title + Toggle Button + Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <h2 style={{ margin: 0 }}>Arqueo de Caja</h2>
                    {currentStatus && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={handleToggleShift}
                                style={{
                                    backgroundColor: currentStatus.estado === 'abierto' ? '#28a745' : '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '5px 15px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.9em',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}
                            >
                                {currentStatus.estado === 'abierto' ? 'OPEN' : 'CLOSED'}
                            </button>

                            {/* Reset Button */}
                            <button
                                onClick={async () => {
                                    if (!window.confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto eliminará TODO el historial de ventas y reiniciará los contadores a 1.\n\nÚsalo solo para limpiar datos de prueba.")) return;

                                    try {
                                        const res = await fetch('/api/admin/reset-simulation', { method: 'DELETE' });
                                        if (res.ok) {
                                            alert("Simulación reiniciada correctamente.");
                                            fetchStatus();
                                            fetchHistory(1, filterDate);
                                        } else {
                                            const err = await res.json();
                                            alert("Error: " + err.error);
                                        }
                                    } catch (e) {
                                        alert("Error de conexión");
                                    }
                                }}
                                className="glass-button"
                                style={{
                                    borderColor: '#dc3545',
                                    color: '#dc3545',
                                    padding: '5px 10px'
                                }}
                                title="Limpiar Historial de Simulación"
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Trash size={14} /> Limpiar
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* PDF DOWNLOAD BUTTON */}
                    <button
                        className="glass-button"
                        onClick={generatePDF}
                        disabled={isGenerating}
                        title="Descargar Reporte Actual"
                        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                        <Download size={18} />
                        {isGenerating ? '...' : ''}
                    </button>

                    <input
                        type="date"
                        className="glass-input"
                        style={{ padding: '5px 10px', width: 'auto' }}
                        value={filterDate}
                        onChange={(e) => {
                            setFilterDate(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                    <button className="glass-button" onClick={() => fetchHistory(currentPage, filterDate)}>Refrescar</button>


                    <div style={{ position: 'relative' }}>
                        <button className="glass-button icon" onClick={() => setMenuOpen(!menuOpen)}>
                            <MoreVertical size={18} />
                        </button>
                        {menuOpen && (
                            <div className="glass-panel" style={{
                                position: 'absolute', right: 0, top: 40, width: 220, zIndex: 100,
                                display: 'flex', flexDirection: 'column', gap: 5, padding: 10,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.3)', background: 'rgba(30, 30, 30, 0.95)'
                            }}>
                                <button className="glass-button" style={{ justifyContent: 'flex-start', border: 'none' }} onClick={() => { setPaloteoOpen(true); setMenuOpen(false); }}>
                                    Resumen / Paloteo (Actual)
                                </button>
                                <button className="glass-button" style={{ justifyContent: 'flex-start', border: 'none' }} onClick={generatePDF}>
                                    Exportar PDF
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table: History List */}
            <div className="table-responsive" style={{ minHeight: 150 }}>
                <table style={{ width: '100%', minWidth: 900 }}>
                    <thead>
                        <tr>
                            <th>N</th>
                            <th>Fecha</th>
                            <th>Inicio</th>
                            <th>Egreso</th>
                            <th>Ingreso (Detalle)</th>
                            <th>Total en Caja</th>
                            <th>Total en Bruto</th>
                            <th>Pendiente</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.data.length === 0 ? (
                            <tr><td colSpan="8" className="text-center text-muted">No se encontraron registros.</td></tr>
                        ) : (
                            history.data.map(item => (
                                <tr key={item.id} style={{ opacity: item.estado === 'cerrado' ? 0.8 : 1 }}>
                                    <td>{item.id}</td>
                                    <td>
                                        <div style={{ fontWeight: 'bold', color: item.estado === 'abierto' ? '#28a745' : 'var(--text-main)' }}>
                                            Inicio: {formatDate(item.fechaInicio)}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.9em' }}>
                                            Cierre: {item.estado === 'cerrado' ? formatDate(item.fechaFin) : (
                                                <span style={{ color: '#28a745', fontWeight: 'bold' }}>EN CURSO</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>S/. {item.inicio.toFixed(2)}</td>
                                    <td>
                                        <div>Efec: S/. {item.egresos.toFixed(2)}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 10px', fontSize: '0.85em' }}>
                                            <span>Efec: {item.ingresos.efectivo.toFixed(2)}</span>
                                            <span>Tarj: {item.ingresos.tarjeta.toFixed(2)}</span>
                                            <span>Yape: {item.ingresos.yape.toFixed(2)}</span>
                                            <span>Izi: {item.ingresos.izipay.toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 'bold', color: 'var(--success)' }}>S/. {item.totalCaja.toFixed(2)}</td>
                                    <td style={{ fontWeight: 'bold' }}>S/. {item.totalBruto.toFixed(2)}</td>
                                    <td style={{ color: 'var(--warning)' }}>S/. {item.totalPendiente.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {history.meta.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 15 }}>
                    <button
                        className="glass-button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                        Anterior
                    </button>
                    <span style={{ alignSelf: 'center' }}>
                        Página {currentPage} de {history.meta.totalPages}
                    </span>
                    <button
                        className="glass-button"
                        disabled={currentPage === history.meta.totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, history.meta.totalPages))}
                    >
                        Siguiente
                    </button>
                </div>
            )}

            <PaloteoModal />
        </div>
    );
};

export default CashCountTable;
