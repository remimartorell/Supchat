// src/App.js
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import PrivateRoute from './components/PrivateRoute';

function App() {
    return (
        <div>
            <nav style={{ padding: '10px', background: '#eee' }}>
                <Link to="/login" style={{ marginRight: '10px' }}>Login</Link>
                <Link to="/register" style={{ marginRight: '10px' }}>Register</Link>
                <Link to="/chat">Chat</Link>
            </nav>

            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route
                    path="/chat"
                    element={
                        <PrivateRoute>
                            <Chat />
                        </PrivateRoute>
                    }
                />

                {/* Page d'accueil */}
                <Route path="/" element={<div>Accueil</div>} />

                {/* 404 */}
                <Route path="*" element={<div>404 Not Found</div>} />
            </Routes>
        </div>
    );
}

export default App;