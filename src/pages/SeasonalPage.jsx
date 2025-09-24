// src/pages/SeasonalPage.jsx
import React, { useState, useEffect } from 'react';
import AnimeCard from '../components/AnimeCard';
import '../components/styles.css';

const SeasonalPage = () => {
  const [seasonalAnime, setSeasonalAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeasonal = async () => {
      setLoading(true);
      try {
        const response = await fetch('https://api.jikan.moe/v4/seasons/now');
        const data = await response.json();
        setSeasonalAnime(data.data || []);
      } catch (error) {
        console.error("Failed to fetch seasonal anime:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeasonal();
  }, []);

  if (loading) {
    return (
      <div className="discovery-page">
        <h1>🗓️ Current Season</h1>
        <p>Loading this season's anime...</p>
      </div>
    );
  }

  return (
    <div className="discovery-page">
      <h1>🗓️ Current Season</h1>
      <div className="discovery-grid">
        {seasonalAnime.map(anime => (
          <AnimeCard key={anime.mal_id} anime={anime} />
        ))}
      </div>
    </div>
  );
};

export default SeasonalPage;