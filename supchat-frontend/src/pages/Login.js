// src/pages/Login.js
import React, { useState } from 'react';
import axios from '../services/axiosConfig';
import { useNavigate } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Appel au backend : POST /api/auth/login
            const response = await axios.post('/api/auth/login', {
                email,
                password,
            });
            // Suppose que le back renvoie : { token: "..." }
            const { token } = response.data;

            // On stocke le token dans localStorage
            localStorage.setItem('token', token);
            // On met à jour axios pour les futures requêtes
            axios.defaults.headers.common['x-auth-token'] = token;

            // On redirige vers /chat
            navigate('/chat');
        } catch (err) {
            console.error('Erreur login :', err);
            alert('Login failed');
        }
    };

    return (
        <div style={{ margin: '20px' }}>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email : </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password : </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Se connecter</button>
            </form>
        </div>
    );
}

export default Login;