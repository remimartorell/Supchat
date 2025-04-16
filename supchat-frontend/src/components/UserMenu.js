// src/components/UserMenu.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserMenu.css';

const UserMenu = () => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    const toggleMenu = () => {
        setOpen((prev) => !prev);
    };

    const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
            setOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSettings = () => {
        navigate('/profile-settings');
        setOpen(false);
    };

    const handleAbout = () => {
        navigate('/about');
        setOpen(false);
    };

    const handleLogout = () => {
        // Supprimer le token et le thème stocké
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('appTheme'); // Supprimer l'ancienne valeur de thème
        navigate('/login');
        setOpen(false);
    };

    return (
        <div className="user-menu" ref={menuRef}>
            <button className="user-menu-trigger" onClick={toggleMenu}>
                <div className="burger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>

            {open && (
                <div className="user-menu-dropdown">
                    <div className="user-menu-item" onClick={handleSettings}>
                        Paramètres
                    </div>
                    <div className="user-menu-item" onClick={handleAbout}>
                        À propos
                    </div>
                    <div className="user-menu-item" onClick={handleLogout}>
                        Déconnexion
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
