// src/App.js
import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';
import SearchResults from './pages/SearchResults';
import WorkspaceSettings from './pages/WorkspaceSettings';

function App() {
    const navigate = useNavigate();
    const [searchInput, setSearchInput] = useState('');
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.reload();
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchInput.trim()) return;
        navigate(`/search?query=${encodeURIComponent(searchInput.trim())}`);
    };

    return (
        <div id="root-app">
            {/* NAVBAR */}
            <div className="navbar">
                <nav
                    style={{
                        padding: '10px',
                        background: '#eee',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <div>
                        {!token && (
                            <>
                                <Link to="/login" style={{ marginRight: '10px' }}>Login</Link>
                                <Link to="/register" style={{ marginRight: '10px' }}>Register</Link>
                            </>
                        )}
                        {token && (
                            <>
                                <Link to="/chat" style={{ marginRight: '10px' }}>Chat</Link>
                                <button onClick={handleLogout} className="logout" style={{ marginRight: '10px' }}>
                                    Logout
                                </button>
                                <form onSubmit={handleSearchSubmit} style={{ display: 'inline-block', marginRight: '10px' }}>
                                    <input
                                        type="text"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        placeholder="Rechercher..."
                                        style={{ marginRight: '5px' }}
                                    />
                                    <button type="submit">Go</button>
                                </form>
                            </>
                        )}
                    </div>
                </nav>
            </div>

            {/* ROUTES */}
            <div className="app-container">
                <Routes>
                    <Route
                        path="/"
                        element={
                            <div style={{ textAlign: 'center', marginTop: '40px' }}>
                                <h2>Accueil ou Chat</h2>
                                <p>Bienvenue sur Supchat!</p>
                                <div style={{ marginTop: '20px' }}>
                                    <button
                                        onClick={() => navigate('/login')}
                                        style={{ marginRight: '10px', padding: '10px 20px', cursor: 'pointer' }}
                                    >
                                        Aller à Login
                                    </button>
                                    <button
                                        onClick={() => navigate('/register')}
                                        style={{ padding: '10px 20px', cursor: 'pointer' }}
                                    >
                                        Aller à Register
                                    </button>
                                </div>
                            </div>
                        }
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* pages protégées => PrivateRoute */}
                    <Route
                        path="/chat"
                        element={
                            <PrivateRoute>
                                <Chat />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/search"
                        element={
                            <PrivateRoute>
                                <SearchResults />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/workspace/:workspaceId/settings"
                        element={
                            <PrivateRoute>
                                <WorkspaceSettings />
                            </PrivateRoute>
                        }
                    />

                    <Route path="*" element={<div style={{ textAlign: 'center', marginTop: '40px' }}>404 Not Found</div>} />
                </Routes>
            </div>
        </div>
    );
}

export default App;