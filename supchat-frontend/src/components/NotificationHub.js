// src/components/NotificationHub.js
import React, { useEffect, useState } from 'react';
import axios from '../services/axiosConfig';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';

const NotificationHub = ({ socket }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();

    // Récupérer les notifications initiales depuis l'API
    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/api/notifications');
            setNotifications(res.data);
            const unread = res.data.filter(n => !n.read).length;
            setUnreadCount(unread);
        } catch (err) {
            console.error('Erreur lors de la récupération des notifications', err);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // Écouter l'événement "new-notification" pour mettre à jour en temps réel
    useEffect(() => {
        if (!socket) return;
        const handleNewNotification = (notif) => {
            console.log('Notification reçue via socket:', notif);
            // Ajoute la nouvelle notification en début de liste
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
        };
        socket.on('new-notification', handleNewNotification);
        return () => {
            socket.off('new-notification', handleNewNotification);
        };
    }, [socket]);

    // Lorsqu'on clique sur une notification, la marquer comme lue et naviguer vers le message
    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            try {
                await axios.put(`/api/notifications/${notif._id}/read`);
                setNotifications(prev =>
                    prev.map(n => n._id === notif._id ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(prev - 1, 0));
            } catch (err) {
                console.error('Erreur lors de la mise à jour de la notification', err);
            }
        }
        // Navigation : si notif.messageId est présent, aller vers le message précis
        if (notif.messageId) {
            navigate(`/chat?channelId=${notif.channel}&focusMsg=${notif.messageId}`);
        } else {
            navigate(`/chat?channelId=${notif.channel}`);
        }
        setShowDropdown(false);
    };

    return (
        // Conteneur positionné absolument pour forcer l'affichage en haut à droite
        <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 200
        }}>
            {/* Icône de notification avec couleur explicite */}
            <IoMdNotificationsOutline
                size={28}
                style={{ cursor: 'pointer', color: '#000' }}
                onClick={() => setShowDropdown(prev => !prev)}
            />
            {unreadCount > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: 'red',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                }}>
                    {unreadCount}
                </div>
            )}
            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '35px',
                    right: 0,
                    width: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    background: 'white',
                    border: '1px solid #ccc',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 210
                }}>
                    {notifications.length === 0 ? (
                        <div style={{ padding: '10px' }}>Aucune notification</div>
                    ) : (
                        notifications.map(notif => (
                            <div key={notif._id}
                                 style={{
                                     padding: '10px',
                                     background: notif.read ? '#f9f9f9' : '#d6bbff', // Fond violet pour les non lues, gris pour les lues
                                     borderBottom: '1px solid #ddd',
                                     cursor: 'pointer'
                                 }}
                                 onClick={() => handleNotificationClick(notif)}
                            >
                                <div style={{ fontSize: '14px' }}>{notif.message}</div>
                                <div style={{ fontSize: '10px', color: '#999' }}>
                                    {new Date(notif.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationHub;