// src/App.js
import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';
import SearchResults from './pages/SearchResults';
import WorkspaceSettings from './pages/WorkspaceSettings';
import NotificationHub from './components/NotificationHub';
import UserMenu from './components/UserMenu'; // Nouvel import du menu utilisateur
import ProfileSettings from './pages/ProfileSettings'; // Nouvelle page de paramètres
import About from './pages/About'; // Nouvelle page À propos
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './App.css';

function App() {
    const navigate = useNavigate();
    const location = useLocation();

    const [searchInput, setSearchInput] = useState('');
    const token = localStorage.getItem('token') || '';

    const [theSocket, setTheSocket] = useState(null);

    // On définit les chemins où l'on veut CACHER la navbar :
    const hideNavbarPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
    // Si le pathname courant est dans hideNavbarPaths, on masque la navbar :
    const shouldHideNavbar = hideNavbarPaths.includes(location.pathname);

    // Soumission barre de recherche
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchInput.trim()) return;
        navigate(`/search?query=${encodeURIComponent(searchInput.trim())}`);
    };

    return (
        <div id="root-app">
            {/* Affichage conditionnel de la NAVBAR */}
            {!shouldHideNavbar && (
                <div className="navbar">
                    <div className="nav-left">
                        {token ? (
                            <Link to="/chat" className="chat-link">Chat</Link>
                        ) : (
                            <>
                                <Link to="/login" style={{ color: '#fff', marginRight: 12 }}>Login</Link>
                                <Link to="/register" style={{ color: '#fff' }}>Register</Link>
                            </>
                        )}
                    </div>

                    <div className="nav-center">
                        {token && (
                            <form onSubmit={handleSearchSubmit} className="nav-search">
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Rechercher..."
                                />
                                <button type="submit">Go</button>
                            </form>
                        )}
                    </div>

                    <div className="nav-right">
                        {/* On affiche la cloche de notification et le menu utilisateur si token */}
                        {token && (
                            <>
                                <NotificationHub socket={theSocket} />
                                <UserMenu />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* On décale de 60px le contenu SEULEMENT si la navbar est visible */}
            <div className="app-container" style={{ marginTop: shouldHideNavbar ? 0 : '60px' }}>
                <Routes>
                    <Route
                        path="/"
                        element={
                            token
                                ? <Navigate to="/chat" replace />
                                : (
                                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                        <h2>Accueil</h2>
                                        <p>Bienvenue sur SupChat !</p>
                                        <div style={{ marginTop: '20px' }}>
                                            <button
                                                onClick={() => navigate('/login')}
                                                style={{ marginRight: '10px', padding: '10px 20px' }}
                                            >
                                                Aller à Login
                                            </button>
                                            <button
                                                onClick={() => navigate('/register')}
                                                style={{ padding: '10px 20px' }}
                                            >
                                                Aller à Register
                                            </button>
                                        </div>
                                    </div>
                                )
                        }
                    />

                    {/* Login / Register accessibles tout le temps */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* Pages protégées => PrivateRoute */}
                    <Route
                        path="/chat"
                        element={
                            <PrivateRoute>
                                <Chat onSocketReady={setTheSocket} />
                            </PrivateRoute>
                        }
                    />
                    <Route path="/search" element={<PrivateRoute><SearchResults /></PrivateRoute>} />
                    <Route
                        path="/workspace/:workspaceId/settings"
                        element={<PrivateRoute><WorkspaceSettings /></PrivateRoute>}
                    />
                    {/* Nouvelle route pour les paramètres du profil */}
                    <Route path="/profile-settings" element={<PrivateRoute><ProfileSettings /></PrivateRoute>} />
                    {/* Nouvelle route pour la page À propos */}
                    <Route path="/about" element={<PrivateRoute><About /></PrivateRoute>} />

                    {/* 404 */}
                    <Route
                        path="*"
                        element={
                            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                404 Not Found
                            </div>
                        }
                    />
                </Routes>
            </div>
        </div>
    );
}

export default App;
