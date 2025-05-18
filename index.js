
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const phoneNumber = '255752593977'; // Replace with the user's phone number
    const code = await sock.requestPairingCode(phoneNumber);
    console.log('Pairing code:', code);
    // Display this code to the user in your dashboard
  }
sock.ev.on('connection.update', (update) => {
    const { connection } = update;
    if (connection === 'open') {
      console.log('Connected successfully');
    }
  });
}

start();
