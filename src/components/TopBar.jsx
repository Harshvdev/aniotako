// src/components/TopBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useData } from "../context/DataContext";
import "./styles.css";

const TopBar = ({ onMenuClick }) => {
  const { user, handleAddAnime } = useData(); // <-- Get data from context
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addingId, setAddingId] = useState(null); // <-- State to track which anime is being added
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
    }, 500);

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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdd = async (anime) => {
    setAddingId(anime.mal_id);
    try {
      await handleAddAnime(anime);
      setQuery("");
      setResults([]);
      setIsFocused(false);
    } catch (error) {
      // Errors are already toasted in the context function
    } finally {
      setAddingId(null);
    }
  };

  return (
    <header className="topbar">
      <button className="hamburger-btn" onClick={onMenuClick}>
        <span></span><span></span><span></span>
      </button>

      <div className="user-profile">
        <img src={`https://ui-avatars.com/api/?name=${user.email}&background=0D8ABC&color=fff`} alt="User Avatar" />
        <span>{user.email}</span>
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
            {!isLoading && !error && results.length === 0 && query.length >= 3 && (
              <div className="search-result-message">No results found.</div>
            )}
            {results.map((anime) => (
              <div key={anime.mal_id} className="search-result-item">
                <img src={anime.images.jpg.small_image_url} alt={anime.title} />
                <span>{anime.title}</span>
                <button
                  onClick={() => handleAdd(anime)}
                  disabled={addingId === anime.mal_id}
                >
                  {addingId === anime.mal_id ? "Adding..." : "Add"}
                </button>
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