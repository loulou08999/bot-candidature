// index.js
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType,
  Events,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// --- Constantes ---
const SALON_COMMANDES = "1430215423101763604";
const ROLE_MAITRE = "1430215534456340592";
const ADMIN_PASSWORD = "FkeeleiosX";
const DATA_FILE = "./data.json";

// --- Express keep alive (optionnel si deploy sur Render/Heroku) ---
import express from "express";
const app = express();
app.get("/", (req, res) => res.send("Bot F4X_Cat en ligne ✅"));
app.listen(process.env.PORT || 3000);

// --- Charger ou créer le fichier data.json ---
let data = { maitre: null, faim: 100, bonheur: 100 };
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
} else {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- Bot Discord ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

// --- Commandes slash ---
const commands = [
  new SlashCommandBuilder().setName("adopter").setDescription("Adopte F4X_Cat si disponible !"),
  new SlashCommandBuilder().setName("faim").setDescription("Voir le niveau de faim de F4X_Cat."),
  new SlashCommandBuilder().setName("nourrir").setDescription("Nourrir F4X_Cat (+10% faim)."),
  new SlashCommandBuilder().setName("caresser").setDescription("Caresser F4X_Cat (+10% bonheur)."),
  new SlashCommandBuilder().setName("bonheur").setDescription("Voir le bonheur de F4X_Cat."),
  new SlashCommandBuilder().setName("admin").setDescription("Accéder au menu admin stylé de F4X_Cat."),
].map((c) => c.toJSON());

// --- Enregistrer les commandes ---
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log("📦 Mise à jour des commandes...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Commandes slash enregistrées !");
  } catch (e) {
    console.error("❌ Erreur :", e);
  }
})();

// --- Helper pour barre de progression emoji ---
function barreProgression(val) {
  const total = 10;
  const rempli = Math.round((val / 100) * total);
  const vide = total - rempli;
  const color = val > 70 ? "🟩" : val > 40 ? "🟨" : "🟥";
  return `${color.repeat(rempli)}⬛`.repeat(vide) + ` ${val}%`;
}

// --- Lancement ---
client.once("ready", () => console.log(`🤖 Connecté en tant que ${client.user.tag}`));

// --- Interaction principale ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Empêche usage hors salon
  if (interaction.channelId !== SALON_COMMANDES && interaction.commandName !== "admin") {
    return interaction.reply({ content: "❌ Cette commande n'est pas autorisée ici.", ephemeral: true });
  }

  // /adopter
  if (interaction.commandName === "adopter") {
    if (data.maitre) return interaction.reply({ content: `😿 F4X_Cat appartient déjà à <@${data.maitre}>.`, ephemeral: true });
    data.maitre = interaction.user.id;
    saveData();
    const role = interaction.guild.roles.cache.get(ROLE_MAITRE);
    if (role) await interaction.member.roles.add(role);
    return interaction.reply(`🎉 <@${interaction.user.id}> a adopté F4X_Cat !`);
  }

  // /faim
  if (interaction.commandName === "faim") return interaction.reply(`🍗 Faim : **${data.faim}%**\n${barreProgression(data.faim)}`);

  // /nourrir
  if (interaction.commandName === "nourrir") {
    if (interaction.user.id !== data.maitre) return interaction.reply({ content: "❌ Seul le maître peut nourrir.", ephemeral: true });
    data.faim = Math.min(100, data.faim + 10);
    saveData();
    return interaction.reply(`🍖 F4X_Cat a été nourri ! Faim : **${data.faim}%**\n${barreProgression(data.faim)}`);
  }

  // /caresser
  if (interaction.commandName === "caresser") {
    if (interaction.user.id !== data.maitre) return interaction.reply({ content: "❌ Seul le maître peut caresser.", ephemeral: true });
    data.bonheur = Math.min(100, data.bonheur + 10);
    saveData();
    return interaction.reply(`😺 F4X_Cat est heureux ! Bonheur : **${data.bonheur}%**\n${barreProgression(data.bonheur)}`);
  }

  // /bonheur
  if (interaction.commandName === "bonheur") return interaction.reply(`😺 Bonheur : **${data.bonheur}%**\n${barreProgression(data.bonheur)}`);

  // /admin
  if (interaction.commandName === "admin") {
    const modal = new ModalBuilder()
      .setCustomId("adminModal")
      .setTitle("🔐 Accès Admin");
    const pwd = new TextInputBuilder().setCustomId("adminPassword").setLabel("Mot de passe").setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(pwd));
    await interaction.showModal(modal);
  }
});

