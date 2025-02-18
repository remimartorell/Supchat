// src/components/ChatWindow.js
import React, { useEffect, useRef, useState } from 'react';
import axios from '../services/axiosConfig';
import { IoMdCheckmarkCircle } from 'react-icons/io';

// Pas de changement à cette fonction
function highlightMentions(content, validMentions) {
    if (!content) return content;
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
                        users,
                        selectedUser,     // défini si DM
                        selectedChannel,  // défini si channel
                        focusMessageId,
                        canDelete,        // permet de supprimer un message si user est admin/owner
                        setMessages       // callback pour mettre à jour la liste
                    }) {
    const listRef = useRef(null);

    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);

    // Petite fonction pour obtenir la couleur de fond en fonction de isMe
    // On en profite pour forcer la couleur du texte (white)
    const getBgColor = (isMe) => (isMe ? '#2c2c44' : '#1f1f2f');

    // ---------------------------------------------
    //   Gérer le panel emoji
    // ---------------------------------------------
    const openEmojiPickerForMessage = (m) => {
        setShowEmojiPickerFor(m._id);
    };

    const handleChooseEmoji = (m, chosenEmoji) => {
        if (selectedChannel) {
            // => Channel
            axios.post(`/api/channels/${m.channel}/messages/${m._id}/reactions`, {
                emoji: chosenEmoji,
            })
                .then(() => setShowEmojiPickerFor(null))
                .catch(err => console.error('Channel reaction error:', err));
        } else if (selectedUser) {
            // => DM
            axios.post(`/api/direct-messages/${m._id}/reactions`, {
                emoji: chosenEmoji,
            })
                .then(() => setShowEmojiPickerFor(null))
                .catch(err => console.error('DM reaction error:', err));
        }
    };

    // ---------------------------------------------
    //   Gérer focus sur un message
    // ---------------------------------------------
    useEffect(() => {
        if (focusMessageId) {
            setTimeout(() => {
                const el = document.getElementById(`msg-${focusMessageId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.style.transition = 'background-color 0.5s';
                    el.style.backgroundColor = '#3a3af2'; // effet surbrillance
                    setTimeout(() => {
                        el.style.backgroundColor = '';
                    }, 2000);
                }
            }, 100);
        }
    }, [focusMessageId, messages]);

    // ---------------------------------------------
    //   Libellé en haut (DM ou channel)
    // ---------------------------------------------
    let modeLabel = 'Aucun';
    if (selectedUser) {
        modeLabel = `DM avec ${selectedUser}`;
    } else if (selectedChannel) {
        modeLabel = `Channel ${selectedChannel}`;
    }

    // ---------------------------------------------
    //   Suppression (channel only)
    // ---------------------------------------------
    const handleDeleteMsg = async (m) => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            // Suppression back
            await axios.delete(`/api/channels/${m.channel}/messages/${m._id}`);
            // Suppression côté front
            setMessages(prev => prev.filter(msg => msg._id !== m._id));
        } catch (err) {
            console.error('Erreur suppression message:', err);
            alert('Impossible de supprimer ce message');
        }
    };

    // ---------------------------------------------
    //   Édition message
    // ---------------------------------------------
    const startEditingMessage = (m) => {
        setEditingMessageId(m._id);
        setEditContent(m.content || '');
    };

    const handleSaveEdit = async (m) => {
        if (!editContent.trim()) {
            alert("Le contenu ne peut pas être vide.");
            return;
        }
        try {
            if (selectedChannel) {
                // => Channel
                await axios.put(`/api/channels/${m.channel}/messages/${m._id}`, {
                    newContent: editContent.trim(),
                });
            } else if (selectedUser) {
                // => DM
                await axios.put(`/api/direct-messages/${m._id}`, {
                    newContent: editContent.trim(),
                });
            }
            setEditingMessageId(null);
            setEditContent('');
        } catch (err) {
            console.error('Erreur lors de l’édition du message', err);
            alert('Impossible de modifier ce message');
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    // ---------------------------------------------
    //   RENDER
    // ---------------------------------------------
    return (
        <div style={{
            flexGrow: 1,
            padding: '10px',
            overflowY: 'auto',
            // On peut forcer une autre police ici
            fontFamily: '"Lucida Console", monospace'
        }}>
            <h4>ChatWindow : {modeLabel}</h4>

            <div
                ref={listRef}
                style={{
                    height: '70vh',
                    overflowY: 'auto',
                    border: '1px solid #444',
                    padding: '5px'
                }}
            >
                {messages.map((m) => {
                    // Est-ce mon message ?
                    const isMe =
                        (m.sender && typeof m.sender === 'object' && m.sender._id === userId)
                        || (m.sender === userId);

                    // Label expéditeur
                    let senderLabel = '';
                    if (m.sender && typeof m.sender === 'object') {
                        senderLabel = m.sender.name || '(Sans nom)';
                    } else {
                        senderLabel = m.sender || '';
                    }

                    // Label destinataire
                    let receiverLabel = '';
                    if (m.receiver) {
                        // DM
                        receiverLabel =
                            typeof m.receiver === 'object'
                                ? (m.receiver.name || '(Sans nom)')
                                : m.receiver;
                    } else if (m.channelName) {
                        receiverLabel = `#${m.channelName}`;
                    } else {
                        receiverLabel = '(Inconnu)';
                    }

                    // Couleur de fond plus sombre
                    const bg = getBgColor(isMe);

                    // Mentions valides
                    const validMentions = m.validMentions || [];

                    // Mode édition ?
                    if (m._id === editingMessageId) {
                        return (
                            <div
                                key={m._id}
                                id={`msg-${m._id}`}
                                style={{
                                    margin: '8px',
                                    padding: '5px',
                                    background: bg,
                                    color: '#fff' // texte en blanc
                                }}
                            >
                                <strong>From:</strong> {senderLabel} <br/>
                                <strong>To:</strong> {receiverLabel} <br/>
                                <strong>Edit Content:</strong>
                                <textarea
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        marginTop: '5px',
                                        background: '#333',
                                        color: '#fff',
                                        border: '1px solid #666'
                                    }}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                                <div style={{ marginTop: '5px' }}>
                                    <button onClick={() => handleSaveEdit(m)}>Enregistrer</button>
                                    <button
                                        onClick={handleCancelEdit}
                                        style={{ marginLeft: '5px' }}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // Affichage standard
                    return (
                        <div
                            key={m._id}
                            id={`msg-${m._id}`}
                            style={{
                                margin: '8px',
                                padding: '5px',
                                background: bg,
                                color: '#fff',         // texte blanc
                                position: 'relative'
                            }}
                        >
                            <strong>From:</strong> {senderLabel}
                            <br/>
                            <strong>To:</strong> {receiverLabel}
                            <br/>
                            <strong>Content:</strong>{' '}
                            <div style={{ display: 'inline-block', marginLeft: '5px' }}>
                                {highlightMentions(m.content || '', validMentions)}{' '}
                                {m.edited && (
                                    <span style={{ marginLeft: 5, fontStyle: 'italic' }}>
                                        (Modifié)
                                    </span>
                                )}
                            </div>

                            {/* Date + accusé de lecture */}
                            <div style={{ marginTop: '5px', fontSize: '0.9rem' }}>
                                <small>{new Date(m.createdAt).toLocaleString()}</small>

                                {/* DM : pastille “Lu par l’autre” si je suis expéditeur et l’autre a lu */}
                                {selectedUser && isMe && m.readBy?.some(rb => String(rb.user?._id) === selectedUser) && (
                                    <IoMdCheckmarkCircle
                                        style={{ color: 'lime', marginLeft: '8px' }}
                                        title="Lu par l'autre"
                                    />
                                )}

                                {/* Channel : (Lu par X...) */}
                                {selectedChannel && m.readBy && m.readBy.length > 0 && (
                                    <div
                                        style={{ marginTop: '2px', fontSize: '0.85em', color: '#ccc' }}
                                        title={
                                            m.readBy
                                                .map(rb => {
                                                    const userIdRead =
                                                        typeof rb.user === 'object'
                                                            ? rb.user._id
                                                            : rb.user;
                                                    const found = users.find(u => u._id === userIdRead);
                                                    return found ? found.name : '???';
                                                })
                                                .join(', ')
                                        }
                                    >
                                        (Lu par {m.readBy.length} utilisateur(s))
                                    </div>
                                )}
                            </div>

                            {/* Fichier (image ou lien) */}
                            {m.fileUrl && (
                                m.fileUrl.match(/\.(png|jpe?g|gif)$/i)
                                    ? (
                                        <div style={{ marginTop: '5px' }}>
                                            <img
                                                src={m.fileUrl}
                                                alt="file"
                                                style={{ maxWidth: '200px', height: 'auto' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '5px' }}>
                                            <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                                Télécharger le fichier
                                            </a>
                                        </div>
                                    )
                            )}

                            {/* Bouton de suppression (si canDelete) */}
                            {canDelete && (
                                <button
                                    onClick={() => handleDeleteMsg(m)}
                                    style={{ marginLeft: '10px', backgroundColor: '#f88' }}
                                >
                                    X
                                </button>
                            )}

                            {/* Réactions */}
                            {m.reactions && m.reactions.length > 0 && (
                                <div style={{ margin: '5px 0' }}>
                                    {m.reactions.map((react, i) => {
                                        const who = react.user && react.user.name
                                            ? react.user.name
                                            : '(Inconnu)';
                                        return (
                                            <span
                                                key={i}
                                                style={{ marginRight: '5px' }}
                                                title={`Réaction de ${who}`}
                                            >
                                                {react.emoji}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Bouton “Réagir” */}
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button onClick={() => openEmojiPickerForMessage(m)}>
                                    Réagir
                                </button>
                                {showEmojiPickerFor === m._id && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            background: '#333',
                                            color: '#fff',
                                            border: '1px solid #666',
                                            padding: '5px',
                                            zIndex: 9999,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {['😃', '👍', '❤️', '🔥', '🎉'].map((emoji) => (
                                            <span
                                                key={emoji}
                                                style={{
                                                    display: 'inline-block',
                                                    fontSize: '20px',
                                                    cursor: 'pointer',
                                                    marginRight: '5px'
                                                }}
                                                onClick={() => handleChooseEmoji(m, emoji)}
                                            >
                                                {emoji}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bouton “Modifier” si c’est mon message */}
                            {isMe && (
                                <button
                                    onClick={() => startEditingMessage(m)}
                                    style={{ marginLeft: '10px', backgroundColor: '#ddf', color: '#000' }}
                                >
                                    Modifier
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
