// src/components/ChatWindow.js
import React, { useEffect, useRef, useState } from 'react';
import axios from '../services/axiosConfig';
import { IoMdCheckmarkCircle } from 'react-icons/io'; // Icône pour "message lu"

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

    // Ouvrir / fermer le sélecteur d'emoji
    const openEmojiPickerForMessage = (m) => {
        setShowEmojiPickerFor(m._id);
    };

    const handleChooseEmoji = (m, chosenEmoji) => {
        if (selectedChannel) {
            // => Channel
            axios
                .post(`/api/channels/${m.channel}/messages/${m._id}/reactions`, { emoji: chosenEmoji })
                .then(() => setShowEmojiPickerFor(null))
                .catch(err => console.error('Channel reaction error:', err));
        } else if (selectedUser) {
            // => DM
            axios
                .post(`/api/direct-messages/${m._id}/reactions`, { emoji: chosenEmoji })
                .then(() => setShowEmojiPickerFor(null))
                .catch(err => console.error('DM reaction error:', err));
        }
    };

    // Faire défiler vers le message ciblé (si focusMessageId est présent)
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

    // Libellé en haut (DM ou channel)
    let modeLabel = 'Aucun';
    if (selectedUser) {
        modeLabel = `DM avec ${selectedUser}`;
    } else if (selectedChannel) {
        modeLabel = `Channel ${selectedChannel}`;
    }

    // Supprimer un message (channel only)
    const handleDeleteMsg = async (m) => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            await axios.delete(`/api/channels/${m.channel}/messages/${m._id}`);
            setMessages((prev) => prev.filter((msg) => msg._id !== m._id));
        } catch (err) {
            console.error('Erreur suppression message:', err);
            alert('Impossible de supprimer ce message');
        }
    };

    // Édition du message (channel only)
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

    return (
        <div style={{ flexGrow: 1, padding: '10px', overflowY: 'auto' }}>
            <h4>ChatWindow : {modeLabel}</h4>

            <div
                ref={listRef}
                style={{
                    height: '70vh',
                    overflowY: 'auto',
                    border: '1px solid #ccc',
                    padding: '5px'
                }}
            >
                {messages.map((m) => {
                    // Calcul: est-ce mon message ?
                    const isMe =
                        (m.sender && typeof m.sender === 'object' && m.sender._id === userId) ||
                        m.sender === userId;

                    // Afficher nom de l'expéditeur + destinataire
                    let senderLabel = '';
                    if (m.sender && typeof m.sender === 'object') {
                        senderLabel = m.sender.name || '(Sans nom)';
                    } else {
                        senderLabel = m.sender || '';
                    }

                    let receiverLabel = '';
                    if (m.receiver) {
                        // DM => si m.receiver est un object => .name, sinon c'est un ID
                        receiverLabel =
                            typeof m.receiver === 'object'
                                ? m.receiver.name || '(Sans nom)'
                                : m.receiver;
                    } else if (m.channelName) {
                        // message retourné par new-channel-message => .channelName
                        receiverLabel = `#${m.channelName}`;
                    } else {
                        receiverLabel = '(Inconnu)';
                    }

                    const bg = isMe ? '#def' : '#fed';
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
                                }}
                            >
                                <strong>From:</strong> {senderLabel} <br/>
                                <strong>To:</strong> {receiverLabel} <br/>
                                <strong>Edit Content:</strong>
                                <textarea
                                    style={{display: 'block', width: '100%', marginTop: '5px'}}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                                <div style={{marginTop: '5px'}}>
                                    <button onClick={() => handleSaveEdit(m)}>Enregistrer</button>
                                    <button onClick={handleCancelEdit} style={{marginLeft: '5px'}}>
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // Sinon, vue “standard” du message
                    return (
                        <div
                            key={m._id}
                            id={`msg-${m._id}`}
                            style={{
                                    margin: '8px',
                                    padding: '5px',
                                    background: bg,
                                    position: 'relative',
                            }}
                        >
                            <strong>From:</strong> {senderLabel}
                            <br/>
                            <strong>To:</strong> {receiverLabel}
                            <br/>
                            <strong>Content:</strong>{' '}
                            <div style={{display: 'inline-block', marginLeft: '5px'}}>
                                {highlightMentions(m.content || '', validMentions)}{' '}
                                {m.edited && (
                                    <span style={{marginLeft: 5, fontStyle: 'italic'}}>
                    (Modifié)
                  </span>
                                )}
                            </div>

                            {/* DATE + ACCUSES DE LECTURE */}
                            <div style={{marginTop: '5px'}}>
                                <small>{new Date(m.createdAt).toLocaleString()}</small>

                                {/* DM: si isMe ET selectedUser => check si l’autre a lu */}
                                {selectedUser && isMe && m.readBy?.some(rb => String(rb.user?._id) === selectedUser) && (
                                    <IoMdCheckmarkCircle style={{color: 'green'}} title="Lu par l'autre"/>
                                )}

                                {/* Channel: si on est en mode channel */}
                                {selectedChannel && m.readBy && m.readBy.length > 0 && (
                                    <div
                                        style={{marginTop: '2px', fontSize: '0.85em', color: '#666'}}
                                        title={
                                            m.readBy
                                                .map(rb => {
                                                    // 1) Extraire l'ID
                                                    const userIdRead = typeof rb.user === 'object'
                                                        ? rb.user._id
                                                        : rb.user;

                                                    // 2) Chercher dans la liste "users"
                                                    const found = users.find(u => u._id === userIdRead);

                                                    // 3) Nom trouvé ou "???"
                                                    return found ? found.name : '???';
                                                })
                                                .join(', ')
                                        }
                                    >
                                        (Lu par {m.readBy.length} utilisateur(s))
                                    </div>
                                )}
                            </div>

                            {/* FICHIER (IMAGE / LIEN) */}
                            {m.fileUrl &&
                                (m.fileUrl.match(/\.(png|jpe?g|gif)$/i) ? (
                                    <div>
                                        <img
                                            src={m.fileUrl}
                                            alt="file"
                                            style={{maxWidth: '200px', height: 'auto'}}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                            Télécharger le fichier
                                        </a>
                                    </div>
                                ))}

                            {/* Bouton de suppression (si canDelete = true) */}
                            {canDelete && (
                                <button
                                    onClick={() => handleDeleteMsg(m)}
                                    style={{marginLeft: '10px', backgroundColor: '#f88'}}
                                >
                                    X
                                </button>
                            )}

                            {/* RÉACTIONS */}
                            {m.reactions && m.reactions.length > 0 && (
                                <div style={{margin: '5px 0'}}>
                                    {m.reactions.map((react, i) => {
                                        const who = react.user && react.user.name ? react.user.name : '(Inconnu)';
                                        return (
                                            <span
                                                key={i}
                                                style={{marginRight: '5px'}}
                                                title={`Réaction de ${who}`}
                                            >
                        {react.emoji}
                      </span>
                                        );
                                    })}
                                </div>
                            )}
                            {/* Bouton “Réagir” et le panel */}
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <button onClick={() => openEmojiPickerForMessage(m)}>Réagir</button>

                                {showEmojiPickerFor === m._id && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',    // juste sous le bouton
                                            left: 0,
                                            background: '#eee',
                                            border: '1px solid #ccc',
                                            padding: '5px',
                                            zIndex: 9999,
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {['😃', '👍', '❤️', '🔥', '🎉'].map(e => (
                                            <span
                                                key={e}
                                                style={{
                                                    display: 'inline-block', // <-- pour être sûr
                                                    fontSize: '20px',
                                                    cursor: 'pointer',
                                                    marginRight: '5px'
                                                }}
                                                onClick={() => handleChooseEmoji(m, e)}
                                            >
                                                {e}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>


                            {/* Bouton "Modifier" si je suis l'auteur */}
                            {isMe && (
                                <button
                                    onClick={() => startEditingMessage(m)}
                                    style={{marginLeft: '10px', backgroundColor: '#ddf'}}
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
