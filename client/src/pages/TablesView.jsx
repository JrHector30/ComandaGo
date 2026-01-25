import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Calculator, X, Minus, Trash2, ArrowRightLeft, Printer } from 'lucide-react';
import { numberToLetters } from '../utils/formatters';

const TablesView = () => {
    const [tables, setTables] = useState([]);
    const [selectedTableId, setSelectedTableId] = useState(null);
    const [modalType, setModalType] = useState(null); // 'view' | 'pre-check'
    const [showTransferMode, setShowTransferMode] = useState(false); // New state
    const [showTicket, setShowTicket] = useState(false); // Ticket modal state
    const navigate = useNavigate();

    // Data fetching function
    const fetchTables = () => {
        fetch('/api/tables')
            .then(res => res.json())
            .then(data => {
                setTables(data);
            });
    };

    useEffect(() => {
        fetchTables();
        const interval = setInterval(fetchTables, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'libre': return 'var(--success)';
            case 'ocupada': return 'var(--warning)';
            default: return 'var(--text-muted)';
        }
    };

    const handleOpenModal = (e, table, type) => {
        e.stopPropagation();
        setSelectedTableId(table.id);
        setModalType(type);
        setShowTransferMode(false); // Reset
    };

    const closeModal = () => {
        setSelectedTableId(null);
        setModalType(null);
        setShowTransferMode(false);
    };

    // --- Helper Functions for API ---
    const handleTransfer = async (targetTableId) => {
        if (!confirm(`¿Trasladar pedido a la Mesa ${targetTableId}?`)) return; // ID is mostly internal, but useful for debug. Ideally use number.

        try {
            const res = await fetch('/api/tables/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromTableId: selectedTableId, toTableId: targetTableId })
            });

            if (res.ok) {
                alert('Mesa trasladada con éxito');
                closeModal();
                fetchTables();
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    };

    const updateQuantity = async (detailId, currentQty, delta) => {
        // ... (existing update logic)
        const newQty = currentQty + delta;
        try {
            if (newQty <= 0) {
                if (confirm('¿Eliminar este item del pedido?')) {
                    await fetch(`/api/orders/details/${detailId}`, { method: 'DELETE' });
                }
            } else {
                await fetch(`/api/orders/details/${detailId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cantidad: newQty })
                });
            }
            fetchTables();
        } catch (error) { console.error(error); }
    };

    const deleteItem = async (detailId) => {
        if (!confirm('¿Eliminar este item definitivamente?')) return;
        try {
            await fetch(`/api/orders/details/${detailId}`, { method: 'DELETE' });
            fetchTables();
        } catch (error) { console.error(error); }
    };

    const markAsDelivered = async (detailId) => {
        try {
            await fetch(`/api/orders/details/${detailId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: 'entregado' })
            });
            fetchTables();
        } catch (error) { console.error(error); }
    };

    const getItemStatusBadge = (status) => {
        const styles = {
            pendiente: { bg: 'var(--danger)', color: '#ffffff', icon: '🕑' },
            enviada: { bg: 'rgba(0, 0, 255, 0.2)', color: '#4dabf7', icon: '🔵' },
            preparando: { bg: 'var(--warning)', color: '#ffffff', icon: '🟠' },
            lista: { bg: '#88f798', color: '#ffffff', icon: '☑️' },
            listo: { bg: '#88f798', color: '#ffffff', icon: '☑️' },
            entregado: { bg: 'rgba(255, 255, 255, 0.1)', color: '#888', icon: '✅' }
        };
        const s = styles[status] || styles['pendiente'];
        return (
            <span style={{
                background: s.bg, color: s.color,
                padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontWeight: 500
            }}>
                {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // --- GROUPING LOGIC ---
    const getGroupedDetails = () => {
        const selectedTable = tables.find(t => t.id === selectedTableId);
        if (!selectedTable || !selectedTable.comandas?.[0]) return [];
        const rawDetalles = selectedTable.comandas[0].detalles || [];
        const grouped = [];
        rawDetalles.forEach(detail => {
            const cookName = detail.cocinero?.nombre || '';
            const key = modalType === 'pre-check'
                ? `${detail.platoId}-${detail.observacion || ''}`
                : `${detail.platoId}-${detail.estado}-${detail.observacion || ''}-${cookName}`;
            const existing = grouped.find(g => g.key === key);
            if (existing) {
                existing.cantidad += detail.cantidad;
                existing.detailIds.push(detail.id);
            } else {
                grouped.push({
                    key, platoId: detail.platoId, nombre: detail.plato.nombre,
                    precio: detail.plato.precio, estado: detail.estado, cantidad: detail.cantidad,
                    detailIds: [detail.id],
                    observacion: detail.observacion,
                    cocineroNombre: cookName
                });
            }
        });
        return grouped;
    };

    const calculateTotal = (groupedItems) => {
        return groupedItems.reduce((sum, item) => sum + (item.cantidad * item.precio), 0);
    };

    const renderModalContent = () => {
        const selectedTable = tables.find(t => t.id === selectedTableId);
        if (!selectedTable || !modalType) return null;

        const groupedItems = getGroupedDetails();
        const freeTables = tables.filter(t => t.estado === 'libre');

        return (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h2>{modalType === 'pre-check' ? 'Pre-cuenta' : 'Pedido Activo'}</h2>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                                Mesa {selectedTable.numero} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {modalType === 'view' && (
                                <button
                                    className={`glass-button ${showTransferMode ? 'active' : ''}`}
                                    onClick={() => setShowTransferMode(!showTransferMode)}
                                    title="Trasladar mesa"
                                >
                                    <ArrowRightLeft size={20} />
                                </button>
                            )}
                            <button className="glass-button" style={{ padding: 5 }} onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="modal-body">
                        {showTransferMode ? (
                            <div style={{ textAlign: 'center' }}>
                                <h3>Selecciona la mesa de destino:</h3>
                                <p className="text-muted" style={{ marginBottom: 20 }}>El pedido actual se moverá a la mesa seleccionada.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
                                    {freeTables.map(t => (
                                        <button
                                            key={t.id}
                                            className="glass-button"
                                            style={{
                                                border: '1px solid var(--success)', color: 'var(--success)',
                                                height: 60, fontSize: '1.2rem', fontWeight: 'bold'
                                            }}
                                            onClick={() => handleTransfer(t.id)}
                                        >
                                            {t.numero}
                                        </button>
                                    ))}
                                    {freeTables.length === 0 && <p>No hay mesas libres.</p>}
                                </div>
                            </div>
                        ) : (
                            groupedItems.length === 0 ? (
                                <p className="text-muted">No hay items en el pedido.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                            <th style={{ padding: 10 }}>Cant.</th>
                                            <th style={{ padding: 10 }}>Producto</th>
                                            {modalType === 'pre-check' ? (
                                                <>
                                                    <th style={{ padding: 10, textAlign: 'right' }}>Precio</th>
                                                    <th style={{ padding: 10, textAlign: 'right' }}>Subtotal</th>
                                                </>
                                            ) : (
                                                <th style={{ padding: 10 }}>Estado</th>
                                            )}
                                            <th style={{ padding: 10, textAlign: 'center' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupedItems.map((item) => (
                                            <tr key={item.key} style={{ borderBottom: '1px solid var(--table-row-border)' }}>
                                                <td style={{ padding: 10 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        {modalType === 'view' ? (
                                                            <>
                                                                <button className="glass-button" style={{ width: 20, height: 20, padding: 0, borderRadius: '50%' }} onClick={() => updateQuantity(item.detailIds[0], item.cantidad, -1)}>
                                                                    <Minus size={12} />
                                                                </button>
                                                                <span style={{ fontWeight: 'bold' }}>{item.cantidad}</span>
                                                                <button className="glass-button" style={{ width: 20, height: 20, padding: 0, borderRadius: '50%' }} onClick={() => updateQuantity(item.detailIds[0], item.cantidad, 1)}>
                                                                    <Plus size={12} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span style={{ fontWeight: 'bold' }}>{item.cantidad}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: 10 }}>
                                                    <div>{item.nombre}</div>
                                                    {item.observacion && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--warning)', marginTop: 2 }}>
                                                            ⚠️ {item.observacion}
                                                        </div>
                                                    )}
                                                    {item.cocineroNombre && (
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                                            👨‍🍳 {item.cocineroNombre}
                                                        </div>
                                                    )}
                                                </td>
                                                {modalType === 'pre-check' && (
                                                    <>
                                                        <td style={{ padding: 10, textAlign: 'right' }}>S/. {item.precio.toFixed(2)}</td>
                                                        <td style={{ padding: 10, textAlign: 'right' }}>S/. {(item.cantidad * item.precio).toFixed(2)}</td>
                                                    </>
                                                )}
                                                {modalType === 'view' && (
                                                    <td style={{ padding: 10 }}>
                                                        {getItemStatusBadge(item.estado)}
                                                    </td>
                                                )}
                                                <td style={{ padding: 10, textAlign: 'center' }}>
                                                    {modalType === 'view' && (
                                                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                                                            {item.estado === 'lista' ? (
                                                                <button
                                                                    className="glass-button primary"
                                                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                                    onClick={() => { item.detailIds.forEach(id => markAsDelivered(id)); }}
                                                                >
                                                                    Entregar
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="glass-button"
                                                                    style={{ color: 'var(--danger)', padding: 5, borderColor: 'transparent' }}
                                                                    onClick={() => deleteItem(item.detailIds[0])}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {modalType === 'pre-check' && <span className="text-muted">-</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}
                    </div>

                    {!showTransferMode && (
                        <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            {modalType === 'pre-check' ? (
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    Total: S/. {calculateTotal(groupedItems).toFixed(2)}
                                </div>
                            ) : <div></div>}
                            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                                <button className="glass-button" onClick={closeModal}>Cerrar</button>
                                {modalType === 'pre-check' && (
                                    <button className="glass-button primary" onClick={() => setShowTicket(true)}>
                                        Imprimir 🧾
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTicket = () => {
        if (!showTicket || !selectedTableId) return null;

        const selectedTable = tables.find(t => t.id === selectedTableId);
        const groupedItems = getGroupedDetails();
        const total = calculateTotal(groupedItems);
        const totalLetras = numberToLetters(total);
        const comandaId = selectedTable.comandas?.[0]?.id || "---";

        return (
            <div className="modal-overlay" onClick={() => setShowTicket(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', color: 'black', width: 350, fontFamily: '"Courier New", monospace', padding: 20 }}>
                    <div style={{ textAlign: 'center', marginBottom: 15, borderBottom: '1px dashed black', paddingBottom: 10 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>COMANDAGO</div>
                        <div>DEMO</div>
                        <div style={{ fontSize: '0.8rem' }}>Telf: 519123456789 / RUC: 10000000000</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 5 }}>Fecha: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>PRECUENTA</div>

                    <div style={{ fontSize: '0.9rem', marginBottom: 10 }}>
                        <div>Ambiente: Salon Principal</div>
                        <div>Mesa: {selectedTable.numero}</div>
                        <div>Mozo: {selectedTable.comandas?.[0]?.usuarioId || 'General'}</div>
                        <div>Pedido #: {comandaId}</div>
                    </div>

                    <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>
                    <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        <span style={{ width: 30 }}>Cant</span>
                        <span style={{ flex: 1 }}>Producto</span>
                        <span style={{ width: 60, textAlign: 'right' }}>Total</span>
                    </div>
                    <div style={{ borderBottom: '1px dashed black', marginBottom: 5 }}></div>

                    <div style={{ marginBottom: 15 }}>
                        {groupedItems.map(item => (
                            <div key={item.key} style={{ display: 'flex', fontSize: '0.9rem', marginBottom: 2 }}>
                                <span style={{ width: 30 }}>{item.cantidad}</span>
                                <span style={{ flex: 1 }}>{item.nombre}</span>
                                <span style={{ width: 60, textAlign: 'right' }}>S/ {(item.precio * item.cantidad).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ borderTop: '1px dashed black', paddingTop: 10, textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem' }}>
                        Total: S/ {total.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: 5, textAlign: 'right' }}>
                        Son: {totalLetras}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.8rem', borderTop: '1px dashed black', paddingTop: 10 }}>
                        <div>PRECUENTA</div>
                        <div>Generado por el sistema ComandaGo</div>
                        <div>Este documento no posee ningún valor fiscal!</div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
                        <button className="glass-button primary" onClick={() => window.print()} style={{ background: 'black', color: 'white' }}>
                            <Printer size={16} /> Imprimir
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h1>Salón Principal</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {tables.map(table => (
                    <div
                        key={table.id}
                        className="glass-panel"
                        style={{
                            padding: 20,
                            borderLeft: `5px solid ${getStatusColor(table.estado)}`,
                            position: 'relative',
                            transition: 'transform 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }}
                    >
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => navigate(`/order/${table.id}`)}
                        >
                            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                Mesa {table.numero}
                            </div>
                            <span className={`badge status-${table.estado}`}>{table.estado}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-muted">{table.capacidad} Pers.</span>
                            {/* Waiter Badge */}
                            {table.estado !== 'libre' && table.comandas?.[0]?.usuario && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-main)',
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    border: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}>
                                    🤵 {table.comandas[0].usuario.nombre.split(' ')[0]}
                                </span>
                            )}
                        </div>

                        {table.estado === 'ocupada' && (
                            <div style={{ marginTop: 15, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                <button
                                    className="glass-button primary"
                                    style={{ padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                                    onClick={(e) => { e.stopPropagation(); navigate(`/order/${table.id}`); }}
                                >
                                    <Plus size={18} />
                                    Agregar
                                </button>
                                <button
                                    className="glass-button"
                                    style={{ padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                                    onClick={(e) => handleOpenModal(e, table, 'view')}
                                >
                                    <Eye size={18} />
                                    Ver
                                </button>
                                <button
                                    className="glass-button"
                                    style={{ padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, fontSize: '0.8rem' }}
                                    onClick={(e) => handleOpenModal(e, table, 'pre-check')}
                                >
                                    <Calculator size={18} />
                                    Pre-cuenta
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {renderModalContent()}
            {renderTicket()}
        </div>
    );
};

export default TablesView;
