// src/pages/TrendingPage.jsx
import React, { useState, useEffect } from 'react';
import AnimeCard from '../components/AnimeCard';
import '../components/styles.css';

const TrendingPage = () => {
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const response = await fetch('https://api.jikan.moe/v4/top/anime');
        const data = await response.json();
        setTrendingAnime(data.data || []);
      } catch (error) {
        console.error("Failed to fetch trending anime:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (loading) {
    return (
      <div className="discovery-page">
        <h1>🔥 Trending Anime</h1>
        <p>Loading top anime...</p>
      </div>
    );
  }

  return (
    <div className="discovery-page">
      <h1>🔥 Trending Anime</h1>
      <div className="discovery-grid">
        {trendingAnime.map(anime => (
          <AnimeCard key={anime.mal_id} anime={anime} />
        ))}
      </div>
    </div>
  );
};

export default TrendingPage;