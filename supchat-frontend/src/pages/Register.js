import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import axios from '../services/axiosConfig';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!acceptedTerms) {
            alert('Vous devez accepter les Conditions d’utilisation & RGPD');
            return;
        }

        try {
            const response = await axios.post('/api/auth/register', {
                name,
                email,
                password,
                acceptedTerms, // on envoie maintenant la checkbox au back
            });

            // si pas de token, on tombe dans le flow "vérification email"
            if (!response.data.token) {
                alert(response.data.msg || 'Inscription réussie ! Vérifiez votre email pour activer votre compte.');
                navigate('/login');
            } else {
                // cas où le back renvoie directement un token
                localStorage.setItem('token', response.data.token);
                axios.defaults.headers.common['x-auth-token'] = response.data.token;
                if (response.data.user && response.data.user._id) {
                    localStorage.setItem('userId', response.data.user._id);
                }
                navigate('/chat');
            }
        } catch (err) {
            console.error('Erreur register :', err);
            // on affiche le msg renvoyé par le serveur si présent
            const serverMsg = err.response?.data?.msg;
            alert(serverMsg || 'Inscription échouée');
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
                    <div className="password-field">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mot de passe..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="register-input"
                        />
                        <span
                            className="password-toggle"
                            onClick={() => setShowPassword((v) => !v)}
                        >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
                    </div>
                    <div className="terms-field">
                        <input
                            type="checkbox"
                            id="acceptTerms"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                        />
                        <label htmlFor="acceptTerms">
                            J’accepte les{' '}
                            <Link to="/terms" target="_blank">
                                Conditions d’utilisation & RGPD
                            </Link>
                        </label>
                    </div>
                    <button
                        type="submit"
                        className="register-submit-btn"
                        disabled={!acceptedTerms}
                    >
                        Inscription
                    </button>
                </form>
                <div className="register-footer-link">
                    <span>Déjà un compte ? </span>
                    <Link to="/login">Se connecter</Link>
                </div>
            </div>
        </div>
    );
}

export default Register;
