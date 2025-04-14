// src/components/MessageInput.js
import React, { useState, useEffect } from 'react';
// On ne touche pas à l'import axios global
import axios from 'axios';
// On importe l'instance giphy SANS x-auth-token
import axiosGiphy from '../services/axiosGiphy';
import { IoMdAttach, IoMdHappy } from 'react-icons/io';
import './MessageInput.css';

const GIF_LIMIT = 15;
const STORAGE_KEY_RECENT_GIFS = 'recentGifs';

// Fonctions utilitaires pour localStorage
function loadLocalArray(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveLocalArray(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
}

function pushRecentItem(key, item, maxLength = GIF_LIMIT) {
    let arr = loadLocalArray(key);
    arr = arr.filter((el) => el !== item);
    arr.unshift(item);
    if (arr.length > maxLength) {
        arr = arr.slice(0, maxLength);
    }
    saveLocalArray(key, arr);
}

// Nettoie la clé au cas où elle serait entourée de guillemets
const getCleanGiphyKey = () => {
    const key = process.env.REACT_APP_GIPHY_API_KEY || '';
    return key.replace(/"/g, '');
};

function MessageInput({ onSend, disabled }) {
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [showMenu, setShowMenu] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState('gif'); // 'gif' ou 'emoji'
    const [gifTab, setGifTab] = useState('trending'); // 'trending', 'recent' ou 'search'
    const [gifSearch, setGifSearch] = useState('');
    const [gifResults, setGifResults] = useState([]);
    const [loadingGifs, setLoadingGifs] = useState(false);
    // On charge les gifs récents depuis le localStorage
    const [recentGifs, setRecentGifs] = useState(loadLocalArray(STORAGE_KEY_RECENT_GIFS));

    const giphyKey = getCleanGiphyKey();

    // Affiche la clé Giphy pour vérification
    useEffect(() => {
        console.log('Clé GIPHY API détectée :', giphyKey);
        if (!giphyKey) {
            console.warn("⚠️ Clé GIPHY manquante. Les GIFs ne fonctionneront pas.");
        }
    }, [giphyKey]);

    // Lorsque le menu est ouvert et que l'onglet GIF est sélectionné
    // => on fetch "Trending" ou "Search"
    useEffect(() => {
        if (!showMenu || activeMainTab !== 'gif') return;
        if (gifTab === 'trending') {
            fetchTrendingGifs();
        } else if (gifTab === 'search') {
            fetchSearchGifs(gifSearch);
        }
        // L'onglet "recent" (renommé "Favoris") n’effectue pas d’appel API
    }, [gifTab, activeMainTab, gifSearch, showMenu]);

    const fetchTrendingGifs = async () => {
        if (!giphyKey) return console.error("La clé GIPHY n'est pas configurée");
        setLoadingGifs(true);
        try {
            const response = await axiosGiphy.get('/v1/gifs/trending', {
                params: {
                    api_key: giphyKey,
                    limit: GIF_LIMIT,
                    rating: 'pg-13',
                },
            });
            setGifResults(response.data.data || []);
        } catch (err) {
            console.error('Erreur fetch trending GIFs :', err);
        }
        setLoadingGifs(false);
    };

    const fetchSearchGifs = async (query) => {
        if (!giphyKey) return console.error("La clé GIPHY n'est pas configurée");
        if (!query.trim()) {
            return setGifResults([]);
        }
        setLoadingGifs(true);
        try {
            const response = await axiosGiphy.get('/v1/gifs/search', {
                params: {
                    api_key: giphyKey,
                    q: query,
                    limit: GIF_LIMIT,
                    rating: 'pg-13',
                    lang: 'fr',
                },
            });
            setGifResults(response.data.data || []);
        } catch (err) {
            console.error('Erreur fetch search GIFs :', err);
        }
        setLoadingGifs(false);
    };

    // Quand on clique sur un GIF => on l'envoie direct en message
    const handleGifSelect = (gifUrl) => {
        onSend(gifUrl, null);
        setShowMenu(false);
        pushRecentItem(STORAGE_KEY_RECENT_GIFS, gifUrl);
        setRecentGifs(loadLocalArray(STORAGE_KEY_RECENT_GIFS));
    };

    // Envoi du message
    const handleSend = () => {
        if (!text.trim() && !file) return;
        onSend(text.trim(), file);
        setText('');
        setFile(null);
    };

    // Gestion de la touche entrée
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    // Sélection d’un fichier
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    // Liste d'emojis simple
    const emojiList = ['😃', '😂', '😍', '😎', '😉', '👍', '🎉', '🔥', '😭', '🙌'];
    const handleEmojiSelect = (emoji) => {
        onSend(emoji, null);
        setShowMenu(false);
    };

    return (
        <div className="message-input-container">
            <input
                type="text"
                placeholder="Tapez votre message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="message-input-field"
            />

            <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                disabled={disabled}
                style={{ display: 'none' }}
            />

            {/* Label trombone pour sélectionner un fichier */}
            <label htmlFor="fileInput" className="message-clip-label">
                <IoMdAttach size={20} color="#fff" />
            </label>

            {/* Bouton pour afficher/masquer le menu GIF/Emoji */}
            <button
                type="button"
                className="gif-emoji-toggle-btn"
                onClick={() => setShowMenu((prev) => !prev)}
                disabled={disabled}
            >
                <IoMdHappy size={20} color="#fff" />
            </button>

            {/* Bouton Envoyer */}
            <button onClick={handleSend} disabled={disabled} className="message-input-button">
                Envoyer
            </button>

            {/* Prévisualisation de l'image (si fichier image) */}
            {file && file.type.startsWith('image/') && (
                <div className="message-input-preview">
                    <img src={URL.createObjectURL(file)} alt="preview" />
                </div>
            )}

            {/* Menu GIF/Emoji (affiché si showMenu=true) */}
            {showMenu && (
                <div className="gif-emoji-menu">
                    {/* Tabs principaux : GIF ou Emoji */}
                    <div className="gif-emoji-tabs">
                        <button
                            className={`gif-emoji-tab ${activeMainTab === 'gif' ? 'active' : ''}`}
                            onClick={() => setActiveMainTab('gif')}
                        >
                            GIF
                        </button>
                        <button
                            className={`gif-emoji-tab ${activeMainTab === 'emoji' ? 'active' : ''}`}
                            onClick={() => setActiveMainTab('emoji')}
                        >
                            Emoji
                        </button>
                    </div>

                    {/* Contenu de l'onglet GIF */}
                    {activeMainTab === 'gif' && (
                        <>
                            <div className="gif-emoji-tabs">
                                {/* Renommage de l'onglet "Récents" => "Recent" */}
                                <button
                                    className={`gif-emoji-tab ${gifTab === 'trending' ? 'active' : ''}`}
                                    onClick={() => setGifTab('trending')}
                                >
                                    À la une
                                </button>
                                <button
                                    className={`gif-emoji-tab ${gifTab === 'recent' ? 'active' : ''}`}
                                    onClick={() => setGifTab('recent')}
                                >
                                    recent
                                </button>
                                <button
                                    className={`gif-emoji-tab ${gifTab === 'search' ? 'active' : ''}`}
                                    onClick={() => setGifTab('search')}
                                >
                                    Rechercher
                                </button>
                            </div>

                            {/* Barre de recherche affichée seulement si gifTab === 'search' */}
                            {gifTab === 'search' && (
                                <input
                                    type="text"
                                    placeholder="Rechercher un GIF..."
                                    value={gifSearch}
                                    onChange={(e) => setGifSearch(e.target.value)}
                                    className="gif-search-input"
                                    style={{ marginTop: '8px' }}
                                />
                            )}

                            <div style={{ marginTop: '10px' }}>
                                {/* Onglet Favoris (ex-récents) */}
                                {gifTab === 'recent' ? (
                                    <div className="gif-gallery">
                                        {recentGifs.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#fff' }}>Aucun GIF en recent</p>
                                        ) : (
                                            recentGifs.map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt="GIF Favori"
                                                    onClick={() => handleGifSelect(url)}
                                                />
                                            ))
                                        )}
                                    </div>
                                ) : loadingGifs ? (
                                    <p style={{ textAlign: 'center', color: '#fff' }}>Chargement...</p>
                                ) : (
                                    <div className="gif-gallery">
                                        {gifResults.map((gif) => (
                                            <img
                                                key={gif.id}
                                                src={gif.images.fixed_width?.url || gif.images.original.url}
                                                alt={gif.title}
                                                onClick={() =>
                                                    handleGifSelect(gif.images.fixed_width?.url || gif.images.original.url)
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Contenu de l'onglet Emoji */}
                    {activeMainTab === 'emoji' && (
                        <div className="emoji-gallery" style={{ marginTop: '10px', textAlign: 'center' }}>
                            {emojiList.map((emoji, idx) => (
                                <span
                                    key={idx}
                                    style={{ fontSize: '1.8rem', cursor: 'pointer', margin: '5px' }}
                                    onClick={() => handleEmojiSelect(emoji)}
                                >
                  {emoji}
                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default MessageInput;
