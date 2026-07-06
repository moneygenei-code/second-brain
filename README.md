# Second Brain AI Ecosystem: Command Center

> **Goal:** To create a persistent, evolving, and inspectable long-term memory system for a multi-agent AI ecosystem, providing a "Command Center" for human-agent collaboration.

## 🧠 Overview

The **Second Brain Command Center** is a desktop application designed to act as the central nervous system for your AI agents. It captures every activity, deal, and strategic thought in a structured Markdown vault, synchronizes it to a high-performance SQLite database, and provides a real-time dashboard for monitoring and strategic planning.

---

## 🚀 Current Features

### 1. **Live Activity Feed**
- Real-time monitoring of all agent activities and deal attempts.
- Visual distinction between "Activity" and "Deal" logs.
- Color-coded status indicators (Success/Failure) for immediate health checks.

### 2. **Automated Sync Engine**
- **File System Watcher:** Uses `chokidar` to monitor the `second-brain-vault` directory.
- **SQLite Integration:** Automatically indexes Markdown frontmatter and content into `second-brain.db` for instant querying and analytics.
- **Markdown-First:** Your data remains yours. The source of truth is always human-readable Markdown files.

### 3. **Architect Agent & Roadmap**
- **Strategic Analysis:** The "Architect" agent analyzes historical logs to identify patterns and failures.
- **Future Planning:** Automatically generates a "Future Roadmap" based on the Architect's strategic insights.
- **Interactive Triggers:** Run the Architect agent directly from the dashboard to update your strategy.

### 4. **Secure Desktop Experience**
- Built with **Electron**, featuring a modern, dark-themed "Glassmorphism" UI.
- Implements security best practices (Isolated renderer, `contextBridge`, and `preload` scripts).

---

## 🗺️ Future Roadmap (Planned)

1. **Vector Search (RAG):** Integrate a vector database to allow agents to perform "Semantic Search" over thousands of historical logs, moving beyond simple keyword matching.
2. **Hermes Integration:** A dedicated agent for proactive deal-hunting based on the Architect's strategic roadmap.
3. **Advanced Analytics:** Interactive charts for success rates, token usage, and pipeline efficiency.
4. **Agent Collaboration:** A "War Room" view where you can see agents communicating with each other in real-time.
5. **Mobile Companion:** A lightweight mobile viewer for the Second Brain vault.

---

## 🛠️ Technical Documentation

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/)

### **Installation**
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure the `second-brain-vault` submodule is initialized:
   ```bash
   git submodule update --init --recursive
   ```

### **Usage**
- **Start the Command Center:**
  ```bash
  npm start
  ```
- **Logging from Agents:**
  Use the `logToSecondBrain` function from `secondBrain.js` to record activities. The app will automatically detect and sync new files.

### **Database Schema**
- **`logs`**: `id, agentId, agentName, type, status, timestamp, content, filePath`
- **`roadmap`**: `id, step, status, created_at`

---

## 📁 Project Structure

- `main.js`: Electron entry point and IPC handlers.
- `secondBrain.js`: Core logging module and analytics logic.
- `syncEngine.js`: File system watcher and database synchronization.
- `database.js`: SQLite schema and data operations.
- `index.html`: Dashboard frontend.
- `agents/`: Directory for agent logic (e.g., `architectAgent.js`).
- `second-brain-vault/`: The directory where all Markdown logs are stored.

---

## 🛡️ Privacy & Security
- **Local-First:** All data, including the SQLite database, stays on your machine.
- **Secure Bridge:** The UI has no direct access to the Node.js API, protecting your system from malicious log content.
