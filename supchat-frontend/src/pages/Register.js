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
            const response = await axios.post('/api/auth/register', { name, email, password });
            // On vérifie si un token est retourné
            if (!response.data.token) {
                // Aucun token n'est retourné : c'est normal, on affiche le message de confirmation
                alert(response.data.msg || 'Inscription réussie ! Veuillez vérifier votre email pour activer votre compte.');
                navigate('/login'); // Rediriger vers la page de connexion
            } else {
                // Cas rare si le serveur renvoie un token (optionnel)
                localStorage.setItem('token', response.data.token);
                axios.defaults.headers.common['x-auth-token'] = response.data.token;
                if (response.data.user && response.data.user._id) {
                    localStorage.setItem('userId', response.data.user._id);
                }
                navigate('/chat');
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