// --- Gestion modal mot de passe ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === "adminModal") {
    const password = interaction.fields.getTextInputValue("adminPassword");
    if (password !== ADMIN_PASSWORD) return interaction.reply({ content: "❌ Mot de passe incorrect.", ephemeral: true });

    // --- Embed menu admin ---
    const embed = new EmbedBuilder()
      .setTitle("🐾 Menu Admin F4X_Cat")
      .setDescription(
        `👑 Maître : ${data.maitre ? `<@${data.maitre}>` : "Aucun"}\n🍗 Faim : **${data.faim}%** ${barreProgression(data.faim)}\n😺 Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur)}`
      )
      .setColor("Gold")
      .setFooter({ text: "Menu visible uniquement pour toi" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("faimPlus").setLabel("🍖 +10% Faim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("faimMoins").setLabel("🍗 -10% Faim").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("bonheurPlus").setLabel("💖 +10% Bonheur").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("bonheurMoins").setLabel("💔 -10% Bonheur").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("reset").setLabel("♻️ Réinitialiser").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("changerMaitre").setLabel("👑 Changer Maître").setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // --- Gestion boutons menu admin ---
  if (interaction.isButton()) {
    const id = interaction.customId;

    switch (id) {
      case "faimPlus": data.faim = Math.min(100, data.faim + 10); break;
      case "faimMoins": data.faim = Math.max(0, data.faim - 10); break;
      case "bonheurPlus": data.bonheur = Math.min(100, data.bonheur + 10); break;
      case "bonheurMoins": data.bonheur = Math.max(0, data.bonheur - 10); break;
      case "reset": data = { maitre: null, faim: 100, bonheur: 100 }; break;
      case "changerMaitre":
        // Menu select pour choisir nouveau maître
        const guild = interaction.guild;
        const membersOptions = guild.members.cache
          .filter(m => !m.user.bot)
          .map(m => new StringSelectMenuOptionBuilder().setLabel(m.user.username).setValue(m.id));
        const menu = new StringSelectMenuBuilder().setCustomId("selectMaitre").addOptions(membersOptions).setPlaceholder("Choisir un nouveau maître");
        await interaction.reply({ content: "Sélectionne un nouveau maître :", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
        return;
    }

    saveData();
    const updatedEmbed = new EmbedBuilder()
      .setTitle("🐾 Menu Admin F4X_Cat (Mis à jour)")
      .setDescription(
        `👑 Maître : ${data.maitre ? `<@${data.maitre}>` : "Aucun"}\n🍗 Faim : **${data.faim}%** ${barreProgression(data.faim)}\n😺 Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur)}`
      )
      .setColor("Blue")
      .setFooter({ text: "Menu visible uniquement pour toi" })
      .setTimestamp();

    await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
  }

  // --- Choix nouveau maître ---
  if (interaction.isStringSelectMenu() && interaction.customId === "selectMaitre") {
    data.maitre = interaction.values[0];
    saveData();

    const guild = interaction.guild;
    const role = guild.roles.cache.get(ROLE_MAITRE);
    // Retirer rôle à tous
    guild.members.cache.forEach(m => m.roles.remove(role).catch(()=>{}));
    // Ajouter rôle au nouveau maître
    const member = guild.members.cache.get(data.maitre);
    if (member) await member.roles.add(role);

    await interaction.update({ content: `👑 Nouveau maître : <@${data.maitre}>`, components: [] });
  }
});

client.login(process.env.TOKEN);
