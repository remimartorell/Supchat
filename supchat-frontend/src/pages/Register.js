// src/pages/Register.js
import React, { useState } from 'react';
import axios from '../services/axiosConfig';
import { useNavigate } from 'react-router-dom';

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // POST /api/auth/register
            // Ton backend doit être configuré pour accepter { name, email, password }
            const response = await axios.post('/api/auth/register', {
                name,
                email,
                password,
            });

            // Suppose qu'il renvoie { token: "..." }
            const { token } = response.data;

            if (token) {
                // On stocke le token
                localStorage.setItem('token', token);
                axios.defaults.headers.common['x-auth-token'] = token;
                navigate('/chat');
            } else {
                // Si pas de token, on redirige sur /login (au choix)
                navigate('/login');
            }
        } catch (err) {
            console.error('Erreur register :', err);
            alert('Register failed');
        }
    };

    return (
        <div style={{ margin: '20px' }}>
            <h2>Register</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name : </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
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
                <button type="submit">S'enregistrer</button>
            </form>
        </div>
    );
}

export default Register;