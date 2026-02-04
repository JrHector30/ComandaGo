import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Grid, ChefHat, DollarSign, User, Sun, Moon, Menu, X, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const { theme, mode, toggleMode } = useTheme();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = () => {
        setMobileOpen(false);
        logout();
        navigate('/login');
    };

    const navLinkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px' : '10px 20px',
        width: '100%',
        boxSizing: 'border-box'
    });

    const navLinkClass = ({ isActive }) => `glass-button ${isActive ? 'primary' : ''}`;

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

            {/* Sidebar */}
            <aside
                className={`sidebar glass-panel ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}
                style={{
                    borderRadius: 0,
                    border: 0,
                    width: collapsed ? 80 : 250,
                    transition: 'width 0.3s ease-in-out',
                }}
            >
                {/* Mobile Close Button */}
                <div className="mobile-sidebar-header" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 20px 0' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)' }}>ComandaGo</h2>
                    <button className="glass-button" style={{ padding: 5 }} onClick={() => setMobileOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                {/* Desktop Header & Toggle */}
                <div className="desktop-sidebar-header" style={{ marginBottom: 20, textAlign: 'center', position: 'relative' }}>

                    {!collapsed && (
                        <>
                            <h2 style={{ color: 'var(--primary)', marginBottom: 5, fontSize: '1.5rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden' }} onClick={() => window.location.href = '/'}>
                                ComandaGo
                            </h2>
                            <div className="badge" style={{ background: 'var(--item-hover)', color: 'var(--text-main)', display: 'inline-block' }}>{user?.rol}</div>
                        </>
                    )}
                    {collapsed && (
                        <h2 style={{ color: 'var(--primary)', marginBottom: 5, fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>CG</h2>
                    )}

                    {/* Toggle Button */}
                    <button
                        className="glass-button icon"
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: collapsed ? -1000 : -10, // Hide or move out of way? Better strategy below
                            display: 'none' // We'll put it differently
                        }}
                    >
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 5 }}>
                        <button
                            className="glass-button"
                            style={{ padding: 5, borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: collapsed ? 'auto' : 0, top: 5, left: collapsed ? '50%' : 'auto', transform: collapsed ? 'translateX(-50%)' : 'none' }}
                            onClick={() => setCollapsed(!collapsed)}
                        >
                            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                    </div>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowX: 'hidden' }}>
                    {(user?.rol === 'mozo' || user?.rol === 'admin') && (
                        <NavLink to="/tables" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Mesas">
                            <Grid size={20} /> {!collapsed && <span>Mesas</span>}
                        </NavLink>
                    )}

                    {(user?.rol === 'cocina' || user?.rol === 'admin') && (
                        <NavLink to="/kitchen" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Cocina">
                            <ChefHat size={20} /> {!collapsed && <span>Cocina</span>}
                        </NavLink>
                    )}

                    {(user?.rol === 'caja' || user?.rol === 'admin') && (
                        <>
                            <NavLink to="/cashier" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Caja">
                                <DollarSign size={20} /> {!collapsed && <span>Caja</span>}
                            </NavLink>
                            <NavLink to="/admin/categories" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Categorías">
                                <Grid size={20} /> {!collapsed && <span>Categorías</span>}
                            </NavLink>
                            <NavLink to="/admin/inventory" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Almacén">
                                <ChefHat size={20} /> {!collapsed && <span>Almacén</span>}
                            </NavLink>
                        </>
                    )}
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(user?.rol === 'admin') && (
                        <>
                            <NavLink to="/admin/users" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Usuarios">
                                <User size={20} /> {!collapsed && <span>Usuarios</span>}
                            </NavLink>
                            <NavLink to="/admin/staff-stats" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Reporte Personal">
                                <Grid size={20} /> {!collapsed && <span>Reporte Personal</span>}
                            </NavLink>
                        </>
                    )}

                    <NavLink to="/settings" className={navLinkClass} style={navLinkStyle} onClick={() => setMobileOpen(false)} title="Ajustes">
                        <Settings size={20} /> {!collapsed && <span>Ajustes</span>}
                    </NavLink>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? '10px 0' : 10, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {user?.foto ? (
                                <img src={user.foto} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                            ) : (
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--item-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}>
                                    <User size={16} />
                                </div>
                            )}
                            {!collapsed && (
                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 120, overflow: 'hidden' }}>{user?.nombre}</span>
                                </div>
                            )}
                        </div>
                        {!collapsed && (
                            <button onClick={toggleMode} className="glass-button" style={{ padding: 5, borderRadius: '50%' }}>
                                {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                        )}
                    </div>

                    <button onClick={handleLogout} className="glass-button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'center', gap: 10, background: 'rgba(255,50,50,0.1)', color: '#ff6b6b', borderColor: '#ff6b6b', padding: collapsed ? 10 : '10px 20px' }}>
                        <LogOut size={16} /> {!collapsed && "Salir"}
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
