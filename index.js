const express = require("express");
const fs = require("fs");
const path = require("path");
const PastebinAPI = require("pastebin-js");
const { makeid } = require("./id");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  delay
} = require("@whiskeysockets/baileys");

const app = express();
const pastebin = new PastebinAPI("EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL");

app.use(express.static("public"));

function removeFile(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

app.get("/pair", async (req, res) => {
  const id = makeid();
  let number = req.query.number;

  if (!number) return res.send({ error: "Number is required" });

  const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
  const { version } = await fetchLatestBaileysVersion();

  try {
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
      },
      printQRInTerminal: false,
      logger: pino({ level: "fatal" }),
      browser: ["FredieTech", "Chrome", "1.0"]
    });

    if (!sock.authState.creds.registered) {
      await delay(1500);
      number = number.replace(/[^0-9]/g, "");
      const code = await sock.requestPairingCode(number);
      res.send({ code });

      sock.ev.on("creds.update", saveCreds);
      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
          await delay(5000);
          const data = fs.readFileSync(path.join(__dirname, `./temp/${id}/creds.json`));
          const b64 = Buffer.from(data).toString("base64");

          await sock.sendMessage(sock.user.id, { text: "LUCKY-MD;;;=>" + b64 });

          const message = `
✧LUCKY MD DEVICE SUCCESSFULLY CONNECTED✧
▬▬▬▬▬▬▬▬▬▬▬▬▬▬
🤦  *Creator* ☞ ✧FREDI EZRA✧
🍽️  *Repo*  ☞ https://github.com/Fred1e/LUCKY_MD
🫂  WhatsApp Channel ☞ https://whatsapp.com/channel/0029VaihcQv84Om8LP59fO3f
🥂 *Contact Owner* ☞ https://wa.me/255752593977
> ©*FREDIE TECH 2025 SCRIPT*`;

          await sock.sendMessage(sock.user.id, { text: message });
          await delay(100);
          await sock.ws.close();
          removeFile(`./temp/${id}`);
        }

        if (
          connection === "close" &&
          lastDisconnect &&
          lastDisconnect.error &&
          lastDisconnect.error.output?.statusCode !== 401
        ) {
          console.log("Retrying...");
        }
      });
    }
  } catch (err) {
    console.error("Error occurred:", err);
    removeFile(`./temp/${id}`);
    res.send({ error: "Failed to pair device" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FredieTech WhatsApp Pair Server running on http://localhost:${PORT}`);
});
