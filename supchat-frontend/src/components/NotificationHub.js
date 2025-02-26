// src/components/NotificationHub.js
import React, { useEffect, useState } from 'react';
import axios from '../services/axiosConfig';
import { IoMdNotificationsOutline } from 'react-icons/io';
import { useNavigate } from 'react-router-dom';
import './NotificationHub.css';

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
        <div className="notification-hub-container">
            {/* Icône cloche */}
            <IoMdNotificationsOutline
                size={24}
                className="notification-bell-icon"
                onClick={() => setShowDropdown(prev => !prev)}
            />
            {unreadCount > 0 && (
                <div className="notification-badge">
                    {unreadCount}
                </div>
            )}
            {showDropdown && (
                <div className="notification-dropdown">
                    {notifications.length === 0 ? (
                        <div className="notification-item">
                            Aucune notification
                        </div>
                    ) : (
                        notifications.map(notif => (
                            <div
                                key={notif._id}
                                className="notification-item"
                                style={{
                                    background: notif.read ? '#444' : '#6858c4'
                                }}
                                onClick={() => handleNotificationClick(notif)}
                            >
                                <div style={{ fontSize: '14px' }}>
                                    {notif.message}
                                </div>
                                <div style={{ fontSize: '10px', color: '#ccc' }}>
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