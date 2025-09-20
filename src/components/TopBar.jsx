// src/components/TopBar.jsx
import React from "react";
import "./styles.css";

// Accept the user object as a prop
const TopBar = ({ user }) => {
  return (
    <header className="topbar">
      <div className="user-profile">
        <img src="https://i.pravatar.cc/150?img=58" alt="User Avatar" />
        {/* Display the user's email if available */}
        <span>{user ? user.email : "User"}</span>
      </div>
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search anime..." />
      </div>
      <div className="top-actions">
        <button title="Notifications">🔔</button>
        <button title="Settings">⚙️</button>
      </div>
    </header>
  );
};

export default TopBar;