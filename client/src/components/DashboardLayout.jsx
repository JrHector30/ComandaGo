import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Grid, ChefHat, DollarSign, User, Sun, Moon, Menu, X } from 'lucide-react';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        setMobileOpen(false);
        logout();
        navigate('/login');
    };

    return (
        <div className="app-container">
            {/* Mobile Header (Visible only on mobile) */}
            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="glass-button" style={{ padding: 8 }} onClick={() => setMobileOpen(true)}>
                        <Menu size={20} />
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>ComandaGo</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="badge" style={{ background: 'var(--item-hover)', fontSize: '0.7rem' }}>{user?.rol}</div>
                    {user?.foto && <img src={user.foto} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--primary)' }} />}
                </div>
            </div>

            {/* Sidebar (Drawer on mobile, Static on Desktop) */}
            <aside className={`sidebar glass-panel ${mobileOpen ? 'mobile-open' : ''}`} style={{ borderRadius: 0, border: 0 }}>
                {/* Mobile Close Button */}
                <div className="mobile-sidebar-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 20px 0' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)' }}>ComandaGo</h2>
                    <button className="glass-button" style={{ padding: 5 }} onClick={() => setMobileOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                {/* Desktop Header (Hidden on mobile generally, but we keep it for desktop identity) */}
                <div className="desktop-sidebar-header" style={{ marginBottom: 20, textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--primary)', marginBottom: 5, fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>ComandaGo</h2>
                    <div className="badge" style={{ background: 'var(--item-hover)', color: 'var(--text-main)', display: 'inline-block' }}>{user?.rol}</div>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {(user?.rol === 'mozo' || user?.rol === 'admin') && (
                        <NavLink
                            to="/tables"
                            className={({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                            onClick={() => setMobileOpen(false)}
                        >
                            <Grid size={20} /> Mesas
                        </NavLink>
                    )}

                    {(user?.rol === 'cocina' || user?.rol === 'admin') && (
                        <NavLink
                            to="/kitchen"
                            className={({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                            onClick={() => setMobileOpen(false)}
                        >
                            <ChefHat size={20} /> Cocina
                        </NavLink>
                    )}

                    {(user?.rol === 'caja' || user?.rol === 'admin') && (
                        <>
                            <NavLink
                                to="/cashier"
                                className={({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                <DollarSign size={20} /> Caja
                            </NavLink>
                            <NavLink
                                to="/admin/categories"
                                className={({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Grid size={20} /> Categorías
                            </NavLink>
                            <NavLink
                                to="/admin/inventory"
                                className={({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                <ChefHat size={20} /> Almacén
                            </NavLink>
                        </>
                    )}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(user?.rol === 'admin') && (
                        <>


                            <NavLink
                                to="/admin/users"
                                className={({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 10, textDecoration: 'none' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                <User size={20} /> Usuarios
                            </NavLink>
                            <NavLink
                                to="/admin/staff-stats"
                                className={({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 10, textDecoration: 'none' }}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Grid size={20} /> Reporte Personal
                            </NavLink>
                        </>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {user?.foto ? (
                                <img src={user.foto} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                            ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--item-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
                                    <User size={16} />
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{user?.nombre}</span>
                            </div>
                        </div>
                        <button onClick={toggleTheme} className="glass-button" style={{ padding: 5, borderRadius: '50%' }}>
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        </button>
                    </div>
                    <button onClick={handleLogout} className="glass-button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,50,50,0.1)', color: '#ff6b6b', borderColor: '#ff6b6b' }}>
                        <LogOut size={16} /> Salir
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile drawer */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 998,
                        backdropFilter: 'blur(2px)'
                    }}
                />
            )}

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
