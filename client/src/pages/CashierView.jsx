import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import CashCountTable from '../components/CashCountTable';

const CashierView = () => {
    const navigate = useNavigate();
    const [openTables, setOpenTables] = useState([]);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchTables = () => {
        fetch('/api/tables')
            .then(res => res.json())
            .then(data => {
                setOpenTables(data.filter(t => t.estado === 'ocupada'));
            });
    };

    useEffect(() => {
        fetchTables();
        const interval = setInterval(fetchTables, 5000);
        return () => clearInterval(interval);
    }, []);

    const [shiftStatus, setShiftStatus] = useState('cerrado'); // Default to closed

    const handleOpenPayment = (table, order) => {
        if (shiftStatus !== 'abierto') {
            alert("Debe ABRIR CAJA antes de cobrar.");
            return;
        }
        setSelectedOrder({ ...order, tableNumero: table.numero, tableId: table.id });
        setPaymentModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        setPaymentModalOpen(false);
        fetchTables();
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Módulo de Caja</h1>
            </div>

            {/* 1. Panel de Arqueo (Top) */}
            <CashCountTable onStatusChange={setShiftStatus} />

            {/* 2. Cuentas Abiertas (Bottom) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, marginBottom: 20 }}>
                <h2>Cuentas Abiertas</h2>
                {shiftStatus === 'cerrado' && (
                    <div style={{ color: '#dc3545', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.2em' }}>⚠</span> CAJA CERRADA
                    </div>
                )}
            </div>

            <div className="responsive-grid" style={{
                opacity: shiftStatus === 'cerrado' ? 0.6 : 1,
                pointerEvents: shiftStatus === 'cerrado' ? 'none' : 'auto'
            }}>
                {openTables.length === 0 && <p className="text-muted">No hay mesas ocupadas.</p>}

                {openTables.map(table => {
                    const activeOrder = table.comandas[0];
                    if (!activeOrder) return null;

                    const realTotal = activeOrder.detalles.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0);

                    return (
                        <div key={table.id} className="glass-panel" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 15, borderBottom: '1px solid var(--glass-border)', paddingBottom: 10 }}>
                                <h2>Mesa {table.numero}</h2>
                                <h2 style={{ color: 'var(--success)' }}>S/. {realTotal.toFixed(2)}</h2>
                            </div>

                            <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 20 }}>
                                {activeOrder.detalles.map(d => (
                                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                        <span>{d.cantidad}x {d.plato.nombre}</span>
                                        <span>S/. {(d.cantidad * d.plato.precio).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="glass-button primary"
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: 10 }}
                                onClick={() => handleOpenPayment(table, activeOrder)}
                            >
                                <Printer size={18} /> Cerrar Cuenta & Imprimir
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Pago */}
            {paymentModalOpen && selectedOrder && (
                <PaymentModal
                    order={selectedOrder}
                    onClose={() => setPaymentModalOpen(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
};

export default CashierView;

