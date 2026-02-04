import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, Moon, Sun, Zap, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsView = () => {
    const { theme, changeTheme } = useTheme();
    const navigate = useNavigate();

    const themes = [
        {
            id: 'theme-green',
            name: 'Starbucks Green',
            description: 'Estilo clásico y elegante. Verde corporativo.',
            icon: <Zap size={24} />,
            color: '#00704A',
            border: '#005c3d'
        },
        {
            id: 'theme-blue',
            name: 'Noche Azulada',
            description: 'El tema clásico. Tonos Slate profundos.',
            icon: <Moon size={24} />,
            color: '#020617',
            border: '#1e293b'
        },
        {
            id: 'theme-red',
            name: 'ComandaGo Rojo',
            description: 'Pasión por la marca. Tonos rojizos.',
            icon: <Palette size={24} />,
            color: '#1a0505',
            border: '#F0544F'
        }
    ];

    return (
        <div className="fade-in" style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
                <button className="glass-button" onClick={() => navigate('/')} style={{ padding: 8 }}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ margin: 0 }}>Ajustes</h1>
                    <p className="text-muted" style={{ margin: 0 }}>Personaliza tu experiencia en ComandaGo</p>
                </div>
            </div>

            <section className="glass-panel" style={{ padding: 30 }}>
                <h2 style={{ marginBottom: 20 }}>Temas y Apariencia</h2>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 20
                }}>
                    {themes.map(t => (
                        <div
                            key={t.id}
                            onClick={() => changeTheme(t.id)}
                            style={{
                                cursor: 'pointer',
                                background: t.color,
                                border: `2px solid ${theme === t.id ? 'var(--primary)' : t.border}`,
                                borderRadius: 16,
                                padding: 20,
                                position: 'relative',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                transform: theme === t.id ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: theme === t.id ? '0 10px 30px -10px var(--primary)' : 'none'
                            }}
                        >
                            <div style={{
                                color: theme === t.id ? 'var(--primary)' : (t.id === 'light' ? '#333' : '#fff'),
                                marginBottom: 15
                            }}>
                                {t.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.2rem',
                                marginBottom: 5,
                                color: t.id === 'light' ? '#0f172a' : '#fff'
                            }}>
                                {t.name}
                            </h3>
                            <p style={{
                                fontSize: '0.9rem',
                                margin: 0,
                                opacity: 0.7,
                                color: t.id === 'light' ? '#64748b' : '#94a3b8'
                            }}>
                                {t.description}
                            </p>

                            {theme === t.id && (
                                <div style={{
                                    position: 'absolute',
                                    top: 10,
                                    right: 10,
                                    background: 'var(--primary)',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                }}>
                                    ACTIVO
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default SettingsView;
