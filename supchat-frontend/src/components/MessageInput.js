// src/components/MessageInput.js
import React, { useState, useEffect } from 'react';
import axiosGiphy from '../services/axiosGiphy';
import axiosEmoji from '../services/axiosEmoji';
import { IoMdAttach, IoMdHappy } from 'react-icons/io';
import { MentionsInput, Mention } from 'react-mentions';
import './MessageInput.css';

const GIF_LIMIT = 15;
const STORAGE_KEY_RECENT_GIFS = 'recentGifs';
const STORAGE_KEY_RECENT_EMOJIS = 'recentEmojis';

function loadLocalArray(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function pushRecentItem(key, item, maxLength = GIF_LIMIT) {
    let arr = loadLocalArray(key);
    arr = arr.filter(el => el !== item);
    arr.unshift(item);
    if (arr.length > maxLength) arr = arr.slice(0, maxLength);
    localStorage.setItem(key, JSON.stringify(arr));
}

const getCleanGiphyKey = () => {
    const key = process.env.REACT_APP_GIPHY_API_KEY || '';
    return key.replace(/"/g, '');
};

export default function MessageInput({
                                         onSend,
                                         disabled,
                                         users,     // [{ id, display }, …]
                                         channels,  // [{ id, display }, …]
                                         commands   // [{ id, display }, …]
                                     }) {
    // === état du MentionsInput ===
    const [value, setValue] = useState('');
    const [plainText, setPlainText] = useState('');
    const [file, setFile] = useState(null);

    // GIF / Emoji picker
    const [showMenu, setShowMenu] = useState(false);
    const [activeMainTab, setActiveMainTab] = useState('gif');

    // GIF state
    const [gifTab, setGifTab] = useState('trending');
    const [gifSearch, setGifSearch] = useState('');
    const [gifResults, setGifResults] = useState([]);
    const [loadingGifs, setLoadingGifs] = useState(false);
    const [recentGifs, setRecentGifs] = useState(loadLocalArray(STORAGE_KEY_RECENT_GIFS));

    // Emoji state
    const [emojiSubTab, setEmojiSubTab] = useState('all');
    const [emojiSearch, setEmojiSearch] = useState('');
    const [emojiListData, setEmojiListData] = useState([]);
    const [recentEmojis, setRecentEmojis] = useState(loadLocalArray(STORAGE_KEY_RECENT_EMOJIS));
    const fallbackEmojiList = ['😃','😂','😍','😎','😉','👍','🎉','🔥','😭','🙌'];

    const filteredEmojiList = emojiListData.filter(item => {
        const ch = typeof item === 'object' ? item.character : item;
        const name = typeof item === 'object' ? (item.slug || item.unicodeName || '') : '';
        const q = emojiSearch.toLowerCase();
        return ch.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });

    const giphyKey = getCleanGiphyKey();

    // Effets pour GIFs
    useEffect(() => {
        if (!showMenu || activeMainTab!=='gif') return;
        if (gifTab==='trending') fetchTrendingGifs();
        else if (gifTab==='search') fetchSearchGifs(gifSearch);
    }, [showMenu, activeMainTab, gifTab, gifSearch]);

    // Effet pour Emojis
    useEffect(() => {
        if (activeMainTab==='emoji' && emojiListData.length===0) {
            (async () => {
                try {
                    const res = await axiosEmoji.get('/emojis', {
                        params:{ access_key: process.env.REACT_APP_EMOJI_API_KEY }
                    });
                    setEmojiListData(res.data || []);
                } catch(e) {
                    console.error('Erreur fetchEmojis :', e);
                }
            })();
        }
    }, [activeMainTab, emojiListData.length]);

    async function fetchTrendingGifs() {
        if (!giphyKey) return;
        setLoadingGifs(true);
        try {
            const res = await axiosGiphy.get('/v1/gifs/trending', {
                params:{ api_key:giphyKey, limit:GIF_LIMIT, rating:'pg-13' }
            });
            setGifResults(res.data.data||[]);
        } catch(e) {
            console.error('Erreur fetchTrendingGifs :', e);
        }
        setLoadingGifs(false);
    }

    async function fetchSearchGifs(q) {
        if (!giphyKey||!q.trim()) return setGifResults([]);
        setLoadingGifs(true);
        try{
            const res = await axiosGiphy.get('/v1/gifs/search', {
                params:{ api_key:giphyKey, q, limit:GIF_LIMIT, rating:'pg-13', lang:'fr' }
            });
            setGifResults(res.data.data||[]);
        }catch(e){
            console.error('Erreur fetchSearchGifs :', e);
        }
        setLoadingGifs(false);
    }

    // Handlers
    const handleGifSelect = url => {
        onSend(url,null);
        pushRecentItem(STORAGE_KEY_RECENT_GIFS,url);
        setRecentGifs(loadLocalArray(STORAGE_KEY_RECENT_GIFS));
        setShowMenu(false);
    };
    const handleEmojiSelect = emoji => {
        onSend(emoji,null);
        pushRecentItem(STORAGE_KEY_RECENT_EMOJIS,emoji,30);
        setRecentEmojis(loadLocalArray(STORAGE_KEY_RECENT_EMOJIS));
        setShowMenu(false);
    };

    const handleFileChange = e => {
        if(e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleSend = () => {
        const content = plainText.trim();
        if(!content && !file) return;
        onSend(content, file);
        setValue('');
        setPlainText('');
        setFile(null);
    };

    const handleKeyDown = e => {
        if(e.key==='Enter' && !e.shiftKey){
            e.preventDefault();
            handleSend();
        }
    };

    // Choix des emojis à afficher
    let emojisToDisplay;
    if(emojiSubTab==='recent') emojisToDisplay = recentEmojis;
    else if(emojiSubTab==='search')
        emojisToDisplay = emojiSearch.trim()==='' ? emojiListData : filteredEmojiList;
    else
        emojisToDisplay = emojiListData.length?emojiListData:fallbackEmojiList;

    return (
        <div className="message-input-container">
            {/* === MentionsInput avec @, #, / === */}
            <MentionsInput
                value={value}
                onChange={(e, newVal, newPlain)=>{
                    setValue(newVal);
                    setPlainText(newPlain);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre message…"
                className="mentions"
                allowSuggestionsAboveCursor
                disabled={disabled}
            >
                {/* @mentions */}
                <Mention
                    trigger="@"
                    data={users}
                    markup="@\[__display__\](__id__)"
                    displayTransform={(id, display) => `@${display}`}
                    appendSpaceOnAdd
                />

                {/* #hashtags (3 résultats max) */}
                <Mention
                    trigger="#"
                    data={channels}
                    markup="#[__display__](__id__)"
                    displayTransform={(id,display)=>`#${display}`}
                    appendSpaceOnAdd
                    suggestionsLimit={3}
                    renderSuggestion={(suggestion, search, highlighted)=>(
                        <div style={{padding:'4px 8px'}}>{highlighted}</div>
                    )}
                />

                {/* /commands */}
                <Mention
                    trigger="/"
                    data={commands}
                    markup="/[__display__](__id__)"
                    displayTransform={(id,display)=>`/${display}`}
                    appendSpaceOnAdd
                />
            </MentionsInput>

            {/* pièce jointe */}
            <input
                id="fileInput"
                type="file"
                style={{display:'none'}}
                disabled={disabled}
                onChange={handleFileChange}
            />
            <label htmlFor="fileInput" className="message-clip-label">
                <IoMdAttach size={20} color="#fff"/>
            </label>

            {/* toggle GIF/Emoji */}
            <button
                type="button"
                className="gif-emoji-toggle-btn"
                onClick={()=>setShowMenu(v=>!v)}
                disabled={disabled}
            >
                <IoMdHappy size={20} color="#fff"/>
            </button>

            {/* envoyer */}
            <button
                onClick={handleSend}
                disabled={disabled}
                className="message-input-button"
            >
                Envoyer
            </button>

            {/* aperçu image */}
            {file && file.type.startsWith('image/') && (
                <div className="message-input-preview">
                    <img src={URL.createObjectURL(file)} alt="preview"/>
                </div>
            )}

            {/* picker GIF / Emoji */}
            {showMenu && (
                <div className="gif-emoji-menu">
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

                    {activeMainTab === 'gif' && (
                        <>
                            <div className="gif-emoji-tabs">
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
                                    Récents
                                </button>
                                <button
                                    className={`gif-emoji-tab ${gifTab === 'search' ? 'active' : ''}`}
                                    onClick={() => setGifTab('search')}
                                >
                                    Rechercher
                                </button>
                            </div>
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
                                {gifTab === 'recent' ? (
                                    <div className="gif-gallery">
                                        {recentGifs.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#fff' }}>
                                                Aucun GIF récent
                                            </p>
                                        ) : (
                                            recentGifs.map((url, idx) => (
                                                <img
                                                    key={idx}
                                                    src={url}
                                                    alt="GIF récent"
                                                    onClick={() => handleGifSelect(url)}
                                                />
                                            ))
                                        )}
                                    </div>
                                ) : loadingGifs ? (
                                    <p style={{ textAlign: 'center', color: '#fff' }}>
                                        Chargement...
                                    </p>
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

                    {activeMainTab === 'emoji' && (
                        <>
                            <div className="gif-emoji-tabs">
                                <button
                                    className={`gif-emoji-tab ${emojiSubTab === 'all' ? 'active' : ''}`}
                                    onClick={() => setEmojiSubTab('all')}
                                >
                                    All
                                </button>
                                <button
                                    className={`gif-emoji-tab ${emojiSubTab === 'recent' ? 'active' : ''}`}
                                    onClick={() => setEmojiSubTab('recent')}
                                >
                                    Récents
                                </button>
                                <button
                                    className={`gif-emoji-tab ${emojiSubTab === 'search' ? 'active' : ''}`}
                                    onClick={() => setEmojiSubTab('search')}
                                >
                                    Rechercher
                                </button>
                            </div>
                            {emojiSubTab === 'search' && (
                                <input
                                    type="text"
                                    placeholder="Rechercher un Emoji..."
                                    value={emojiSearch}
                                    onChange={(e) => setEmojiSearch(e.target.value)}
                                    className="gif-search-input"
                                    style={{ marginTop: '8px' }}
                                />
                            )}
                            <div className="emoji-gallery" style={{ marginTop: '10px', textAlign: 'center' }}>
                                {(
                                    emojiSubTab === 'recent'
                                        ? recentEmojis
                                        : emojiSubTab === 'search'
                                            ? emojiSearch.trim() === '' ? emojiListData : filteredEmojiList
                                            : emojiListData.length > 0 ? emojiListData : fallbackEmojiList
                                )
                                    .slice(0, 30)
                                    .map((item, idx) => {
                                        const displayEmoji =
                                            typeof item === 'object' ? item.character : item;
                                        return (
                                            <span
                                                key={idx}
                                                style={{ fontSize: '1.8rem', cursor: 'pointer', margin: '5px' }}
                                                onClick={() => handleEmojiSelect(displayEmoji)}
                                            >
                        {displayEmoji}
                      </span>
                                        );
                                    })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

