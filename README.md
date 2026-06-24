# Arduino Compiler Server (Cloud IDE)

This is a full-stack application that allows users to **write Arduino code in their browser**, compile it via a backend server, and then use the Web Serial API to **flash the firmware directly to an Arduino board from the webpage**, entirely eliminating the need to install the desktop Arduino IDE.

## 🌟 Key Features

- **Zero Installation**: No need to install the bulky Arduino IDE or set up a local development environment.
- **Cloud Compilation**: Rapidly compile code through the backend server (Node.js + `arduino-cli`).
- **Seamless Flashing**: Utilizes the Web Serial API and `avrgirl-arduino` to silently flash the compiled firmware to the board in the browser's background.
- **One-time Authorization**: Optimized user experience—select the serial port just once. Subsequent compilations and flashes are fully automated without annoying repetitive popup prompts.
- **Docker Support**: Includes a Dockerfile and docker-compose file to launch the complete service environment with a single command.
- **HTTPS Support**: Built-in HTTPS server to ensure the Web Serial API functions correctly on a local network (Web Serial API requires a secure context).

## 🏗️ System Architecture

The system is primarily divided into a "Frontend Web Interface" and a "Backend Compiler Server":

### 1. Frontend
- **File**: `public/index.html`
- **Tech Stack**: HTML, CSS, JavaScript, Web Serial API, [avrgirl-arduino](https://github.com/noopkat/avrgirl-arduino)
- **Workflow**:
  1. Provides a simple text area (`<textarea>`) for users to write code.
  2. The user clicks a button to grant the webpage access to the Arduino's serial port (`navigator.serial.requestPort()`).
  3. Sends the code to the backend via `POST /api/compile`.
  4. Receives the binary firmware file (`.hex` or `.bin`) returned by the backend.
  5. By hijacking the native serial port request (to prevent repetitive popups), passes the firmware data to `avrgirl-arduino` to execute the in-browser flash.

### 2. Backend
- **File**: `src/server.ts`
- **Tech Stack**: Node.js, Express, TypeScript, `arduino-cli`
- **Workflow**:
  1. Starts an HTTPS server and serves the static webpage (frontend).
  2. Provides the `/api/compile` API to receive the code and board type from the frontend.
  3. Creates an isolated temporary workspace directory for each compilation request (preventing concurrency conflicts).
  4. Invokes the system's `arduino-cli` tool to perform the actual compilation.
  5. Upon successful compilation, returns the output binary file to the frontend; automatically cleans up the temporary directory upon completion.

### 3. Deployment
- **Files**: `Dockerfile`, `docker-compose.yml`
- **Tech Stack**: Docker
- **Workflow**: Based on `node:20-slim`, it automatically installs `arduino-cli` and relevant cores (like `arduino:avr`), isolating the compilation environment and ensuring dependency integrity.

## 🚀 Quick Start

### Start with Docker (Recommended)

Launch the complete environment including `arduino-cli` with a single command:

```bash
docker compose up --build -d
```

Once started, open your browser and navigate to: `https://localhost:3000`

### Run Locally (Node.js)

Thanks to the built-in automation script, you **do not** need to pre-install `arduino-cli`. As long as you have a Node.js environment, you can start seamlessly:

1. **Install dependencies and auto-setup the environment**:
   ```bash
   npm install
   ```
   *(Note: This command automatically triggers the `postinstall` script, which downloads the appropriate `arduino-cli` tool for your OS and automatically installs the `arduino:avr` core. This might take a few minutes, please be patient.)*

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to: `https://localhost:3000`

---
> **Note**: Due to the security restrictions of the Web Serial API, even during local development, you must access the webpage via HTTPS (or `http://localhost`). Otherwise, the browser will not grant permission to access the serial port.
