// src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

function PrivateRoute({ children }) {
    // On regarde si un token est présent dans localStorage
    const token = localStorage.getItem('token');

    // Si pas de token, on redirige vers /login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Sinon, on affiche la page enfant
    return children;
}

export default PrivateRoute;
