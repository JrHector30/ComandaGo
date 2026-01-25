import React, { useState } from 'react';
import { Banknote, CreditCard, Smartphone, CheckSquare, X, AlertCircle } from 'lucide-react';

const PaymentModal = ({ order, onClose, onSuccess }) => {
    const totalOrder = order.detalles.reduce((sum, d) => sum + (d.cantidad * d.plato.precio), 0);
    const taxRate = 0.18;
    const subTotal = totalOrder / (1 + taxRate);
    const taxAmount = totalOrder - subTotal;

    // State
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [cashGiven, setCashGiven] = useState('');
    const [hasTip, setHasTip] = useState(false);
    const [tipAmount, setTipAmount] = useState(0);
    const [docType, setDocType] = useState('sin_comprobante');
    const [observation, setObservation] = useState('');
    const [email, setEmail] = useState('');

    const finalTotal = totalOrder + (hasTip ? Number(tipAmount) : 0);
    const change = paymentMethod === 'efectivo' ? (Number(cashGiven) - finalTotal) : 0;

    const handleFinalize = async () => {
        if (paymentMethod === 'efectivo' && Number(cashGiven) < finalTotal) {
            alert('El monto recibido es menor al total.');
            return;
        }

        if (confirm(`¿Finalizar cobro por S/. ${finalTotal.toFixed(2)}?`)) {
            try {
                const res = await fetch(`/api/checkout/${order.tableId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentMethod,
                        docType,
                        totalReceived: Number(cashGiven),
                        tip: hasTip ? Number(tipAmount) : 0,
                        observation,
                        email
                    })
                });

                if (res.ok) {
                    alert('Pago registrado correctamente.');
                    onSuccess();
                } else {
                    alert('Error al registrar pago.');
                }
            } catch (e) {
                console.error(e);
                alert('Error de conexión');
            }
        }
    };

    // Validation: Check for Pending Kitchen Items
    const pendingKitchenItems = order.detalles.filter(d => {
        // Condition 1: Must be a kitchen category (enviarCocina = true)
        // Note: Backend must return categoria. If not present (legacy), assume true for safety or false if strict.
        const sendsToKitchen = d.plato.categoria?.enviarCocina ?? true;

        // Condition 2: Status is NOT 'listo', 'lista', or 'entregado'
        const isPending = !['listo', 'lista', 'entregado'].includes(d.estado);

        return sendsToKitchen && isPending;
    });

    const isBlocked = pendingKitchenItems.length > 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, width: '95%' }}>
                {/* Header */}
                <div className="modal-header" style={{ borderBottom: 'none', background: 'var(--primary)', margin: '-25px -25px 20px -25px', padding: 20 }}>
                    <h2 style={{ color: 'white', margin: 0 }}>Tipo de Pago - Mesa {order.tableNumero}</h2>
                    <button className="glass-button" style={{ border: 'none', color: 'white', padding: 0 }} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Validation Warning */}
                {isBlocked && (
                    <div style={{
                        background: 'var(--warning)',
                        color: 'black',
                        padding: 15,
                        marginBottom: 20,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontWeight: 'bold'
                    }}>
                        <AlertCircle size={24} />
                        <div>
                            <div>⚠️ No se puede cobrar: Hay platos pendientes en cocina.</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'normal', marginTop: 5 }}>
                                Faltan: {pendingKitchenItems.map(p => p.plato.nombre).join(', ')}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 20 }}>
                    {/* ... Existing Columns ... */}
                    {/* COL 1: MONTO */}
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 15 }}>Monto</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span className="text-muted">Sub-Total:</span>
                            <span>S/. {subTotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span className="text-muted">Impuesto (18%):</span>
                            <span>S/. {taxAmount.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, fontWeight: 'bold', fontSize: '1.2rem' }}>
                            <span>Total Bruto:</span>
                            <span>S/. {totalOrder.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* COL 2: METODOS */}
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 15 }}>Métodos de pago</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'efectivo'} onChange={() => setPaymentMethod('efectivo')} />
                                <Banknote size={18} /> Efectivo
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'tarjeta'} onChange={() => setPaymentMethod('tarjeta')} />
                                <CreditCard size={18} /> Tarjeta Crédito/Débito
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'yape'} onChange={() => setPaymentMethod('yape')} />
                                <Smartphone size={18} /> Yape / Plin
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="method" checked={paymentMethod === 'izipay'} onChange={() => setPaymentMethod('izipay')} />
                                <CreditCard size={18} /> Izipay
                            </label>
                        </div>
                    </div>

                    {/* COL 3: DETALLE */}
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 15 }}>Detalle de Pago</h3>
                        <div style={{ marginBottom: 15 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                                <input type="checkbox" checked={hasTip} onChange={e => setHasTip(e.target.checked)} />
                                Propina
                            </label>
                            {hasTip && (
                                <input
                                    type="number"
                                    className="glass-input"
                                    placeholder="Monto"
                                    value={tipAmount}
                                    onChange={e => setTipAmount(e.target.value)}
                                    style={{ padding: 8 }}
                                />
                            )}
                        </div>

                        {(paymentMethod === 'efectivo' || paymentMethod === 'efectivo_tarjeta') && (
                            <>
                                <div style={{ marginBottom: 10 }}>
                                    <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9rem' }}>Pago con:</label>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        value={cashGiven}
                                        onChange={e => setCashGiven(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: change < 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    <span>Vuelto:</span>
                                    <span>S/. {change > 0 ? change.toFixed(2) : '0.00'}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* COL 4: COMPROBANTE */}
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 10, marginBottom: 15 }}>Comprobante</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="doc" checked={docType === 'factura'} onChange={() => setDocType('factura')} />
                                Factura
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="doc" checked={docType === 'boleta'} onChange={() => setDocType('boleta')} />
                                Boleta
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                <input type="radio" name="doc" checked={docType === 'sin_comprobante'} onChange={() => setDocType('sin_comprobante')} />
                                S/C (Sin Comp.)
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h4 style={{ marginBottom: 10 }}>Observación</h4>
                        <textarea
                            className="glass-input"
                            rows={3}
                            value={observation}
                            onChange={e => setObservation(e.target.value)}
                            placeholder="Notas adicionales..."
                        />
                    </div>
                    <div className="glass-panel" style={{ padding: 15 }}>
                        <h4 style={{ marginBottom: 10 }}>Enviar comprobante</h4>
                        <input
                            type="email"
                            className="glass-input"
                            placeholder="cliente@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="glass-button" onClick={onClose} style={{ background: 'var(--danger)', borderColor: 'transparent' }}>
                        Cerrar
                    </button>
                    <button
                        className="glass-button primary"
                        onClick={handleFinalize}
                        disabled={isBlocked}
                        style={{ opacity: isBlocked ? 0.5 : 1, cursor: isBlocked ? 'not-allowed' : 'pointer' }}
                    >
                        <CheckSquare size={18} /> Finalizar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
