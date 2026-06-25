const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const keyPath = path.join(__dirname, '..', 'server.key');
const certPath = path.join(__dirname, '..', 'server.crt');

// 如果憑證已存在，詢問是否覆蓋
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('⚠️  server.key 和 server.crt 已存在，將會覆蓋。');
}

// 尋找系統中的 openssl 執行檔
function findOpenSSL() {
    const platform = os.platform();

    // 優先嘗試系統 PATH 中的 openssl
    try {
        execSync('openssl version', { stdio: 'pipe' });
        return 'openssl';
    } catch (e) {
        // 系統 PATH 中沒有 openssl
    }

    // Windows: 嘗試 Git 內建的 openssl
    if (platform === 'win32') {
        const gitOpenSSLPaths = [
            'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
            'C:\\Program Files (x86)\\Git\\usr\\bin\\openssl.exe'
        ];
        for (const p of gitOpenSSLPaths) {
            if (fs.existsSync(p)) {
                return `"${p}"`;
            }
        }
    }

    return null;
}

const opensslCmd = findOpenSSL();

if (!opensslCmd) {
    console.error('❌ 找不到 openssl！');
    console.error('');
    console.error('請依照您的作業系統安裝 OpenSSL：');
    console.error('  Windows: 安裝 Git for Windows (內含 OpenSSL)');
    console.error('  macOS:   brew install openssl');
    console.error('  Linux:   sudo apt install openssl');
    process.exit(1);
}

console.log(`🔑 使用 OpenSSL: ${opensslCmd}`);
console.log('📝 正在生成自簽憑證...');

try {
    const cmd = `${opensslCmd} req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -subj "/CN=arduino-ide.local"`;

    // Windows MSYS 環境下需要設定環境變數避免路徑轉換問題
    const env = { ...process.env };
    if (os.platform() === 'win32') {
        env.MSYS_NO_PATHCONV = '1';
    }

    execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], env });

    console.log('');
    console.log('✅ 憑證生成成功！');
    console.log(`   🔐 私鑰: ${keyPath}`);
    console.log(`   📜 憑證: ${certPath}`);
    console.log('   ⏰ 有效期限: 10 年');
} catch (error) {
    console.error('❌ 憑證生成失敗:', error.message);
    process.exit(1);
}
