import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, X, User, Save, Upload, ArrowLeft } from 'lucide-react';

const UsersView = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        usuario: '',
        rol: 'mozo',
        password: '',
        foto: ''
    });
    const [previewImage, setPreviewImage] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                nombre: user.nombre,
                usuario: user.usuario || '',
                rol: user.rol,
                password: user.password,
                foto: user.foto || ''
            });
            setPreviewImage(user.foto ? user.foto : null);
        } else {
            setEditingUser(null);
            setFormData({ nombre: '', usuario: '', rol: 'mozo', password: '', foto: '' });
            setPreviewImage(null);
        }
        setShowModal(true);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result);
        reader.readAsDataURL(file);

        // Upload
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/upload?type=user', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                setFormData(prev => ({ ...prev, foto: data.url }));
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Error al subir imagen');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingUser
                ? `/api/users/${editingUser.id}`
                : '/api/users';

            const method = editingUser ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchUsers();
                setShowModal(false);
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro de eliminar este usuario?')) return;
        try {
            await fetch(`/api/users/${id}`, { method: 'DELETE' });
            fetchUsers();
        } catch (error) {
            console.error(error);
        }
    };

    const filteredUsers = users.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.usuario && u.usuario.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getRoleColor = (rol) => {
        switch (rol) {
            case 'admin': return 'var(--danger)'; // Red
            case 'cocina': return 'var(--warning)'; // Orange
            case 'caja': return 'var(--success)'; // Green
            default: return 'var(--primary)'; // Blue
        }
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Gestión de Usuarios</h1>
                </div>
                <button className="glass-button primary" onClick={() => handleOpenModal()}>
                    <Plus size={20} style={{ marginRight: 5 }} /> Nuevo Usuario
                </button>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 20 }}>
                <div className="search-container">
                    <Search size={22} className="text-muted" />
                    <input
                        type="text"
                        placeholder="Buscar usuarios..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="responsive-grid">
                {filteredUsers.map(user => (
                    <div key={user.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ height: 100, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {/* Role Badge */}
                            <div className="badge" style={{ position: 'absolute', top: 10, right: 10, background: getRoleColor(user.rol) }}>{user.rol}</div>

                            {user.foto ? (
                                <img src={user.foto} alt={user.nombre} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg-dark)' }} />
                            ) : (
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--bg-dark)' }}>
                                    <User size={40} className="text-muted" />
                                </div>
                            )}
                        </div>

                        <div style={{ padding: 20, textAlign: 'center', flex: 1 }}>
                            <h3 style={{ margin: '0 0 5px 0' }}>{user.nombre}</h3>
                            <div className="text-muted">@{user.usuario}</div>
                        </div>

                        <div style={{ padding: 15, background: 'rgba(0,0,0,0.2)', display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button className="glass-button" onClick={() => handleOpenModal(user)}>
                                <Edit size={16} /> Editar
                            </button>
                            <button className="glass-button" style={{ color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => handleDelete(user.id)}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>


            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
                        <div className="modal-header">
                            <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <button className="glass-button" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>

                            {/* Photo Upload */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.2)' }}>
                                    {previewImage ? (
                                        <img src={previewImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <User size={40} className="text-muted" />
                                    )}
                                </div>
                                <label className="glass-button" style={{ cursor: 'pointer', fontSize: '0.8rem' }}>
                                    <Upload size={14} style={{ marginRight: 5 }} /> Subir Foto
                                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                                </label>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Nombre Completo</label>
                                    <input type="text" className="glass-input" required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                                </div>
                                <div>
                                    <label>Usuario (Login)</label>
                                    <input type="text" className="glass-input" required value={formData.usuario} onChange={e => setFormData({ ...formData, usuario: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                <div>
                                    <label>Rol</label>
                                    <select className="glass-input" value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })}>
                                        <option value="mozo">Mozo</option>
                                        <option value="cocina">Cocina</option>
                                        <option value="caja">Caja</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Contraseña</label>
                                    <input type="text" className="glass-input" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                </div>
                            </div>

                            <button type="submit" className="glass-button primary" style={{ marginTop: 20, height: 50, fontSize: '1.1rem' }}>
                                <Save size={20} style={{ marginRight: 10 }} /> Guardar Usuario
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default UsersView;
