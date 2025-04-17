// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';
import SearchResults from './pages/SearchResults';
import WorkspaceSettings from './pages/WorkspaceSettings';
import NotificationHub from './components/NotificationHub';
import UserMenu from './components/UserMenu';
import ProfileSettings from './pages/ProfileSettings';
import About from './pages/About';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import './App.css';
import './styles/themes.css';

function App() {
    const navigate = useNavigate();
    const location = useLocation();

    const [searchInput, setSearchInput] = useState('');
    const token = localStorage.getItem('token') || '';
    const [theSocket, setTheSocket] = useState(null);

    // Appliquer le thème dès le chargement (optionnel, car déjà géré dans index.js)
    useEffect(() => {
        const savedTheme = localStorage.getItem('appTheme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    // Utilisé pour masquer la navbar sur certaines pages
    const hideNavbarPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
    const shouldHideNavbar = hideNavbarPaths.includes(location.pathname);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchInput.trim()) return;
        navigate(`/search?query=${encodeURIComponent(searchInput.trim())}`);
    };

    // --------------------------
    // Intégration du bot de rappel de réunion
    // --------------------------
    useEffect(() => {
        if (theSocket) {
            theSocket.on('meeting-reminder', (data) => {
                // data doit contenir meetingTitle et meetingTime
                alert(`Rappel Réunion : ${data.meetingTitle} à ${data.meetingTime}`);
                // Vous pouvez remplacer alert par une notification personnalisée
            });
            return () => {
                theSocket.off('meeting-reminder');
            };
        }
    }, [theSocket]);
    // --------------------------

    return (
        <div id="root-app">
            {!shouldHideNavbar && (
                <div className="navbar">
                    <div className="nav-left">
                        {token ? (
                            <Link to="/chat" className="chat-link">Chat</Link>
                        ) : (
                            <>
                                <Link to="/login">Login</Link>
                                <Link to="/register">Register</Link>
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
                        {token && (
                            <>
                                <NotificationHub socket={theSocket} />
                                <UserMenu />
                            </>
                        )}
                    </div>
                </div>
            )}
            <div className="app-container" style={{ marginTop: shouldHideNavbar ? 0 : '60px' }}>
                <Routes>
                    <Route
                        path="/"
                        element={
                            token ? (
                                <Navigate to="/chat" replace />
                            ) : (
                                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                    <h2>Accueil</h2>
                                    <p>Bienvenue sur SupChat !</p>
                                    <div style={{ marginTop: '20px' }}>
                                        <button onClick={() => navigate('/login')}>Aller à Login</button>
                                        <button onClick={() => navigate('/register')}>Aller à Register</button>
                                    </div>
                                </div>
                            )
                        }
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/chat" element={<PrivateRoute><Chat onSocketReady={setTheSocket} /></PrivateRoute>} />
                    <Route path="/search" element={<PrivateRoute><SearchResults /></PrivateRoute>} />
                    <Route path="/workspace/:workspaceId/settings" element={<PrivateRoute><WorkspaceSettings /></PrivateRoute>} />
                    <Route path="/profile-settings" element={<PrivateRoute><ProfileSettings /></PrivateRoute>} />
                    <Route path="/about" element={<PrivateRoute><About /></PrivateRoute>} />
                    <Route path="*" element={<div style={{ textAlign: 'center', marginTop: '40px' }}>404 Not Found</div>} />
                </Routes>
            </div>
        </div>
    );
}

export default App;
