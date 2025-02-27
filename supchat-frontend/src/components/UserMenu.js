import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserMenu.css';

const UserMenu = () => {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Pour ouvrir/fermer le menu
    const toggleMenu = () => {
        setOpen((prev) => !prev);
    };

    // Ferme le menu si on clique en dehors
    const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
            setOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Gestion des différentes actions
    const handleSettings = () => {
        navigate('/profile-settings');
        setOpen(false);
    };

    const handleAbout = () => {
        navigate('/about');
        setOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        navigate('/login');
        setOpen(false);
    };

    return (
        <div className="user-menu" ref={menuRef}>
            {/* Bouton hamburger */}
            <button className="user-menu-trigger" onClick={toggleMenu}>
                <div className="burger-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>

            {/* Dropdown affiché si open === true */}
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
