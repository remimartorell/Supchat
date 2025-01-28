// src/App.js
import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate} from 'react-router-dom';
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
        // On redirige vers /search?query=...
        navigate(`/search?query=${encodeURIComponent(searchInput.trim())}`);
    };

    return (
        <div id="root-app">
            <div className="navbar">
                <nav style={{padding: '10px', background: '#eee'}}>
                    {!token && (
                        <>
                            <Link to="/login" style={{marginRight: '10px'}}>Login</Link>
                            <Link to="/register" style={{marginRight: '10px'}}>Register</Link>
                        </>
                    )}
                    {token && (
                        <>
                            <Link to="/chat">Chat</Link>
                            <button onClick={handleLogout} className={"logout"}>Logout</button>
                            <form onSubmit={handleSearchSubmit} style={{display: 'inline-block', marginLeft: '20px'}}>
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
                </nav>
            </div>

            <div className="app-container">
                <Routes>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/register" element={<Register/>}/>

                    <Route
                        path="/chat"
                        element={
                            <PrivateRoute>
                                <Chat/>
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
                    {/* Page d'accueil */}
                    <Route path="/" element={<div>Accueil</div>}/>

                    {/* 404 */}
                    <Route path="*" element={<div>404 Not Found</div>}/>
                </Routes>
            </div>
        </div>
    );
}

export default App;