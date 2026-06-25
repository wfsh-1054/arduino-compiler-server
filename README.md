# Maker IDE (Lightweight Desktop Arduino IDE)

Maker IDE is a lightweight, modern Arduino development environment designed for makers. We have seamlessly packaged a **React Frontend (powered by Monaco Editor)** and a **modular Express Backend Compiler** into a single, high-performance **Electron Desktop Application (.exe)**. Users can easily write code with syntax highlighting and autocompletion, compile it locally, and flash firmware seamlessly to an Arduino board via the Web Serial API—all without installing the bulky official Arduino IDE.

## 🌟 Key Features

- **Ultra-Lightweight & Portable**: The desktop application package is highly optimized, requiring no complex setup. Just extract and run.
- **Monaco Code Editor**: Integrated with VS Code's editor engine, providing:
  - **Syntax Highlighting** for C++/Arduino code.
  - **Smart Autocompletion** for Arduino APIs (e.g., `setup()`, `loop()`, `pinMode()`, `digitalWrite()`, `Serial.println()`, `delay()`).
- **Auto-Initialization on First Launch**: Upon the first launch, the backend automatically downloads and installs all necessary Arduino AVR core compilers in the background. Over 800MB of core tools are securely stored in the user's local `AppData` directory, keeping the app executable lightweight.
- **One-Click COM Port Connection**: Deeply integrated with the Web Serial API and Electron. Simply plug in your Arduino board, click "Select Serial Port", and start.
- **Seamless Web Serial Flashing**: Features integration with `avrgirl-arduino` to flash compiled binary firmware directly from the frontend interface.
- **Flexible Deployments**: In addition to running as a desktop app, it can run as a pure Web server (supports running via Docker and Node.js).

---

## 🏗️ System Architecture

The project has been refactored into a highly modular full-stack architecture:

### 1. Electron Desktop Wrapper (`/main.js` & `/electron`)
- **`main.js`**: Application entry point.
- **`electron/window.js`**: Manages the application window creation, lifecycle, and security controls.
- **`electron/ipcHandlers.js`**: Handles system-level IPC events, file directory paths, and auto-authorizations for hardware devices (Web Serial API).

### 2. Frontend Interface (`/frontend`)
- **Tech Stack**: React, Vite, TypeScript, Monaco Editor, TailwindCSS (for styled components), `avrgirl-arduino`.
- **`frontend/src/components/`**: Modularized UI components (e.g., `CodeEditor`, `Sidebar`, `TerminalPanel`, `TopBar`, `PortSelectModal`).
- **`frontend/src/hooks/`**: Custom hooks for managing state and background processes.
- **`frontend/src/api/`**: Logic for fetching compile status and monitoring compiler setup via Server-Sent Events (SSE).

### 3. Compiler Server (`/src`)
- **Tech Stack**: TypeScript, Node.js, Express, `arduino-cli`.
- **`src/server.ts`**: Entry point for the Express compilation server.
- **`src/routes/`**: Modularized API routes (`compile.ts`, `board.ts`, `library.ts`, `system.ts`).
- **`src/services/`**: Core compiler helper services (`arduinoService.ts` for environment setup, `cliRunner.ts` for running shell commands safely).

---

## 🚀 Quick Start

### Method 1: Use the Desktop Application (Recommended)
1. Go to the GitHub Releases page and download the latest version.
2. Extract the file and double-click `Maker IDE.exe`.
3. On the first launch, wait for the terminal screen to complete the compiler core downloading (requires active internet connection).
4. Once completed, write your sketch and click "Compile & Flash" to flash it in one click!

### Method 2: Local Development & Packaging (Node.js)
To modify the source code and build it yourself:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start the Development Environment**:
   ```bash
   npm run dev
   ```
   *(This concurrent script launches the backend compiler server and the React frontend)*
3. **Package into a Portable Executable**:
   ```bash
   npm run pack:desktop
   ```
   The packaged portable binary and unpacked application files will be generated in the `release/` directory.

### Method 3: Run as a Pure Web Server (Docker)
If you wish to deploy this on a local server for browser-based access:
```bash
docker compose up --build -d
```
After deployment, open your browser and navigate to `https://localhost:3000`.
*(Note: Because of browser security constraints, Web Serial API requires an HTTPS or localhost context to function).*
