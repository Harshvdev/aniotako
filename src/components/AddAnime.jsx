// src/components/AddAnime.jsx
import React, { useState } from "react";
import { collection, doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import "./styles.css";

const AddAnime = ({ user, existingAnimeList }) => {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setIsLoading(true);
    setSearchResults([]);
    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime?q=${query}&limit=20`);
      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error fetching from Jikan API:", error);
      alert("Failed to fetch search results.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnime = async (anime, status) => {
    if (!user) {
      alert("You must be logged in to add anime.");
      return;
    }

    const isAlreadyAdded = existingAnimeList.some(
      (item) => item.mal_id === anime.mal_id
    );

    if (isAlreadyAdded) {
      alert(`'${anime.title}' is already in one of your lists.`);
      return;
    }

    try {
      const batch = writeBatch(db);

      const newAnimeData = {
        mal_id: anime.mal_id,
        title: anime.title,
        image: anime.images.jpg.image_url,
        status: status,
        progress: 0,
        total_episodes: anime.episodes || "N/A",
        createdAt: serverTimestamp(), // Fulfills Requirement #2
      };
      
      const newAnimeRef = doc(collection(db, "users", user.uid, "anime"));
      batch.set(newAnimeRef, newAnimeData);

      const userDocRef = doc(db, "users", user.uid);
      batch.update(userDocRef, { lastAnimeAddedAt: serverTimestamp() }); // Fulfills Requirement #3

      await batch.commit();
      
      alert(`Added '${anime.title}' to your '${status.replace("-", " ")}' list!`);
      setOpenMenuId(null);
    } catch (error) {
      console.error("Error adding anime with batch:", error);
      alert(`Failed to add anime. You may be trying to add too quickly. Please wait a moment and try again.`);
    }
  };

  return (
    <div className="dashboard-content">
      <section className="anime-list-section">
        <h2>Add Anime to Your List</h2>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for an anime..."
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchButton}>
            Search
          </button>
        </form>

        {isLoading ? (
          <p>Searching...</p>
        ) : (
          <div className="anime-grid">
            {searchResults.map((anime) => (
              <div key={anime.mal_id} className="anime-card">
                <button
                  className="options-menu-btn"
                  style={{ opacity: 1 }}
                  onClick={() => setOpenMenuId(openMenuId === anime.mal_id ? null : anime.mal_id)}
                >
                  ...
                </button>
                {openMenuId === anime.mal_id && (
                  <div className="options-dropdown">
                    <button className="menu-item" onClick={() => handleAddAnime(anime, "watching")}>Add to Watching</button>
                    <button className="menu-item" onClick={() => handleAddAnime(anime, "plan-to-watch")}>Add to Plan to Watch</button>
                    <button className="menu-item" onClick={() => handleAddAnime(anime, "completed")}>Add to Completed</button>
                    <button className="menu-item" onClick={() => handleAddAnime(anime, "on-hold")}>Add to On-Hold</button>
                    <button className="menu-item" onClick={() => handleAddAnime(anime, "dropped")}>Add to Dropped</button>
                  </div>
                )}
                <img src={anime.images.jpg.image_url} alt={anime.title} />
                <div className="anime-info">
                  <p className="anime-title">{anime.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const styles = {
  searchForm: { display: "flex", gap: "10px", marginBottom: "24px" },
  searchInput: {
    flexGrow: 1,
    padding: "10px 16px",
    backgroundColor: "var(--bg-tertiary)",
    border: "1px solid var(--bg-tertiary)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "14px",
  },
  searchButton: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "var(--accent-cyan)",
    color: "var(--bg-primary)",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default AddAnime;