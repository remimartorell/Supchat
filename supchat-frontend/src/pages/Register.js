// src/pages/Register.js
import React, { useState } from 'react';
import axios from '../services/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // POST /api/auth/register
            const response = await axios.post('/api/auth/register', {
                name,
                email,
                password,
            });

            // On récupère token et user éventuels
            const { token, user } = response.data || {};

            if (token) {
                // On stocke le token
                localStorage.setItem('token', token);
                axios.defaults.headers.common['x-auth-token'] = token;

                // stocker userId si dispo
                if (user && user._id) {
                    localStorage.setItem('userId', user._id);
                }

                // Rediriger
                navigate('/chat');
            } else {
                alert('Register: no token returned');
            }
        } catch (err) {
            console.error('Erreur register :', err);
            alert('Register failed');
        }
    };

    return (
        <div className="register-container">
            <div className="register-box">
                <h2 className="register-title">Créer un compte</h2>

                <form onSubmit={handleSubmit} className="register-form">
                    <input
                        type="text"
                        placeholder="Votre nom..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="register-input"
                    />
                    <input
                        type="email"
                        placeholder="Adresse mail..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="register-input"
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="register-input"
                    />

                    <button type="submit" className="register-submit-btn">
                        Inscription
                    </button>
                </form>

                <div className="register-footer-link">
                    <span>Déjà un compte ? </span>
                    <Link to="/login" style={{ color: '#fff', textDecoration: 'underline' }}>
                        Se connecter
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Register;