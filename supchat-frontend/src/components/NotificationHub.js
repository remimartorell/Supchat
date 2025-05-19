// src/components/NotificationHub.js
import React, { useEffect, useState } from 'react';
import axios from '../services/axiosConfig';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';
import './NotificationHub.css';

const NotificationHub = ({ socket }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount,    setUnreadCount]    = useState(0);
    const [showDropdown,   setShowDropdown]   = useState(false);
    const navigate = useNavigate();

    // 1) Chargement initial des notifs
    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get('/api/notifications');
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.read).length);
            } catch (e) {
                console.error('Erreur fetch notifications :', e);
            }
        })();
    }, []);

    // 2) Réception socket + récupération complète si besoin
    useEffect(() => {
        if (!socket) return;

        const onNew = async (notif) => {
            let fullNotif = notif;

            // Si fromUser.username n’est pas fourni via le socket, on va chercher la notif populée
            if (!notif.fromUser?.username) {
                try {
                    const { data } = await axios.get(`/api/notifications/${notif._id}`);
                    fullNotif = data;
                } catch (err) {
                    console.error('Impossible de récupérer la notification peuplée :', err);
                }
            }

            setNotifications(prev => [fullNotif, ...prev]);
            setUnreadCount(c => c + 1);
        };

        socket.on('new-notification', onNew);
        return () => socket.off('new-notification', onNew);
    }, [socket]);

    // 3) Clic sur une notif
    const handleClick = async (notif) => {
        if (!notif.read) {
            try {
                const { data: updated } = await axios.put(`/api/notifications/${notif._id}/read`);
                // remplace la notif dans notre state pour avoir fromUser.username + read=true
                setNotifications(prev =>
                    prev.map(n => n._id === updated._id ? updated : n)
                );
                setUnreadCount(c => Math.max(c - 1, 0));
            } catch (err) {
                console.error('Erreur marking read :', err);
            }
        }
        // navigation vers le chat + focus message
        const params = new URLSearchParams({ channelId: notif.channel });
        if (notif.messageId) params.set('focusMsg', notif.messageId);
        navigate(`/chat?${params.toString()}`);
        setShowDropdown(false);
    };

    return (
        <div className="notification-hub-container">
            <IoMdNotificationsOutline
                size={24}
                className="notification-bell-icon"
                onClick={() => setShowDropdown(v => !v)}
            />
            {unreadCount > 0 && (
                <div className="notification-badge">{unreadCount}</div>
            )}
            {showDropdown && (
                <div className="notification-dropdown">
                    {notifications.length === 0
                        ? <div className="notification-item empty">Aucune notification</div>
                        : notifications.map(notif => (
                            <div
                                key={notif._id}
                                className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                                onClick={() => handleClick(notif)}
                            >
                                <div className="notification-message">{notif.message}</div>
                                <div className="notification-meta">
                                    {notif.fromUser?.username && (
                                        <span className="notification-from">
                      @{notif.fromUser.username}
                    </span>
                                    )}
                                    <span className="notification-time">
                    {new Date(notif.createdAt)
                        .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    }
                  </span>
                                </div>
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    );
};

export default NotificationHub;
