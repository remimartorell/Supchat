// src/components/ChatWindow.js
import React, { useEffect, useRef, useState } from 'react';
import axios from '../services/axiosConfig';

/**
 * Fonction utilitaire pour mettre en surbrillance les mentions valides
 */
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

/**
 * Composant principal d'affichage des messages dans un channel ou un DM
 */
function ChatWindow({
                        userId,
                        messages,
                        selectedUser,
                        selectedChannel,
                        focusMessageId,
                        canDelete,
                        setMessages,
                    }) {
    const listRef = useRef(null);

    // État local pour l'édition d'un message
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);

    // -- Ouvrir le “mini panel” d’emojis
    const openEmojiPickerForMessage = (m) => {
        setShowEmojiPickerFor(m._id);
    };

    // -- Choisir un emoji => POST /reactions
    const handleChooseEmoji = (m, chosenEmoji) => {
        axios.post(`/api/channels/${m.channel}/messages/${m._id}/reactions`, {
            emoji: chosenEmoji,
        })
            .then(() => {
                // on ferme le panel
                setShowEmojiPickerFor(null);
            })
            .catch((err) => {
                console.error('Failed to add reaction', err);
            });
    };

    // Au montage ou quand focusMessageId change : auto-scroll jusqu'au message ciblé
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

    // Déterminer si on est en mode channel ou DM (juste pour l'affichage)
    let modeLabel = 'Aucun';
    if (selectedUser) {
        modeLabel = `DM avec ${selectedUser}`;
    } else if (selectedChannel) {
        modeLabel = `Channel ${selectedChannel}`;
    }

    // -- Suppression d'un message
    const handleDeleteMsg = async (m) => {
        if (!window.confirm('Supprimer ce message ?')) return;
        try {
            // Appel backend
            await axios.delete(`/api/channels/${m.channel}/messages/${m._id}`);
            // Retirer le message localement (optionnel si on compte sur socket “channel-message-deleted”)
            setMessages((prev) => prev.filter((msg) => msg._id !== m._id));
        } catch (err) {
            console.error('Erreur suppression message:', err);
            alert('Impossible de supprimer ce message');
        }
    };

    // -- Commencer à éditer un message (setEditingMessageId + setEditContent)
    const startEditingMessage = (m) => {
        setEditingMessageId(m._id);
        setEditContent(m.content || '');
    };

    // -- Sauvegarder la modification d'un message
    const handleSaveEdit = async (m) => {
        if (!editContent.trim()) {
            alert("Le contenu ne peut pas être vide.");
            return;
        }
        try {
            // PUT /api/channels/:channelId/messages/:messageId
            await axios.put(`/api/channels/${m.channel}/messages/${m._id}`, {
                newContent: editContent.trim(),
            });

            // Option 1 : compter sur l'event “channel-message-updated” pour mettre à jour
            // Option 2 (facultatif) : faire un “update local” en plus
            // setMessages((prev) =>
            //   prev.map((msg) =>
            //     msg._id === m._id
            //       ? { ...msg, content: editContent.trim(), edited: true }
            //       : msg
            //   )
            // );

            setEditingMessageId(null);
            setEditContent('');
        } catch (err) {
            console.error('Erreur lors de l’édition du message', err);
            alert('Impossible de modifier ce message');
        }
    };

    // -- Annuler l'édition
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditContent('');
    };

    return (
        <div style={{ flexGrow: 1, padding: '10px', overflowY: 'auto' }}>
            <h4>ChatWindow : {modeLabel}</h4>

            <div
                ref={listRef}
                style={{ height: '70vh', overflowY: 'auto', border: '1px solid #ccc' }}
            >
                {messages.map((m) => {
                    const isMe =
                        (m.sender && typeof m.sender === 'object' && m.sender._id === userId) ||
                        m.sender === userId;

                    // Détermine l'affichage du sender
                    let senderLabel = '';
                    if (m.sender && typeof m.sender === 'object') {
                        senderLabel = m.sender.name || '(Sans nom)';
                    } else {
                        senderLabel = m.sender || '';
                    }

                    // Détermine le receiverLabel
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

                    const bg = isMe ? '#def' : '#fed';
                    const valid = m.validMentions || [];

                    // -- Cas : on est en train d'éditer CE message
                    if (m._id === editingMessageId) {
                        return (
                            <div
                                key={m._id}
                                id={`msg-${m._id}`}
                                style={{ margin: '8px', padding: '5px', background: bg }}
                            >
                                <strong>From:</strong> {senderLabel} <br />
                                <strong>To:</strong> {receiverLabel} <br />
                                <strong>Edit Content:</strong>
                                <textarea
                                    style={{ display: 'block', width: '100%', marginTop: '5px' }}
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                />
                                <div style={{ marginTop: '5px' }}>
                                    <button onClick={() => handleSaveEdit(m)}>Enregistrer</button>
                                    <button onClick={handleCancelEdit} style={{ marginLeft: '5px' }}>
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    // -- Sinon, affichage normal
                    return (
                        <div
                            key={m._id}
                            id={`msg-${m._id}`}
                            style={{margin: '8px', padding: '5px', background: bg}}
                        >
                            <strong>From:</strong> {senderLabel}
                            <br/>
                            <strong>To:</strong> {receiverLabel}
                            <br/>
                            <strong>Content:</strong>{' '}
                            <div style={{display: 'inline-block', marginLeft: '5px'}}>
                                {highlightMentions(m.content || '', valid)}{' '}
                                {m.edited && <span style={{marginLeft: 5, fontStyle: 'italic'}}>(Modifié)</span>}
                            </div>
                            <br/>

                            {/* SI FILEURL */}
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

                            <small>{m.createdAt}</small>

                            {/* Bouton SUPPRIMER (X) si canDelete */}
                            {canDelete && (
                                <button
                                    onClick={() => handleDeleteMsg(m)}
                                    style={{marginLeft: '10px', backgroundColor: '#f88'}}
                                >
                                    X
                                </button>
                            )}

                            {/* Affichage des réactions */}
                            {m.reactions && m.reactions.length > 0 && (
                                <div style={{ margin: '5px 0' }}>
                                    {m.reactions.map((react, i) => {
                                        const who = (react.user && react.user.name) ? react.user.name : '(Inconnu)';
                                        return (
                                            <span
                                                key={i}
                                                style={{ marginRight:'5px' }}
                                                title={`Réaction de ${who}`}
                                            >
                                                {react.emoji}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Bouton “Réagir” */}
                            <button onClick={() => openEmojiPickerForMessage(m)}>
                                Réagir
                            </button>

                            {/* panel d’emojis */}
                            {showEmojiPickerFor === m._id && (
                                <div style={{background: '#eee', border: '1px solid #ccc', position: 'absolute'}}>
                                    {/* ton panel ou un composant tiers */}
                                    {['😃','👍','❤️','🔥','🎉'].map(e => (
                                        <span
                                            key={e}
                                            style={{ fontSize:'20px', cursor:'pointer', margin:'5px' }}
                                            onClick={() => handleChooseEmoji(m, e)}
                                        >
                                            {e}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Bouton EDITER si c'est mon message */}
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