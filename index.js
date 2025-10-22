import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

// ======================= CONFIG ======================= //
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SERVER_ID = process.env.SERVER_ID || "1430215423101763604";

// ======================= CLIENT ======================= //
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ======================= COMMANDES ======================= //
const commands = [
  {
    name: "formulaire",
    description: "Remplir le formulaire de candidature",
  },
  {
    name: "abandonner",
    description: "Abandonner sa candidature en cours",
  },
  {
    name: "adminpanel",
    description: "Ouvre le panneau d’administration",
  },
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("📦 Enregistrement des commandes globales...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Commandes enregistrées avec succès !");
  } catch (err) {
    console.error("❌ Erreur enregistrement commandes:", err);
  }
})();

// ======================= PANEL ADMIN ======================= //
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>Admin Panel</title></head>
      <body style="font-family:sans-serif;background:#111;color:white;text-align:center">
        <h1>🔐 Admin Panel</h1>
        <form action="/login" method="post">
          <input type="password" name="password" placeholder="Mot de passe admin" />
          <button type="submit">Se connecter</button>
        </form>
      </body>
    </html>
  `);
});

app.post("/login", express.urlencoded({ extended: true }), (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.send(`<h2>✅ Accès autorisé !</h2><p>Panneau admin en construction.</p>`);
  } else {
    res.send(`<h2>❌ Mot de passe incorrect</h2>`);
  }
});

app.listen(PORT, () => console.log(`🌐 Serveur web sur le port ${PORT}`));

// ======================= BOT READY ======================= //
client.once("ready", () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
});

// ======================= INTERACTIONS ======================= //
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "formulaire") {
    const modal = new ModalBuilder()
      .setCustomId("form_candidature")
      .setTitle("Formulaire de Candidature");

    const question = new TextInputBuilder()
      .setCustomId("raison")
      .setLabel("Pourquoi veux-tu rejoindre le staff ?")
      .setStyle(TextInputStyle.Paragraph);

    const row = new ActionRowBuilder().addComponents(question);
    modal.addComponents(row);
    await interaction.showModal(modal);
  }

  if (interaction.commandName === "abandonner") {
    await interaction.reply({
      content: "🚫 Tu as abandonné ta candidature.",
      ephemeral: true,
    });
  }

  if (interaction.commandName === "adminpanel") {
    await interaction.reply({
      content: "🖥️ Va sur ton **panel web Render** pour administrer ton bot.",
      ephemeral: true,
    });
  }
});

// ======================= LOGIN ======================= //
client.login(TOKEN);
