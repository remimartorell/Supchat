// src/components/ChatWindow.js
import React from 'react';

function highlightMentions(text) {
    return text.split(/(\@[^\s]+)/g).map((part, i) => {
        if (part.startsWith('@')) {
            return (
                <span key={i} style={{ color: 'blue', fontWeight: 'bold' }}>
          {part}
        </span>
            );
        }
        return part;
    });
}

function ChatWindow({ userId, messages, selectedUser, selectedChannel }) {
    // Déterminer si on est en mode DM ou Channel, juste pour l’affichage
    const mode = selectedUser
        ? `DM avec ${selectedUser}`
        : selectedChannel
            ? `Channel ${selectedChannel}`
            : 'Aucun';

    return (
        <div style={{ flexGrow: 1, padding: '10px', overflowY: 'auto' }}>
            <h4>ChatWindow : {mode}</h4>
            <div style={{ height: '70vh', overflowY: 'auto', border: '1px solid #ccc' }}>
                {messages.map((m) => {
                    // 1) Déterminer l'affichage pour "sender"
                    //    - s'il est un objet, on prend .name
                    //    - sinon, on l'affiche tel quel
                    let senderLabel = '';
                    if (typeof m.sender === 'object' && m.sender !== null) {
                        // m.sender est un objet, ex: { _id, name, email }
                        senderLabel = m.sender.name || '(Sans nom)';
                    } else {
                        // m.sender est probablement un string (ex: userId)
                        senderLabel = m.sender;
                    }

                    // 2) Pareil pour "receiver" (ou channelId si c’est un message de channel)
                    let receiverLabel = '';
                    if (m.receiver) {
                        // DM
                        if (typeof m.receiver === 'object' && m.receiver !== null) {
                            receiverLabel = m.receiver.name || '(Sans nom)';
                        } else {
                            receiverLabel = m.receiver;
                        }
                    } else if (m.channelId) {
                        receiverLabel = m.channelId;
                    } else {
                        receiverLabel = '(Inconnu)';
                    }

                    // 3) Couleur de fond : si le "sender" est l'utilisateur connecté
                    //    il faut comparer userId à (m.sender._id ou m.sender).
                    const isMe = (typeof m.sender === 'object' && m.sender._id === userId)
                        || m.sender === userId;

                    return (
                        <div key={m._id} style={{
                            margin: '8px',
                            padding: '5px',
                            background: isMe ? '#def' : '#fed',
                        }}>
                            <strong>From:</strong> {senderLabel}<br />
                            <strong>To:</strong> {receiverLabel}<br />
                            <strong>Content:</strong> {highlightMentions(m.content)}<br />

                            {/* SI FILEURL */}
                            {m.fileUrl && (
                                m.fileUrl.match(/\.(png|jpe?g|gif)$/i) ? (
                                    <div>
                                        <img src={m.fileUrl} alt="file" style={{ maxWidth: '200px', height: 'auto' }} />
                                    </div>
                                ) : (
                                    <div>
                                        <a href={m.fileUrl} target="_blank" rel="noreferrer">
                                            Télécharger le fichier
                                        </a>
                                    </div>
                                )
                            )}

                            <small>{m.createdAt}</small>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ChatWindow;