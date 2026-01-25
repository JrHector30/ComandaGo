import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash, Save, X, Search, Image as ImageIcon, Sparkles, ArrowUp, ArrowDown, ChevronsUpDown, ArrowLeft } from 'lucide-react';

const InventoryView = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [filterCategory, setFilterCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState(false); // State for AI loading
    const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' });

    // Helper: AI Description
    const handleGenerateDescription = async () => {
        if (!formData.nombre) {
            alert("Por favor, ingrese un nombre primero.");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await fetch('/api/generate-description', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: formData.nombre })
            });
            const data = await res.json();
            if (data.description) {
                setFormData(prev => ({ ...prev, descripcion: data.description }));
            }
        } catch (error) {
            console.error("AI Generation failed", error);
            alert("Error generando descripción");
        } finally {
            setIsGenerating(false);
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        categoriaId: '',
        activo: true,
        imageFile: null,
        imagePreview: null
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [prodRes, catRes] = await Promise.all([
            fetch('/api/products'),
            fetch('/api/categories')
        ]);
        const p = await prodRes.json();
        const c = await catRes.json();
        setProducts(p);
        setCategories(c);
        if (c.length > 0) setFormData(prev => ({ ...prev, categoriaId: c[0].id }));
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                nombre: product.nombre,
                descripcion: product.descripcion || '',
                precio: product.precio,
                categoriaId: product.categoriaId,
                activo: product.activo,
                imageFile: null,
                imagePreview: product.imagen ? product.imagen : null
            });
        } else {
            setEditingProduct(null);
            setFormData({
                nombre: '',
                descripcion: '',
                precio: '',
                categoriaId: categories.length > 0 ? categories[0].id : '',
                activo: true,
                imageFile: null,
                imagePreview: null
            });
        }
        setIsModalOpen(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({
                ...formData,
                imageFile: file,
                imagePreview: URL.createObjectURL(file)
            });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que desea eliminar este producto?')) return;
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                console.log(data.message);
                fetchData();
            } else {
                alert('Error: ' + (data.error || 'No se pudo eliminar el producto'));
            }
        } catch (error) {
            console.error("Delete request failed", error);
            alert('Error de conexión al intentar eliminar');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let imageUrl = editingProduct ? editingProduct.imagen : null;

        // Upload Image if present
        if (formData.imageFile) {
            const uploadData = new FormData();
            uploadData.append('image', formData.imageFile);
            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadData
                });
                const data = await res.json();
                imageUrl = data.url;
            } catch (error) {
                console.error('Upload failed', error);
                alert('Falló la subida de imagen');
                return;
            }
        }

        const payload = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio: formData.precio,
            categoriaId: formData.categoriaId,
            activo: formData.activo,
            imagen: imageUrl
        };

        const url = editingProduct
            ? `/api/products/${editingProduct.id}`
            : '/api/products';

        const method = editingProduct ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await res.json();
                alert('Error: ' + JSON.stringify(err));
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

    const sortedProducts = [...products].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'categoria') {
            valA = a.categoria?.nombre || '';
            valB = b.categoria?.nombre || '';
        }

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const filteredProducts = sortedProducts.filter(p => {
        const matchesCategory = filterCategory ? p.categoriaId === parseInt(filterCategory) : true;
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
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
                    <button className="glass-button" onClick={() => navigate(-1)} style={{ padding: 8 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Almacén (Productos)</h1>
                </div>
                <button className="glass-button primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Nuevo Producto
                </button>
            </div>

            <div className="glass-panel" style={{ marginBottom: 20, display: 'flex', gap: 15, padding: 15 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Search size={20} className="text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="glass-input"
                        style={{ border: 'none', background: 'transparent', padding: 0 }}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: 30 }} />
                <select
                    className="glass-input"
                    style={{ width: 200 }}
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="">Todas las categorías</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
                    ))}
                </select>
            </div>

            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                            <th style={{ padding: 15 }}>Imagen</th>
                            <SortHeader label="Nombre" sortKey="nombre" />
                            <SortHeader label="Categoría" sortKey="categoria" />
                            <SortHeader label="Precio" sortKey="precio" />
                            <th style={{ padding: 15 }}>Estado</th>
                            <th style={{ padding: 15 }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(prod => (
                            <tr key={prod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: 15 }}>
                                    {prod.imagen ? (
                                        <img src={prod.imagen} alt={prod.nombre} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
                                    ) : (
                                        <div style={{ width: 50, height: 50, background: 'var(--item-hover)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ImageIcon size={20} className="text-muted" />
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: 15, fontWeight: 'bold' }}>{prod.nombre}</td>
                                <td style={{ padding: 15 }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: 4,
                                        background: prod.categoria?.color + '40',
                                        color: prod.categoria?.color
                                    }}>
                                        {prod.categoria?.icono} {prod.categoria?.nombre}
                                    </span>
                                </td>
                                <td style={{ padding: 15 }}>S/. {prod.precio.toFixed(2)}</td>
                                <td style={{ padding: 15 }}>
                                    {prod.activo ? <span className="badge status-ok">Activo</span> : <span className="badge status-error">Inactivo</span>}
                                </td>
                                <td style={{ padding: 15 }}>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="glass-button" onClick={() => handleOpenModal(prod)}><Edit size={16} /></button>
                                        <button className="glass-button" onClick={() => handleDelete(prod.id)}><Trash size={16} /></button>
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
                            <h2>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                            <button className="glass-button" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>

                            {/* Image Upload */}
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div style={{
                                    width: 100, height: 100, background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 10, overflow: 'hidden', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {formData.imagePreview ? (
                                        <img src={formData.imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <ImageIcon size={30} className="text-muted" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label>Imagen del Producto</label>
                                    <input type="file" onChange={handleImageChange} accept="image/*" className="glass-input" />
                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 5 }}>Max 2MB. JPG, PNG, WEBP.</p>
                                </div>
                            </div>

                            <div>
                                <label>Nombre *</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                    <label>Descripción</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateDescription}
                                        disabled={isGenerating}
                                        style={{
                                            background: 'linear-gradient(45deg, #7c3aed, #db2777)',
                                            border: 'none',
                                            borderRadius: 12,
                                            padding: '4px 10px',
                                            color: 'white',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            opacity: isGenerating ? 0.7 : 1
                                        }}
                                    >
                                        <Sparkles size={12} />
                                        {isGenerating ? 'Generando...' : 'Generar con IA'}
                                    </button>
                                </div>
                                <textarea
                                    className="glass-input"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Categoría *</label>
                                    <select
                                        className="glass-input"
                                        value={formData.categoriaId}
                                        onChange={e => setFormData({ ...formData, categoriaId: e.target.value })}
                                        required
                                    >
                                        <option value="">Seleccionar...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label>Precio (S/.) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="glass-input"
                                        value={formData.precio}
                                        onChange={e => setFormData({ ...formData, precio: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <input
                                    type="checkbox"
                                    checked={formData.activo}
                                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                                    style={{ width: 20, height: 20 }}
                                />
                                <label>Producto Activo</label>
                            </div>

                            <button type="submit" className="glass-button primary" style={{ marginTop: 10 }}>
                                <Save size={18} /> Guardar Producto
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryView;
