// src/components/TopBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import "./styles.css";

// A new sub-component for each search result item to manage its own state
const SearchResultItem = ({ anime, onAdd, onClear }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [addingStatus, setAddingStatus] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleAddClick = async (e, status) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    setAddingStatus(status);
    await onAdd(anime, status);
    setAddingStatus(null);
    setIsMenuOpen(false);
    onClear(); // Clear search input
  };

  const toggleMenu = (e) => {
    e.preventDefault(); // Prevent link navigation
    e.stopPropagation();
    setIsMenuOpen(prev => !prev);
  };
  
  const isAdding = addingStatus !== null;

  return (
    <Link to={`/anime/${anime.mal_id}`} className="search-result-item-link">
      <div className="search-result-item">
        <img src={anime.images.jpg.small_image_url} alt={anime.title} />
        <span>{anime.title}</span>

        <div className="search-result-actions" ref={menuRef}>
          <button className="search-options-btn" onClick={toggleMenu} disabled={isAdding}>
            {isAdding ? '...' : '＋'}
          </button>
          {isMenuOpen && (
            <div className="search-options-dropdown">
              <button onClick={(e) => handleAddClick(e, 'plan-to-watch')} disabled={isAdding}>
                {addingStatus === 'plan-to-watch' ? 'Adding...' : 'Plan to Watch'}
              </button>
              <button onClick={(e) => handleAddClick(e, 'watching')} disabled={isAdding}>
                {addingStatus === 'watching' ? 'Adding...' : 'Watching'}
              </button>
              <button onClick={(e) => handleAddClick(e, 'completed')} disabled={isAdding}>
                {addingStatus === 'completed' ? 'Adding...' : 'Completed'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};


const TopBar = ({ onMenuClick }) => {
  const { user, handleAddAnime } = useData();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]); return;
    }
    const controller = new AbortController();
    const handler = setTimeout(() => {
      setIsLoading(true); setError(null);
      fetch(`https://api.jikan.moe/v4/anime?q=${query}&limit=5`, { signal: controller.signal })
        .then(res => res.ok ? res.json() : Promise.reject('Network error'))
        .then(data => setResults(data.data || []))
        .catch(err => err.name !== 'AbortError' && setError("Failed to fetch."))
        .finally(() => setIsLoading(false));
    }, 500);
    return () => { clearTimeout(handler); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };

  return (
    <header className="topbar">
      <button className="hamburger-btn" onClick={onMenuClick}>
        <span></span><span></span><span></span>
      </button>

      <div className="user-profile">
        <img src={`https://ui-avatars.com/api/?name=${user.email}&background=0D8ABC&color=fff`} alt="User Avatar" />
        <span className="user-profile-email">{user.email}</span>
      </div>

      <div className="search-container" ref={searchContainerRef}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text" placeholder="Search for anime..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
        </div>
        {isFocused && query.length > 0 && (
          <div className="search-results-dropdown">
            {isLoading && <div className="search-result-message">Loading...</div>}
            {error && <div className="search-result-message error">{error}</div>}
            {!isLoading && !error && results.length === 0 && query.length >= 3 && (
              <div className="search-result-message">No results found for "{query}".</div>
            )}
            {results.map((anime) => (
              <SearchResultItem key={anime.mal_id} anime={anime} onAdd={handleAddAnime} onClear={clearSearch} />
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;