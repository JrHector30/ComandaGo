import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, ChefHat, DollarSign, Shield } from 'lucide-react';

const LoginPage = () => {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const res = await login(usuario, password);
        if (res.success) {
            navigate('/');
        } else {
            setError(res.error);
        }
    };

    const roles = [
        { name: 'Juan', user: 'juan', role: 'mozo', icon: <User />, color: '#4dabf7' },
        { name: 'Chef', user: 'chef', role: 'cocina', icon: <ChefHat />, color: '#ff922b' },
        { name: 'Ana', user: 'ana', role: 'caja', icon: <DollarSign />, color: '#51cf66' },
        { name: 'Admin', user: 'admin', role: 'admin', icon: <Shield />, color: '#e03131' },
    ];

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
            <div className="glass-panel" style={{ width: 400, padding: 40 }}>
                <h1 style={{ textAlign: 'center', color: 'var(--primary)' }}>ComandaGo</h1>
                <p style={{ textAlign: 'center', color: '#888', marginBottom: 30 }}>Selecciona tu usuario</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 30 }}>
                    {roles.map(r => (
                        <button
                            key={r.name}
                            className="glass-button"
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                                background: usuario === r.user ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                borderColor: usuario === r.user ? r.color : 'transparent'
                            }}
                            onClick={() => { setUsuario(r.user); setPassword('123'); setError(''); }}
                        >
                            <div style={{ color: r.color }}>{r.icon}</div>
                            <span>{r.name}</span>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                    <div>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Usuario"
                            value={usuario}
                            onChange={e => setUsuario(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            className="glass-input"
                            placeholder="Contraseña"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                    <button type="submit" className="glass-button primary" style={{ marginTop: 10 }}>
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
