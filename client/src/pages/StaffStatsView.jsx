import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChefHat, TrendingUp, DollarSign, Clock, ArrowLeft } from 'lucide-react';

const StaffStatsView = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ waiters: [], cooks: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/staff/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="glass-panel" style={{ padding: 20 }}>Cargando estadísticas...</div>;

    // Helper for simple Bar Chart
    const BarChart = ({ data, labelKey, valueKey, color, icon: Icon, unit = '' }) => {
        const maxValue = Math.max(...data.map(d => d[valueKey]), 1);

        return (
            <div className="glass-panel" style={{ padding: 20, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <Icon size={24} color={color} />
                    <h3>Rendimiento: {labelKey}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {data.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 100, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.nombre}
                            </div>
                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 24, position: 'relative' }}>
                                <div style={{
                                    width: `${(item[valueKey] / maxValue) * 100}%`,
                                    background: color,
                                    height: '100%',
                                    borderRadius: 4,
                                    transition: 'width 1s ease'
                                }} />
                            </div>
                            <div style={{ width: 80, textAlign: 'right', fontWeight: 'bold' }}>
                                {unit}{item[valueKey].toFixed(unit ? 2 : 0)}
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && <p className="text-muted">No hay datos registrados.</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
                <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ margin: 0 }}>Dashboard de Personal</h1>
            </div>

            {/* Waiters Section */}
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                <Users size={24} color="var(--primary)" /> Rendimiento de Mozos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>
                {/* Chart: Sales */}
                <BarChart
                    data={stats.waiters}
                    labelKey="Ventas Totales"
                    valueKey="totalSales"
                    color="#51cf66"
                    icon={DollarSign}
                    unit="S/. "
                />
                {/* Table Details */}
                <div className="glass-panel table-responsive" style={{ padding: 20, flex: 1 }}>
                    <h3>Detalle de Atención</h3>
                    <table style={{ width: '100%', marginTop: 15 }}>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th style={{ textAlign: 'center' }}>Mesas</th>
                                <th style={{ textAlign: 'right' }}>Ventas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.waiters.map(w => (
                                <tr key={w.id}>
                                    <td>{w.nombre}</td>
                                    <td style={{ textAlign: 'center' }}>{w.totalTables}</td>
                                    <td style={{ textAlign: 'right' }}>S/. {w.totalSales.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cooks Section */}
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                <ChefHat size={24} color="var(--warning)" /> Rendimiento de Cocina
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* Chart: Dishes Config */}
                <BarChart
                    data={stats.cooks}
                    labelKey="Platos Preparados"
                    valueKey="totalDishes"
                    color="#fcc419"
                    icon={TrendingUp}
                />

                {/* Table Details + Time */}
                <div className="glass-panel table-responsive" style={{ padding: 20, flex: 1 }}>
                    <h3>Eficiencia</h3>
                    <table style={{ width: '100%', marginTop: 15 }}>
                        <thead>
                            <tr>
                                <th>Cocinero</th>
                                <th style={{ textAlign: 'center' }}>Platos</th>
                                <th style={{ textAlign: 'right' }}>Tiempo Prom.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.cooks.map(c => (
                                <tr key={c.id}>
                                    <td>{c.nombre}</td>
                                    <td style={{ textAlign: 'center' }}>{c.totalDishes}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        {c.avgTimeMin > 0 ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>
                                                <Clock size={14} /> {c.avgTimeMin.toFixed(1)} min
                                            </span>
                                        ) : '--'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StaffStatsView;
