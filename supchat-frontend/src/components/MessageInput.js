import React, { useState } from 'react';
import './MessageInput.css';

// Icônes depuis react-icons
import { FaPaperclip, FaSmile } from 'react-icons/fa';

function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);

    // État d’affichage du sous-menu GIF/Emoji
    const [showGifEmojiMenu, setShowGifEmojiMenu] = useState(false);
    // Onglet sélectionné : "gif" ou "emoji"
    const [selectedTab, setSelectedTab] = useState('gif');

    // ---------------------------------------
    // 1) Fonction pour envoyer un message
    // ---------------------------------------
    const handleSend = () => {
        if (!text.trim() && !file) return;
        onSend(text.trim(), file);
        setText('');
        setFile(null);
    };

    // ---------------------------------------
    // 2) Envoyer un message sans passer par le state "text"
    //    (utile pour GIF/Emoji envoyés immédiatement)
    // ---------------------------------------
    const sendMessageImmediately = (msg) => {
        if (!msg) return; // on évite d'envoyer du vide
        onSend(msg, null);
        // Le composant parent (Chat) affichera ce msg sous forme de .gif
        // si c’est une URL terminée par .gif/.jpg/.png, etc.
    };

    // Gère la touche [Enter] dans le champ texte
    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSend();
        }
    };

    // ---------------------------------------
    // 3) Sélection d’un GIF => on envoie direct
    // ---------------------------------------
    const handleGifSelect = (gifUrl) => {
        sendMessageImmediately(gifUrl);
        setShowGifEmojiMenu(false); // refermer le menu
        setSelectedTab('gif');      // on revient sur tab "gif" par défaut
    };

    // ---------------------------------------
    // 4) Sélection d’un Emoji => on envoie direct
    // ---------------------------------------
    const handleEmojiSelect = (emoji) => {
        sendMessageImmediately(emoji);
        setShowGifEmojiMenu(false);
        setSelectedTab('gif');
    };

    return (
        <div className="message-input-container">
            {/* Champ texte */}
            <input
                type="text"
                placeholder="Tapez votre message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="message-input-field"
            />

            {/* Input file masqué */}
            <input
                id="fileInput"
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                disabled={disabled}
                style={{ display: 'none' }}
            />

            {/* Label trombone = bouton pour choisir un fichier */}
            <label htmlFor="fileInput" className="message-clip-label">
                <FaPaperclip />
            </label>

            {/* Bouton pour GIF/Emoji */}
            <button
                type="button"
                className="gif-emoji-toggle-btn"
                disabled={disabled}
                onClick={() => setShowGifEmojiMenu((prev) => !prev)}
            >
                <FaSmile />
            </button>

            {/* Sous-menu GIF/Emoji */}
            {showGifEmojiMenu && (
                <div className="gif-emoji-menu">
                    {/* Tabs */}
                    <div className="gif-emoji-tabs">
                        <button
                            className={`gif-emoji-tab ${selectedTab === 'gif' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('gif')}
                        >
                            GIF
                        </button>
                        <button
                            className={`gif-emoji-tab ${selectedTab === 'emoji' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('emoji')}
                        >
                            Emoji
                        </button>
                    </div>

                    {/* Contenu des onglets */}
                    {selectedTab === 'gif' ? (
                        <div className="gif-panel">
                            <p>Exemples de GIF (clique pour envoyer) :</p>
                            <div className="gif-gallery">
                                <img
                                    src="https://media.giphy.com/media/l2Jebrcv6R2w2AGXu/giphy.gif"
                                    alt="gif1"
                                    onClick={() => handleGifSelect('https://media.giphy.com/media/l2Jebrcv6R2w2AGXu/giphy.gif')}
                                />
                                <img
                                    src="https://media.giphy.com/media/3o6gDWzmAzrpi5DQU8/giphy.gif"
                                    alt="gif2"
                                    onClick={() => handleGifSelect('https://media.giphy.com/media/3o6gDWzmAzrpi5DQU8/giphy.gif')}
                                />
                                <img
                                    src="https://media.giphy.com/media/xTkcEQACH24SMPxIQg/giphy.gif"
                                    alt="gif3"
                                    onClick={() => handleGifSelect('https://media.giphy.com/media/xTkcEQACH24SMPxIQg/giphy.gif')}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="emoji-panel">
                            <p>Emojis (clique pour envoyer) :</p>
                            <div className="emoji-list">
                                {['😃', '😉', '🔥', '❤️', '🎉', '👍', '😎', '😂', '🥳', '🥰'].map((emo) => (
                                    <span
                                        key={emo}
                                        className="emoji-item"
                                        onClick={() => handleEmojiSelect(emo)}
                                    >
                    {emo}
                  </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bouton Envoyer (pour le texte et le fichier) */}
            <button
                onClick={handleSend}
                disabled={disabled}
                className="message-input-button"
            >
                Envoyer
            </button>

            {/* Prévisualisation d’image si on a choisi un fichier image */}
            {file && file.type.startsWith('image/') && (
                <div className="message-input-preview">
                    <img src={URL.createObjectURL(file)} alt="preview" />
                </div>
            )}
        </div>
    );
}

export default MessageInput;
