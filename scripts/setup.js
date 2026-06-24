const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '..', 'bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

const platform = os.platform();
const arch = os.arch();

console.log(`Detecting platform: ${platform} (${arch})`);

let downloadUrl = '';
let archiveName = '';
let isZip = false;

if (platform === 'win32') {
    downloadUrl = 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip';
    archiveName = 'arduino-cli.zip';
    isZip = true;
} else if (platform === 'linux') {
    downloadUrl = 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz';
    archiveName = 'arduino-cli.tar.gz';
    isZip = false;
} else if (platform === 'darwin') {
    downloadUrl = 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_64bit.tar.gz';
    archiveName = 'arduino-cli.tar.gz';
    isZip = false;
} else {
    console.error('Unsupported platform!');
    process.exit(1);
}

const archivePath = path.join(binDir, archiveName);

try {
    console.log(`Downloading arduino-cli from: ${downloadUrl}`);
    execSync(`curl -L -o "${archivePath}" "${downloadUrl}"`, { stdio: 'inherit' });

    console.log('Extracting archive...');
    if (platform === 'win32') {
        // Use built-in tar on modern Windows
        execSync(`tar -xf "${archivePath}" -C "${binDir}"`, { stdio: 'inherit' });
    } else {
        execSync(`tar -xzf "${archivePath}" -C "${binDir}"`, { stdio: 'inherit' });
    }

    console.log('Cleaning up archive...');
    fs.unlinkSync(archivePath);

    console.log('Initializing arduino-cli and installing arduino:avr core (this may take a few minutes)...');
    const cliExecutable = platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli';
    const cliPath = path.join(binDir, cliExecutable);
    const dataDir = path.join(__dirname, '..', '.arduino-data');
    
    // Use environment variables instead of --data-dir flag for modern arduino-cli
    const env = {
        ...process.env,
        ARDUINO_DIRECTORIES_DATA: dataDir,
        ARDUINO_DATA_DIR: dataDir
    };
    
    execSync(`"${cliPath}" core update-index`, { stdio: 'inherit', env });
    execSync(`"${cliPath}" core install arduino:avr`, { stdio: 'inherit', env });

    console.log('✅ arduino-cli and avr:uno setup completed successfully!');
} catch (error) {
    console.error('❌ Failed to download or extract arduino-cli:', error.message);
    process.exit(1);
}
