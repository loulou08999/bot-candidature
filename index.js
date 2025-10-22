// ==============================
// 🤖 BOT CANDIDATURE COMPLET 2025
// Compatible Node 22 & Render
// ==============================

import dotenv from "dotenv";
import express from "express";
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField,
  REST,
  Routes,
  Events
} from "discord.js";

dotenv.config();
const app = express();

// ==============================
// ⚙️ CONFIGURATION
// ==============================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 10000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel],
});

app.get("/", (req, res) => res.send("Bot en ligne ✅"));
app.listen(PORT, () => console.log(`🌐 Serveur web sur le port ${PORT}`));

// ==============================
// 🔐 ADMIN PANEL (mot de passe + sécurité)
// ==============================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "supersecret";
const LOG_CHANNEL_ID = "1430215423101763604"; // Salon pour logs admin

// ==============================
// 📋 COMMANDES SLASH
// ==============================
const commands = [
  {
    name: "formulaire",
    description: "Envoyer le formulaire de candidature"
  },
  {
    name: "abandonner",
    description: "Abandonner sa candidature"
  },
  {
    name: "adminpanel",
    description: "Ouvrir le panneau admin (sécurisé)"
  },
  {
    name: "resetroles",
    description: "Supprime tous les rôles automatiques (Admin uniquement)"
  },
  {
    name: "verif",
    description: "Lance une vérification de sécurité"
  },
  {
    name: "alerte",
    description: "Envoie une alerte à un utilisateur"
  },
  {
    name: "mission",
    description: "Attribue une mission spéciale à un joueur"
  },
  {
    name: "reward",
    description: "Donne une récompense à un joueur"
  },
  {
    name: "quest",
    description: "Crée une quête avec une récompense"
  },
  {
    name: "info",
    description: "Affiche les infos du serveur"
  },
  {
    name: "help",
    description: "Liste toutes les commandes disponibles"
  }
];

// ==============================
// 📦 ENREGISTREMENT DES COMMANDES
// ==============================
(async () => {
  try {
    console.log("📦 Enregistrement des commandes globales...");
    const rest = new REST({ version: "10" }).setToken(TOKEN);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log("✅ Commandes globales enregistrées !");
  } catch (error) {
    console.error("❌ Erreur enregistrement commandes:", error);
  }
})();

// ==============================
// 🤖 ÉVÉNEMENTS DU BOT
// ==============================
client.once(Events.ClientReady, () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);
});

// ==============================
// 🧩 LOGIQUE DES COMMANDES
// ==============================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user, guild } = interaction;

  // =============== FORMULAIRE ===============
  if (commandName === "formulaire") {
    const modal = new ModalBuilder()
      .setCustomId("formulaire_modal")
      .setTitle("📝 Candidature");

    const question1 = new TextInputBuilder()
      .setCustomId("q1")
      .setLabel("Pourquoi veux-tu rejoindre le staff ?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const question2 = new TextInputBuilder()
      .setCustomId("q2")
      .setLabel("As-tu déjà eu de l’expérience dans un staff ?")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(question1);
    const row2 = new ActionRowBuilder().addComponents(question2);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
  }

  // =============== ABANDONNER ===============
  else if (commandName === "abandonner") {
    await interaction.reply({
      content: `❌ ${user.username} a abandonné sa candidature.`,
      ephemeral: false,
    });
  }

  // =============== ADMIN PANEL ===============
  else if (commandName === "adminpanel") {
    await interaction.reply({
      content: "🔑 Veuillez entrer le mot de passe dans le chat (valable 1 minute).",
      ephemeral: true,
    });

    const filter = (m) => m.author.id === user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

    collector.on("collect", async (m) => {
      if (m.content === ADMIN_PASSWORD) {
        collector.stop("success");
        const embed = new EmbedBuilder()
          .setTitle("🛠️ Panneau Admin")
          .setDescription("Bienvenue dans le panneau de contrôle du bot !")
          .setColor("Gold")
          .addFields(
            { name: "/resetroles", value: "🧹 Supprime tous les rôles automatiques" },
            { name: "/verif", value: "🕵️ Lance une vérification de sécurité" },
            { name: "/alerte", value: "🚨 Envoie une alerte à un membre" },
            { name: "/mission", value: "🎯 Donne une mission spéciale" },
            { name: "/reward", value: "🎁 Récompense un utilisateur" },
            { name: "/quest", value: "📜 Crée une quête" }
          );

        await interaction.followUp({ embeds: [embed], ephemeral: false });
      } else {
        await interaction.followUp({ content: "⛔ Mot de passe incorrect.", ephemeral: true });
      }
    });
  }

  // =============== HELP ===============
  else if (commandName === "help") {
    const helpEmbed = new EmbedBuilder()
      .setTitle("📖 Liste des commandes")
      .setDescription("Voici toutes les commandes disponibles :")
      .addFields(
        { name: "👥 /formulaire", value: "Remplir une candidature" },
        { name: "🚪 /abandonner", value: "Abandonner sa candidature" },
        { name: "🛠️ /adminpanel", value: "Ouvrir le panneau admin (mot de passe requis)" },
        { name: "🎯 /mission", value: "Donner une mission à un joueur" },
        { name: "🎁 /reward", value: "Donner une récompense" },
        { name: "📜 /quest", value: "Créer une quête spéciale" },
        { name: "🔎 /verif", value: "Lancer une vérification" },
        { name: "🚨 /alerte", value: "Envoyer une alerte à un utilisateur" }
      )
      .setColor("Blurple");
    await interaction.reply({ embeds: [helpEmbed], ephemeral: false });
  }
});

// ==============================
// 📬 MODAL HANDLER
// ==============================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;

  if (interaction.customId === "formulaire_modal") {
    const reponse1 = interaction.fields.getTextInputValue("q1");
    const reponse2 = interaction.fields.getTextInputValue("q2");

    const embed = new EmbedBuilder()
      .setTitle("📨 Nouvelle candidature")
      .setDescription(`Candidat : ${interaction.user}`)
      .addFields(
        { name: "Motivation", value: reponse1 },
        { name: "Expérience", value: reponse2 }
      )
      .setColor("Green")
      .setTimestamp();

    const channel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
    if (channel) await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: "✅ Candidature envoyée avec succès !",
      ephemeral: true,
    });
  }
});

// ==============================
// 🚀 CONNEXION DU BOT
// ==============================
client.login(TOKEN);
