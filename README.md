# Maker IDE (Lightweight Desktop Arduino IDE)

Maker IDE is a lightweight Arduino development environment designed for makers. We have seamlessly packaged a "Web Frontend" and a "Backend Compiler Server" into a single **Electron Desktop Application (.exe)**. Users can easily write code, compile it in the cloud or locally, and flash firmware seamlessly to an Arduino board via the Web Serial API—all without installing the bulky official Arduino IDE.

## 🌟 Key Features

- **Ultra-Lightweight & Portable**: The application itself is only around 100MB. No complex setup is required; just click and run.
- **Auto-Initialization on First Launch**: Upon the first launch, the system automatically downloads and installs all necessary Arduino AVR core compilers in the background. Over 800MB of core data is safely and quietly stored in your system's `AppData` directory, keeping the executable itself lightweight.
- **One-Click COM Port Connection**: Deeply integrated with the Web Serial API and Electron, simply plug in your Arduino board and click "Select Serial Port." The system will automatically detect and connect to the first available board, eliminating the hassle of selecting ports repeatedly.
- **Seamless Background Flashing**: Utilizes `avrgirl-arduino` to automatically write the firmware to the chip in the background after compilation is complete.
- **Multi-Platform Flexibility**: In addition to running as a desktop application, it retains the ability to operate as a pure Web server (supports direct launching via Docker and Node.js).

## 🏗️ System Architecture

This system utilizes a full-stack architecture integrated into Electron:

### 1. Desktop Wrapper (Electron Main Process)
- **File**: `main.js`
- **Function**: Responsible for launching the application window, intercepting and automatically authorizing hardware access requests from the Web Serial API, and directing the read/write paths of the Arduino toolchain to the user's `AppData` directory to prevent write conflicts in the packaged read-only environment.

### 2. Frontend Interface (React Frontend)
- **Tech Stack**: React, Vite, TypeScript, Web Serial API, `avrgirl-arduino`
- **Function**: Provides a modern code editor interface. Automatically checks the compilation environment upon first launch and displays the core download progress in real-time via Server-Sent Events (SSE). After writing code, it calls the backend API to compile, retrieves the `.hex` file, and flashes it via the Web Serial API.

### 3. Compiler Server (Express Backend)
- **File**: `src/server.ts`
- **Function**: Provides the `/api/compile` API in the background. Receives the code from the frontend, compiles it in an isolated temporary folder using the underlying `arduino-cli`, and returns the binary firmware file.

## 🚀 Quick Start

### Method 1: Use the Desktop Application (Recommended)
1. Go to the GitHub Releases page and download the latest `Maker-IDE-v1.0.0.zip`.
2. Extract the file and double-click `Maker IDE 1.0.0.exe`.
3. On the first launch, wait for the terminal screen to complete the core download progress (internet connection required).
4. Once completed, you can start writing code and click "Compile & Flash" to flash with one click!

### Method 2: Local Development & Packaging (Node.js)
If you want to modify the source code and package it yourself:

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start the Development Environment**:
   ```bash
   npm run dev
   ```
   *(This starts both the Vite frontend server and the Express backend compiler server)*
3. **Package as a Standalone EXE**:
   ```bash
   npm run pack:desktop
   ```
   The packaged file will be placed in the `release/` directory.

### Method 3: Run as a Pure Web Server (Docker)
If you only want to deploy it on a server for multiple people to use via browser:
```bash
docker compose up --build -d
```
After starting, open your browser and navigate to: `https://localhost:3000` *(Note: Due to security restrictions, the Web Serial API must operate in an HTTPS or localhost environment)*.
