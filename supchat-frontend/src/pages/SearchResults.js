// src/pages/SearchResults.js
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../services/axiosConfig';
import './SearchResults.css'; // Import du fichier CSS pour le design

function SearchResults() {
    const location = useLocation();
    const navigate = useNavigate();

    // Loading + résultats
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({
        channels: [],
        users: [],
        channelMessages: [],
        dmMessages: [],
    });

    // Récup ?query=xxx depuis l'URL
    const queryParams = new URLSearchParams(location.search);
    const query = queryParams.get('query') || '';

    // On stocke localement le "searchTerm" pour la barre de recherche
    // afin de pouvoir modifier/rechercher à nouveau
    const [searchTerm, setSearchTerm] = useState(query);

    // Au premier montage (ou si query change), on refait une recherche
    useEffect(() => {
        if (!query) return; // ne pas chercher si vide
        fetchSearchResults();
        // eslint-disable-next-line
    }, [query]);

    // Appel au backend /api/search?query=xxx
    const fetchSearchResults = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/search?query=${encodeURIComponent(query)}`);
            setResults(res.data);
        } catch (err) {
            console.error('Erreur fetchSearchResults', err);
        } finally {
            setLoading(false);
        }
    };

    // Soumission de la barre de recherche (en haut de page)
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;
        // Naviguer vers /search?query=searchTerm => déclenche l'effet
        navigate(`/search?query=${encodeURIComponent(searchTerm.trim())}`);
    };

    // Navigation : on réutilise vos fonctions
    const handleChannelClick = (channelId) => {
        navigate(`/chat?channelId=${channelId}`);
    };
    const handleUserClick = (userId) => {
        navigate(`/chat?userId=${userId}`);
    };
    const handleChannelMessageClick = (msg) => {
        const channelId = msg.channel?._id || msg.channel;
        navigate(`/chat?channelId=${channelId}&focusMsg=${msg._id}`);
    };
    const handleDMMessageClick = (dm) => {
        const me = localStorage.getItem('userId') || '';
        const senderId = String(dm.sender?._id || dm.sender);
        const receiverId = String(dm.receiver?._id || dm.receiver);

        let otherUserId = (senderId === me) ? receiverId : senderId;
        navigate(`/chat?userId=${otherUserId}&focusMsg=${dm._id}`);
    };

    return (
        <div className="search-results-container">
            {/* Barre de recherche en haut (form design) */}
            <h2 className="search-results-title">
                Résultats de la recherche pour : "{query}"
            </h2>
            {loading && <p>Recherche en cours...</p>}

            {/* Liste des channels */}
            <h3>Channels ({results.channels.length})</h3>
            <div className="search-results-cards-container">
                {results.channels.map((ch) => (
                    <div
                        key={ch._id}
                        className="search-results-card"
                        onClick={() => handleChannelClick(ch._id)}
                    >
                        <div>
                            <strong>{ch.name}</strong> <small>({ch.type})</small>
                        </div>
                        <div className="search-results-subtext">
                            Channel ID: {ch._id}
                        </div>
                    </div>
                ))}
            </div>

            {/* Liste des users */}
            <h3>Users ({results.users.length})</h3>
            <div className="search-results-cards-container">
                {results.users.map((u) => (
                    <div
                        key={u._id}
                        className="search-results-card"
                        onClick={() => handleUserClick(u._id)}
                    >
                        <div><strong>{u.name}</strong></div>
                        <div className="search-results-subtext">{u.email}</div>
                    </div>
                ))}
            </div>

            {/* Liste des messages channel */}
            <h3>Channel Messages ({results.channelMessages.length})</h3>
            <div className="search-results-cards-container">
                {results.channelMessages.map((msg) => (
                    <div
                        key={msg._id}
                        className="search-results-card"
                        onClick={() => handleChannelMessageClick(msg)}
                    >
                        <div><strong>Channel:</strong> {msg.channel?.name}</div>
                        <div><strong>Sender:</strong> {msg.sender?.name}</div>
                        <div>{msg.content}</div>
                    </div>
                ))}
            </div>

            {/* Liste des messages DM */}
            <h3>DM Messages ({results.dmMessages.length})</h3>
            <div className="search-results-cards-container">
                {results.dmMessages.map((dm) => {
                    const senderName = dm.sender?.name || '???';
                    const receiverName = dm.receiver?.name || '???';
                    return (
                        <div
                            key={dm._id}
                            className="search-results-card"
                            onClick={() => handleDMMessageClick(dm)}
                        >
                            <div><strong>Sender:</strong> {senderName}</div>
                            <div><strong>Receiver:</strong> {receiverName}</div>
                            <div>{dm.content}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default SearchResults;