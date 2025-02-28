// src/pages/Login.js
import React, { useState } from 'react';
import axios from '../services/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // POST /api/auth/login
            const response = await axios.post('/api/auth/login', {
                email,
                password,
            });

            // Récupère { token, user }
            const { token, user } = response.data || {};

            if (!token) {
                alert('Login failed (no token)');
                return;
            }

            // Stocker le token
            localStorage.setItem('token', token);
            axios.defaults.headers.common['x-auth-token'] = token;

            // Stocker l'userId si présent
            if (user && user._id) {
                localStorage.setItem('userId', user._id);
            }

            // Rediriger vers /chat
            navigate('/chat');
        } catch (err) {
            console.error('Erreur login :', err);
            if (err.response && err.response.data && err.response.data.msg) {
                alert(err.response.data.msg);
            } else {
                alert('Login failed');
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2 className="login-title">Se connecter</h2>

                <div className="login-avatar-circle" />

                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="email"
                        placeholder="Adresse mail..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input"
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        required
                    />

                    <div className="login-options">
                        {/* Lien “Mot de passe oublié ?” (facultatif) */}
                        <Link to="/forgot-password">Mot de passe oublié ?</Link>
                    </div>

                    <button type="submit" className="login-submit-btn">
                        Valider
                    </button>
                </form>

                <div className="login-separator">OU</div>

                <div className="login-socials">
                    <button className="social-btn google-btn">Google</button>
                    <button className="social-btn facebook-btn">Facebook</button>
                </div>

                {/* Lien vers la page Register */}
                <div className="login-footer-link">
                    <span>Vous n’avez pas de compte ?</span>{' '}
                    <Link to="/register" style={{ color: '#fff', textDecoration: 'underline' }}>
                        Inscription
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
