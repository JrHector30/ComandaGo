import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Save, X, ChefHat, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft } from 'lucide-react';

const CategoriesView = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });

    // Form State
    const [formData, setFormData] = useState({
        nombre: '',
        color: '#000000',
        icono: '',
        activo: true,
        enviarCocina: true // Default True
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const res = await fetch('/api/categories');
        const data = await res.json();
        setCategories(data);
    };

    const handleOpenModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                nombre: category.nombre,
                color: category.color,
                icono: category.icono || '',
                activo: category.activo,
                enviarCocina: category.enviarCocina !== false // Default true if undefined
            });
        } else {
            setEditingCategory(null);
            setFormData({
                nombre: '',
                color: '#339af0', // Default pleasant blue
                icono: '',
                activo: true,
                enviarCocina: true
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro? Se eliminará la categoría y TODOS los productos dentro de ella. Esta acción no se puede deshacer.')) return;

        try {
            const res = await fetch(`/api/categories/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // Optimistic Local Update
                setCategories(prev => prev.filter(c => c.id !== id));
                fetchCategories(); // Sync with server
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingCategory
            ? `/api/categories/${editingCategory.id}`
            : '/api/categories';

        const method = editingCategory ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchCategories();
            } else {
                alert('Error al guardar categoría');
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- SORTING LOGIC ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            setSortConfig({ key: '', direction: '' }); // Reset
            return;
        }
        setSortConfig({ key, direction });
    };

    const sortedCategories = [...categories].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let valA, valB;

        if (sortConfig.key === 'nombre') {
            valA = a.nombre.toLowerCase();
            valB = b.nombre.toLowerCase();
        } else if (sortConfig.key === 'enviarCocina') {
            // Sort by Boolean (Kitchen First)
            valA = a.enviarCocina ? 1 : 0;
            valB = b.enviarCocina ? 1 : 0;
        } else if (sortConfig.key === 'productos') {
            valA = a._count?.platos || 0;
            valB = b._count?.platos || 0;
        } else {
            return 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortHeader = ({ label, sortKey }) => {
        const isActive = sortConfig.key === sortKey;
        const Icon = isActive
            ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown)
            : ChevronsUpDown;

        return (
            <th
                style={{ padding: 15, cursor: 'pointer', userSelect: 'none', color: isActive ? 'var(--primary)' : 'inherit' }}
                onClick={() => handleSort(sortKey)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {label}
                    <Icon size={14} style={{ opacity: isActive ? 1 : 0.3 }} />
                </div>
            </th>
        );
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Gestión de Categorías</h1>
                </div>
                <button className="glass-button primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Nueva Categoría
                </button>
            </div>

            <div className="glass-panel table-responsive" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <SortHeader label="Nombre" sortKey="nombre" />
                            <th style={{ padding: 15 }}>Icono</th>
                            <th style={{ padding: 15 }}>Color</th>
                            <SortHeader label="Cocina" sortKey="enviarCocina" />
                            <SortHeader label="Productos" sortKey="productos" />
                            <th style={{ padding: 15 }}>Estado</th>
                            <th style={{ padding: 15 }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedCategories.map(cat => (
                            <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: 15, fontWeight: 'bold' }}>{cat.nombre}</td>
                                <td style={{ padding: 15, fontSize: '1.5rem' }}>{cat.icono}</td>
                                <td style={{ padding: 15 }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: cat.color, border: '1px solid rgba(255,255,255,0.2)'
                                    }} />
                                </td>
                                <td style={{ padding: 15 }}>
                                    {cat.enviarCocina !== false ? (
                                        <span style={{ color: 'var(--success)', display: 'flex', gap: 5, alignItems: 'center' }}>
                                            <ChefHat size={16} /> SÍ
                                        </span>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>NO</span>
                                    )}
                                </td>
                                <td style={{ padding: 15 }}>{cat._count?.platos || 0} items</td>
                                <td style={{ padding: 15 }}>
                                    {cat.activo ? <span className="badge status-ok">Activo</span> : <span className="badge status-error">Inactivo</span>}
                                </td>
                                <td style={{ padding: 15 }}>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="glass-button" onClick={() => handleOpenModal(cat)}><Edit size={16} /></button>
                                        <button className="glass-button" onClick={() => handleDelete(cat.id)}><Trash size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                            <button className="glass-button" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <div>
                                <label>Nombre</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 15 }}>
                                <div>
                                    <label>Icono (Emoji)</label>
                                    <input
                                        type="text"
                                        className="glass-input"
                                        value={formData.icono}
                                        onChange={e => setFormData({ ...formData, icono: e.target.value })}
                                        placeholder="🍕"
                                    />
                                </div>
                            </div>

                            <div>
                                <label>Color</label>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        style={{ width: 50, height: 40, border: 'none', background: 'transparent' }}
                                    />
                                    <span>{formData.color}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                    type="checkbox"
                                    checked={formData.enviarCocina}
                                    onChange={e => setFormData({ ...formData, enviarCocina: e.target.checked })}
                                    style={{ width: 20, height: 20 }}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <ChefHat size={16} /> Enviar a Cocina
                                </label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                    type="checkbox"
                                    checked={formData.activo}
                                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    style={{ width: 20, height: 20 }}
                                />
                                <label>Categoría Activa</label>
                            </div>

                            <button type="submit" className="glass-button primary" style={{ marginTop: 10 }}>
                                <Save size={18} /> Guardar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoriesView;
