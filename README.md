# Aniotako - Your Personal Anime Tracker


![Aniotako Preview](https://github.com/user-attachments/assets/772f052e-6b8c-4a42-a6e4-6fcf1760814a)

**Live Demo:** [Link to your deployed site] *(You'll add this in the next phase!)*

Aniotako is a sleek, modern web application designed for anime enthusiasts to track their watching journey. Users can search for any anime, add it to their personal lists, update their episode progress, and manage their library across multiple categories like "Watching," "Plan to Watch," and "Completed."

This project was built from the ground up using React, Vite, and Firebase, with a strong focus on a clean, responsive user interface and real-time data synchronization.

---

### ✨ Features

*   **Secure User Authentication:** Full sign-up and login system powered by Firebase Authentication.
*   **Dynamic Anime Search:** A powerful search feature that utilizes the public Jikan (MyAnimeList) API to find any anime.
*   **Comprehensive Personal Lists:** Users can manage their anime across all standard tracking lists:
    *   Currently Watching
    *   Plan to Watch
    *   Completed
    *   On-Hold
    *   Dropped
*   **Real-time Progress Tracking:** Instantly update the number of episodes watched with a single click. All changes are reflected immediately without a page refresh.
*   **Intuitive Status Management:** Easily move anime between lists via a simple and clean dropdown menu.
*   **Sleek, Dark-Mode UI:** A modern and intuitive interface designed for a great user experience.

---

### 💻 Tech Stack

*   **Frontend:** React (with Hooks), Vite
*   **Backend & Database:** Firebase (Authentication, Firestore)
*   **API:** Jikan API v4 (for anime data)
*   **Styling:** Plain CSS with CSS Variables for a lightweight and maintainable design.

---

### 🚀 Development Journey & AI Collaboration

This project was brought to life through a unique "vibe-coding" development process. As the project director, I guided the entire development lifecycle, from initial concept and UI/UX design to feature specification and rigorous testing.

The codebase was generated in a collaborative, conversational manner with a sophisticated AI coding partner. My role was to:
-   **Define the Vision:** I provided the initial design mockups and a clear vision for the application's functionality and user flow.
-   **Architect the System:** I made key architectural decisions, such as choosing the tech stack (React, Firebase), designing the Firestore database schema, and planning the component structure.
-   **Direct Development:** I provided detailed, phase-by-phase prompts outlining the specific components, logic, and styling needed for each feature.
-   **Debug and Test:** I was responsible for running the application locally, identifying and resolving bugs, solving setup and dependency issues, and verifying that each feature met the required specifications.

This process was a challenging and rewarding exercise in project management and human-AI collaboration, proving that a clear vision and precise direction are crucial to steering complex code generation toward a successful and functional outcome.

---

### 🛠️ Getting Started Locally

To get a local copy up and running, follow these simple steps.

**Prerequisites:**
*   Node.js (v18 or later)
*   npm

**Installation:**

1.  **Clone the repo:**
    ```sh
    git clone https://github.com/your-username/aniotako.git
    ```
    *(Replace `your-username` with your actual GitHub username)*

2.  **Navigate to the project directory:**
    ```sh
    cd aniotako
    ```

3.  **Install NPM packages:**
    ```sh
    npm install
    ```

4.  **Set up your Firebase credentials:**
    *   In the `src` folder, create a new file named `firebase.js`.
    *   Go to your Firebase project console, copy your web app's configuration object, and paste it into `firebase.js`. The file should export `auth` and `db`.

5.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

---
### What's Next

The next major step for Aniotako is deployment! The plan is to use Firebase Hosting to make the application publicly available.

Future goals may include:
*   Adding more detailed user profiles.
*   A "Discover" page for trending or seasonal anime.
*   A social component to see what friends are watching.