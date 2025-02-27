// src/pages/ProfileSettings.js
import React, { useState, useEffect } from 'react';
import axios from '../services/axiosConfig';
import './ProfileSettings.css';
import '../styles/themes.css';

const ProfileSettings = () => {
    const [pseudo, setPseudo] = useState('');
    const [email, setEmail] = useState('');

    const [changePassword, setChangePassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'default');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get('/api/auth/user');
                setPseudo(res.data.name);
                setEmail(res.data.email);
            } catch (err) {
                console.error("Erreur lors de la récupération des infos utilisateur", err);
            }
        };
        fetchUser();
    }, []);

    // Applique la classe .theme-xxx
    useEffect(() => {
        document.body.classList.remove('theme-default', 'theme-white', 'theme-contrast');
        document.body.classList.add(`theme-${theme}`);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleSave = async () => {
        if (changePassword) {
            if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
                return alert("Veuillez remplir tous les champs pour changer le mot de passe.");
            }
            if (newPassword !== confirmPassword) {
                return alert("Le nouveau mot de passe et la confirmation ne correspondent pas.");
            }
        }

        try {
            const payload = { name: pseudo, email: email };
            if (changePassword) {
                payload.oldPassword = oldPassword;
                payload.newPassword = newPassword;
                payload.confirmPassword = confirmPassword;
            }
            await axios.put('/api/auth/update', payload);
            alert('Profil mis à jour');

            // reset champs
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setChangePassword(false);

        } catch (err) {
            console.error("Erreur lors de la mise à jour du profil", err);
            if (err.response?.data?.msg) {
                alert(err.response.data.msg);
            } else {
                alert("Erreur lors de la mise à jour");
            }
        }
    };

    const handleThemeChange = (e) => {
        setTheme(e.target.value);
    };

    return (
        <div className="profile-settings-container">
            <h2>Paramètres du profil</h2>

            {/* PSEUDO */}
            <div className="profile-form-group">
                <label>Pseudo :</label>
                <input
                    type="text"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                />
            </div>

            {/* EMAIL */}
            <div className="profile-form-group">
                <label>Email :</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            {/* BOUTON ENREGISTRER sous pseudo + email */}
            <button onClick={handleSave} className="save-button">
                Enregistrer
            </button>

            <hr />

            {/* CHANGER MOT DE PASSE */}
            {!changePassword ? (
                <button onClick={() => setChangePassword(true)} className="toggle-password-btn">
                    Changer le mot de passe
                </button>
            ) : (
                <div className="password-form">
                    <div className="profile-form-group">
                        <label>Ancien mot de passe :</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="profile-form-group">
                        <label>Nouveau mot de passe :</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="profile-form-group">
                        <label>Confirmer le nouveau mot de passe :</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setChangePassword(false)} className="toggle-password-btn">
                        Annuler le changement de mot de passe
                    </button>
                </div>
            )}

            <hr />

            {/* THEME */}
            <div className="theme-radio-group">
                <p>Thème :</p>
                <label className="theme-radio-option">
                    <input
                        type="radio"
                        name="theme"
                        value="default"
                        checked={theme === 'default'}
                        onChange={handleThemeChange}
                    />
                    <span>Thème actuel (défaut)</span>
                </label>
                <label className="theme-radio-option">
                    <input
                        type="radio"
                        name="theme"
                        value="white"
                        checked={theme === 'white'}
                        onChange={handleThemeChange}
                    />
                    <span>Thème blanc</span>
                </label>
                <label className="theme-radio-option">
                    <input
                        type="radio"
                        name="theme"
                        value="contrast"
                        checked={theme === 'contrast'}
                        onChange={handleThemeChange}
                    />
                    <span>Thème contrasté</span>
                </label>
            </div>
        </div>
    );
};

export default ProfileSettings;
