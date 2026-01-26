import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, ChefHat, Play, Check, Undo } from 'lucide-react';

const KitchenTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState('');
    const [alertClass, setAlertClass] = useState('text-muted');

    useEffect(() => {
        const calculateTime = () => {
            const start = new Date(startTime);
            const now = new Date();
            const diffMs = now - start;
            const minutes = Math.floor(diffMs / 60000);

            setElapsed(`Hace ${minutes} min`);

            if (minutes > 25) setAlertClass('timer-critical');
            else if (minutes > 15) setAlertClass('timer-warning');
            else setAlertClass('text-muted');
        };

        calculateTime();
        const interval = setInterval(calculateTime, 60000); // Update every 60s
        return () => clearInterval(interval);
    }, [startTime]);

    return <span className={alertClass} style={{ fontSize: '0.8rem' }}>{elapsed}</span>;
};

const ItemCard = React.memo(({ item, actionButton }) => (
    <div className="glass-panel fade-in" style={{ padding: 15, marginBottom: 10, borderLeft: item.observacion ? '5px solid var(--danger)' : '5px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: 5, transition: 'all 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.cantidad}x {item.plato.nombre}</span>
            <span className="badge" style={{ background: 'var(--item-hover)' }}>Mesa {item.comanda.mesa.numero}</span>
        </div>

        {item.observacion && (
            <div style={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '0.9rem', background: 'rgba(255,50,50,0.1)', padding: '5px 8px', borderRadius: 4 }}>
                📝 {item.observacion}
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
            <KitchenTimer startTime={item.fecha || item.comanda.fecha} />
            {item.cocinero && (
                <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ChefHat size={14} /> {item.cocinero.nombre}
                </span>
            )}
        </div>

        {actionButton}
    </div>
));

const KitchenView = () => {
    const { user } = useAuth();
    const [queue, setQueue] = useState([]);

    const fetchQueue = () => {
        fetch('/api/kitchen/queue')
            .then(res => res.json())
            .then(data => setQueue(data))
            .catch(err => console.error("Error polling queue", err));
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 5000);
        return () => clearInterval(interval);
    }, []);

    const updateItemStatus = async (itemId, status, options = {}) => {
        const payload = { estado: status };
        if (status === 'preparando' && !options.preserveCook) {
            payload.cocineroId = user.id;
        }

        try {
            await fetch(`/api/orders/details/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            fetchQueue();
        } catch (error) {
            console.error("Error updating item", error);
        }
    };

    // Columns
    const pendingItems = queue.filter(i => i.estado === 'pendiente' || i.estado === 'enviada');
    const inProcessItems = queue.filter(i => i.estado === 'preparando');
    const readyItems = queue.filter(i => i.estado === 'lista' || i.estado === 'listo');

    return (
        <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ marginBottom: 20 }}>Flujo de Cocina (Por Plato)</h1>

            <div className="kitchen-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr', gap: 20, flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* COLUMN 1: PENDIENTES */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden', height: '100%' }}>
                    <h2 style={{ padding: 15, borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Clock className="text-muted" /> Pendientes ({pendingItems.length})
                    </h2>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
                        {pendingItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                actionButton={
                                    <button
                                        className="glass-button primary"
                                        style={{ width: '100%', marginTop: 10, display: 'flex', justifyContent: 'center', gap: 5 }}
                                        onClick={() => updateItemStatus(item.id, 'preparando')}
                                    >
                                        <Play size={16} /> Tomar Pedido
                                    </button>
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* COLUMN 2: EN PROCESO */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden', height: '100%' }}>
                    <h2 style={{ padding: 15, borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary)' }}>
                        <ChefHat /> En Proceso ({inProcessItems.length})
                    </h2>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
                        {inProcessItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                actionButton={
                                    <button
                                        className="glass-button"
                                        style={{ width: '100%', marginTop: 10, background: 'var(--success)', borderColor: 'transparent', display: 'flex', justifyContent: 'center', gap: 5 }}
                                        onClick={() => updateItemStatus(item.id, 'listo')}
                                    >
                                        <Check size={16} /> Terminar
                                    </button>
                                }
                            />
                        ))}
                    </div>
                </div>

                {/* COLUMN 3: LISTOS */}
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden', height: '100%' }}>
                    <h2 style={{ padding: 15, borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)' }}>
                        <CheckCircle /> Listos
                    </h2>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
                        {readyItems.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                actionButton={
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
                                        <div style={{ padding: 10, color: 'var(--success)', fontWeight: 'bold' }}>
                                            ✓ Completado
                                        </div>
                                        <button
                                            className="glass-button"
                                            style={{ padding: 8, color: 'var(--text-muted)' }}
                                            title="Deshacer (Volver a Proceso)"
                                            onClick={() => updateItemStatus(item.id, 'preparando', { preserveCook: true })}
                                        >
                                            <Undo size={16} />
                                        </button>
                                    </div>
                                }
                            />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default KitchenView;
