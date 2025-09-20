// src/components/AuthPage.jsx
import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; // Import serverTimestamp
import { auth, db } from "../firebase";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create the user document in Firestore to satisfy the security rules
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: serverTimestamp(), // Use server's timestamp for accuracy
      });
    } catch (error) {
      alert(`Error Signing Up: ${error.message}`);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(`Error Logging In: ${error.message}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h1 style={styles.logo}>ANIOTAKO</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          style={styles.input}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={styles.input}
        />
        <div style={styles.buttonGroup}>
          <button onClick={handleLogin} style={styles.loginButton}>
            Login
          </button>
          <button onClick={handleSignUp} style={styles.signUpButton}>
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Styles ---
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: "var(--bg-primary)",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    backgroundColor: "var(--bg-secondary)",
    padding: "40px",
    borderRadius: "12px",
    width: "350px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
  },
  logo: {
    color: "var(--accent-cyan)",
    textAlign: "center",
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  input: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid var(--bg-tertiary)",
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    fontSize: "16px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "10px",
  },
  loginButton: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "var(--accent-cyan)",
    color: "var(--bg-primary)",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
  signUpButton: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
};

export default AuthPage;