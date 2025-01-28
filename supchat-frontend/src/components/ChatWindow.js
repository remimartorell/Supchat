// src/components/ChatWindow.js
import React, { useEffect, useRef } from 'react';
import axios from '../services/axiosConfig';

function highlightMentions(content, validMentions) {
    if (!content) {
        return content;
    }
    return content.split(/\s+/).map((word, i) => {
        if (word.startsWith('@')) {
            const mentionName = word.slice(1);
            if (validMentions.includes(mentionName)) {
                return (
                    <span key={i} style={{ color: 'blue', fontWeight: 'bold' }}>
            {word}{' '}
          </span>
                );
            }
        }
        return word + ' ';
    });
}

function ChatWindow({
                        userId,
                        messages,
                        selectedUser,
                        selectedChannel,
                        focusMessageId,
                        canDelete,
                        setMessages, // on suppose qu'on peut manipuler setMessages depuis Chat.js
                    }) {
    const listRef = useRef(null);

    // Auto-scroll sur focusMessageId
    useEffect(() => {
        if (focusMessageId) {
            setTimeout(() => {
                const el = document.getElementById(`msg-${focusMessageId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.transition = 'background-color 0.5s';
                    el.style.backgroundColor = '#aaf';
                    setTimeout(() => {
                        el.style.backgroundColor = '';
                    }, 2000);
                }
            }, 100);
        }
    }, [focusMessageId, messages]);

    // Affichage du mode (DM ou channel)
    let mode = 'Aucun';
    if (selectedUser) {
        mode = `DM avec ${selectedUser}`;
    } else if (selectedChannel) {
        mode = `Channel ${selectedChannel}`;
    }

    // Fonction de suppression du message
    const handleDeleteMsg = async (m) => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            // Supprimer le message côté back
            await axios.delete(`/api/channels/${m.channel}/messages/${m._id}`);
            // Retirer le message en local
            setMessages((prev) => prev.filter((msg) => msg._id !== m._id));
        } catch (err) {
            console.error('Erreur suppression message:', err);
            alert('Impossible de supprimer ce message');
        }
    };

    return (
        <div style={{ flexGrow: 1, padding: '10px', overflowY: 'auto' }}>
            <h4>ChatWindow : {mode}</h4>

            <div
                ref={listRef}
                style={{ height: '70vh', overflowY: 'auto', border: '1px solid #ccc' }}
            >
                {messages.map((m) => {
                    // 1) Determine senderLabel
                    let senderLabel = '';
                    if (m.sender && typeof m.sender === 'object') {
                        senderLabel = m.sender.name || '(Sans nom)';
                    } else {
                        senderLabel = m.sender || '';
                    }

                    // 2) Determine receiverLabel
                    let receiverLabel = '';
                    if (m.receiver) {
                        if (typeof m.receiver === 'object') {
                            receiverLabel = m.receiver.name || '(Sans nom)';
                        } else {
                            receiverLabel = m.receiver;
                        }
                    } else if (m.channelName) {
                        receiverLabel = `#${m.channelName}`;
                    } else {
                        receiverLabel = '(Inconnu)';
                    }

                    // 3) Couleur de fond
                    const isMe =
                        (m.sender && typeof m.sender === 'object' && m.sender._id === userId) ||
                        m.sender === userId;
                    const bg = isMe ? '#def' : '#fed';

                    const text = m.content || '';
                    const valid = m.validMentions || [];

                    return (
                        <div
                            key={m._id}
                            id={`msg-${m._id}`}
                            style={{ margin: '8px', padding: '5px', background: bg }}
                        >
                            <strong>From:</strong> {senderLabel}
                            <br />
                            <strong>To:</strong> {receiverLabel}
                            <br />
                            <strong>Content:</strong> {highlightMentions(text, valid)}
                            <br />

                            {/* SI FILEURL */}
                            {m.fileUrl &&
                                (m.fileUrl.match(/\.(png|jpe?g|gif)$/i) ? (
                                    <div>
                                        <img
                                            src={m.fileUrl}
                                            alt="file"
                                            style={{ maxWidth: '200px', height: 'auto' }}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                            Télécharger le fichier
                                        </a>
                                    </div>
                                ))}

                            <small>{m.createdAt}</small>

                            {/* Bouton (X) si canDelete */}
                            {canDelete && (
                                <button
                                    onClick={() => handleDeleteMsg(m)}
                                    style={{ marginLeft: '10px', backgroundColor: '#f88' }}
                                >
                                    X
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ChatWindow;