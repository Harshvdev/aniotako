// src/App.jsx
import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { DataProvider, useData } from "./context/DataContext";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./components/Dashboard";
import AuthPage from "./components/AuthPage";
import AnimeDetailPage from "./components/AnimeDetailPage"; // <-- IMPORT THE NEW PAGE
import "./App.css";
import "./Responsive.css";

const AppContent = () => {
  const { user, authLoading } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (authLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Authenticating...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
      {isSidebarOpen && <div className="overlay" onClick={() => setIsSidebarOpen(false)}></div>}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="main-content">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/anime/:id" element={<AnimeDetailPage />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#242424",
              color: "var(--text-primary)",
              border: "1px solid var(--bg-tertiary)",
            },
          }}
        />
        <AppContent />
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;