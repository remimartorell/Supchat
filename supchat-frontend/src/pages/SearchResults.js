// src/pages/SearchResults.js
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../services/axiosConfig';

function SearchResults() {
    const location = useLocation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({
        channels: [],
        users: [],
        channelMessages: [],
        dmMessages: [],
    });

    // Extraire le param ?query=xxx
    // ex: /search?query=hello
    const queryParams = new URLSearchParams(location.search);
    const query = queryParams.get('query') || '';

    useEffect(() => {
        if (!query) return; // si vide, ne pas chercher
        fetchSearchResults();
        // eslint-disable-next-line
    }, [query]);

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

    // Quand on clique sur un channel (ex: channels[i]), on veut ouvrir Chat + handleSelectChannel
    const handleChannelClick = (channelId) => {
        // On peut naviguer vers /chat?channelId=channelId
        // et dans Chat.js, si on voit channelId dans location.search, on appelle handleSelectChannel(channelId)
        navigate(`/chat?channelId=${channelId}`);
    };

    // Pareil pour DM
    const handleUserClick = (userId) => {
        // Ouvrir DM
        navigate(`/chat?userId=${userId}`);
    };

    // Sur un "channelMessage", on a ._id, .channel? => on veut naviguer vers /chat?channelId=...&focusMsg=...
    const handleChannelMessageClick = (msg) => {
        const channelId = msg.channel?._id || msg.channel; // si c'est un Object ou string
        // Naviguer vers /chat?channelId=xxx&focusMsg=xxx
        navigate(`/chat?channelId=${channelId}&focusMsg=${msg._id}`);
    };


    // Sur un "dmMessage"
    const handleDMMessageClick = (dm) => {
        /*const me = localStorage.getItem('userId');
        const senderId = String(dm.sender?._id);
        const receiverId = String(dm.receiver?._id);

        let otherUserId;
        if (senderId === me) {
            // si c'est moi l'envoyeur, l'autre est dm.receiver
            otherUserId = dm.receiver?._id;
        } else {
            otherUserId = dm.sender?._id;
        }
        navigate(`/chat?userId=${otherUserId}&focusMsg=${dm._id}`); */

        const me = localStorage.getItem('userId') || '';     // string
        const senderId = String(dm.sender?._id || '');       // convert
        const receiverId = String(dm.receiver?._id || '');   // convert

        if (senderId === me) {
            // c'est moi l'envoyeur => conversation DM avec le receiver
            navigate(`/chat?userId=${receiverId}&focusMsg=${dm._id}`);
        } else {
            // c'est l'autre qui a envoyé => conversation DM avec sender
            navigate(`/chat?userId=${senderId}&focusMsg=${dm._id}`);
        }

    };

    // Style pour les "cards"
    const cardStyle = {
        border:'1px solid #ccc',
        padding:'8px',
        width:'280px',
        cursor:'pointer',
        transition:'background 0.2s',
    };
    const cardHoverStyle = {
        background:'#f0f0f0'
    };

    return (
        <div style={{ padding:'10px' }}>
            <h2>Résultats de la recherche pour : "{query}"</h2>
            {loading && <p>Recherche en cours...</p>}

            <h3>Channels ({results.channels.length})</h3>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
                {results.channels.map(ch => (
                    <div
                        key={ch._id}
                        onClick={() => handleChannelClick(ch._id)}
                        style={cardStyle}
                        onMouseOver={(e) => e.currentTarget.style.background='#f0f0f0'}
                        onMouseOut={(e) => e.currentTarget.style.background=''}
                    >
                        <div><strong>{ch.name}</strong> <small>({ch.type})</small></div>
                        <div style={{ fontSize:'0.9em', color:'#555' }}>Channel ID: {ch._id}</div>
                    </div>
                ))}
            </div>

            <h3>Users ({results.users.length})</h3>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
                {results.users.map(u => (
                    <div
                        key={u._id}
                        onClick={() => handleUserClick(u._id)}
                        style={cardStyle}
                        onMouseOver={(e) => e.currentTarget.style.background='#f0f0f0'}
                        onMouseOut={(e) => e.currentTarget.style.background=''}
                    >
                        <div><strong>{u.name}</strong></div>
                        <div style={{ fontSize:'0.9em', color:'#555' }}>{u.email}</div>
                    </div>
                ))}
            </div>

            <h3>Channel Messages ({results.channelMessages.length})</h3>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
                {results.channelMessages.map(msg => (
                    <div
                        key={msg._id}
                        onClick={() => handleChannelMessageClick(msg)}
                        style={cardStyle}
                        onMouseOver={(e) => e.currentTarget.style.background='#f0f0f0'}
                        onMouseOut={(e) => e.currentTarget.style.background=''}
                    >
                        <div><strong>Channel:</strong> {msg.channel?.name}</div>
                        <div><strong>Sender:</strong> {msg.sender?.name}</div>
                        <div>{msg.content}</div>
                    </div>
                ))}
            </div>

            <h3>DM Messages ({results.dmMessages.length})</h3>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'10px' }}>
                {results.dmMessages.map(dm => {
                    const senderName = dm.sender?.name || '???';
                    const receiverName = dm.receiver?.name || '???';
                    return (
                        <div
                            key={dm._id}
                            onClick={() => handleDMMessageClick(dm)}
                            style={cardStyle}
                            onMouseOver={(e) => e.currentTarget.style.background='#f0f0f0'}
                            onMouseOut={(e) => e.currentTarget.style.background=''}
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