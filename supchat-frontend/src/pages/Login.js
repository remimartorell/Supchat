import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from '../services/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/api/auth/login', { email, password });
            const { token, user } = response.data || {};
            if (!token) {
                alert('Échec de la connexion (aucun token)');
                return;
            }
            localStorage.setItem('token', token);
            axios.defaults.headers.common['x-auth-token'] = token;
            if (user && user._id) {
                localStorage.setItem('userId', user._id);
            }
            navigate('/chat');
        } catch (err) {
            console.error('Erreur login :', err);
            alert(err.response?.data?.msg || 'Échec de la connexion');
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
                    <div className="password-field">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mot de passe..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="login-input"
                            required
                        />
                        <span
                            className="password-toggle"
                            onClick={() => setShowPassword((v) => !v)}
                        >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
                    </div>
                    <div className="login-options">
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
                <div className="login-footer-link">
                    <span>Vous n’avez pas de compte ?</span>{' '}
                    <Link to="/register">Inscription</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
