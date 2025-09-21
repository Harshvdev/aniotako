// src/components/TopBar.jsx

import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

const TopBar = ({ user, onAddAnime }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Added loading state
  const [error, setError] = useState(null); // Added error state
  const searchContainerRef = useRef(null);

  // Debounced search effect
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const handler = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      fetch(`https://api.jikan.moe/v4/anime?q=${query}&limit=5`, { signal })
        .then((res) => {
          if (!res.ok) throw new Error('Network response was not ok');
          return res.json();
        })
        .then((data) => setResults(data.data || []))
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error("Jikan API fetch error:", err);
            setError("Failed to fetch results.");
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 500); // 500ms debounce delay

    // Cleanup function to clear timeout and abort fetch
    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [query]);

  // Effect to handle closing dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsFocused(false);
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleAdd = (anime) => {
    onAddAnime(anime);
    setQuery("");
    setResults([]);
    setIsFocused(false);
  };

  return (
    <header className="topbar">
      <div className="user-profile">
        <img src="https://i.pravatar.cc/150?img=58" alt="User Avatar" />
        <span>{user ? user.email : "User"}</span>
      </div>

      <div className="search-container" ref={searchContainerRef}>
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search and add anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
        </div>
        {isFocused && query.length >= 3 && (
          <div className="search-results-dropdown">
            {isLoading && <div className="search-result-message">Loading...</div>}
            {error && <div className="search-result-message error">{error}</div>}
            {!isLoading && !error && results.length === 0 && (
              <div className="search-result-message">No results found.</div>
            )}
            {results.map((anime) => (
              <div key={anime.mal_id} className="search-result-item">
                <img src={anime.images.jpg.small_image_url} alt={anime.title} />
                <span>{anime.title}</span>
                <button onClick={() => handleAdd(anime)}>Add</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="top-actions">
        <button title="Notifications">🔔</button>
        <button title="Settings">⚙️</button>
      </div>
    </header>
  );
};

export default TopBar;