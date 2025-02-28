// src/pages/ForgotPassword.js
import React, { useState } from 'react';
import axios from '../services/axiosConfig';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/auth/forgot-password', { email });
            setMessage(res.data.msg || 'Check your inbox!');
        } catch (err) {
            console.error(err);
            setMessage('Something went wrong.');
        }
    };

    return (
        <div className="login-container"> {/* on réutilise le style global */}
            <div className="login-box">
                <h2 className="login-title">Réinitialiser le mot de passe</h2>

                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="email"
                        placeholder="Votre email..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input"
                    />

                    <button type="submit" className="login-submit-btn">
                        Envoyer
                    </button>
                </form>

                {message && <p style={{ marginTop: '1rem' }}>{message}</p>}

                <div className="login-footer-link" style={{ marginTop: '1rem' }}>
                    <span>Retour à </span>
                    <a href="/login" style={{ color: '#fff', textDecoration: 'underline' }}>
                        la connexion
                    </a>
                </div>
            </div>
        </div>
    );
}


export default ForgotPassword;
