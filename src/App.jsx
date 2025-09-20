// src/App.jsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./components/Dashboard";
import AuthPage from "./components/AuthPage";
import AddAnime from "./components/AddAnime";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState("dashboard");

  const [animeList, setAnimeList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // Effect for handling authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect for fetching user's anime list in real-time
  useEffect(() => {
    if (!user) {
      setAnimeList([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    const animeCollectionRef = collection(db, "users", user.uid, "anime");
    const q = query(animeCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnimeList(list);
      setListLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading) {
    return <div>Authenticating...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app-container">
      <Sidebar setView={setView} />
      <main className="main-content">
        <TopBar user={user} />
        {view === "dashboard" && (
          <Dashboard
            user={user}
            animeList={animeList}
            isLoading={listLoading}
          />
        )}
        {view === "add-anime" && (
          // This is the crucial prop connection that was needed.
          <AddAnime user={user} existingAnimeList={animeList} />
        )}
      </main>
    </div>
  );
}

export default App;