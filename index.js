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

// --- Express keep alive ---
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
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

// --- Client Discord ---
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
  new SlashCommandBuilder().setName("abandonner").setDescription("Abandonner F4X_Cat (uniquement pour le maître)."),
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
  } catch (e) { console.error("❌ Erreur :", e); }
})();

// --- Helper barre emoji stylée ---
function barreProgression(val, type) {
  const total = 10;
  const rempli = Math.round((val / 100) * total);
  const vide = total - rempli;
  let colorEmoji;
  if(type === "faim") colorEmoji = val > 70 ? "🍗" : val > 40 ? "🥩" : "🍖";
  else colorEmoji = val > 70 ? "💖" : val > 40 ? "💛" : "💔";
  return `${colorEmoji.repeat(rempli)}⬛`.repeat(vide) + ` ${val}%`;
}

// --- Bot prêt ---
client.once("ready", () => console.log(`🤖 Connecté en tant que ${client.user.tag}`));

// --- Interaction principale ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.channelId !== SALON_COMMANDES && !["admin","abandonner"].includes(interaction.commandName)) 
    return interaction.reply({ content: "❌ Cette commande n'est pas autorisée ici.", ephemeral: true });

  // --- Adopter ---
  if (interaction.commandName === "adopter") {
    if (data.maitre) return interaction.reply({ content: `😿 F4X_Cat est déjà adopté par <@${data.maitre}> !`, ephemeral: true });
    data.maitre = interaction.user.id;
    saveData();
    const role = interaction.guild.roles.cache.get(ROLE_MAITRE);
    if(role) await interaction.member.roles.add(role);
    return interaction.reply(`🎉 Bravo <@${interaction.user.id}> ! Tu as adopté **F4X_Cat** 🐱\n🍀 Prends bien soin de lui !`);
  }

  // --- Abandonner ---
  if (interaction.commandName === "abandonner") {
    if(interaction.user.id !== data.maitre) return interaction.reply({ content:"❌ Seul le maître peut abandonner F4X_Cat.", ephemeral:true });
    const guild = interaction.guild;
    const role = guild.roles.cache.get(ROLE_MAITRE);
    if(role) await interaction.member.roles.remove(role);
    data.maitre = null;
    saveData();
    return interaction.reply("😿 F4X_Cat a été abandonné et est maintenant disponible pour adoption !");
  }

  // --- Faim ---
  if(interaction.commandName === "faim") 
    return interaction.reply(`🍗 Faim de F4X_Cat : **${data.faim}%**\n${barreProgression(data.faim,"faim")}`);

  // --- Nourrir ---
  if(interaction.commandName === "nourrir") {
    if(interaction.user.id !== data.maitre) return interaction.reply({ content:"❌ Seul le maître peut nourrir F4X_Cat.", ephemeral:true });
    data.faim = Math.min(100,data.faim+10);
    saveData();
    return interaction.reply(`🍖 F4X_Cat a été nourri avec amour ! Faim : **${data.faim}%**\n${barreProgression(data.faim,"faim")}`);
  }

  // --- Caresser ---
  if(interaction.commandName === "caresser") {
    if(interaction.user.id !== data.maitre) return interaction.reply({ content:"❌ Seul le maître peut caresser F4X_Cat.", ephemeral:true });
    data.bonheur = Math.min(100,data.bonheur+10);
    saveData();
    return interaction.reply(`😺 F4X_Cat ronronne de bonheur ! Bonheur : **${data.bonheur}%**\n${barreProgression(data.bonheur,"bonheur")}`);
  }

  // --- Bonheur ---
  if(interaction.commandName === "bonheur") 
    return interaction.reply(`💖 Bonheur de F4X_Cat : **${data.bonheur}%**\n${barreProgression(data.bonheur,"bonheur")}`);

  // --- Admin ---
  if(interaction.commandName==="admin"){
    const modal = new ModalBuilder().setCustomId("adminModal").setTitle("🔐 Accès Admin F4X_Cat");
    const pwd = new TextInputBuilder().setCustomId("adminPassword").setLabel("Mot de passe").setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(pwd));
    await interaction.showModal(modal);
  }
});

// --- Modal Admin ---
client.on(Events.InteractionCreate, async(interaction)=>{
  if(interaction.type===InteractionType.ModalSubmit && interaction.customId==="adminModal"){
    const password = interaction.fields.getTextInputValue("adminPassword");
    if(password!==ADMIN_PASSWORD) return interaction.reply({ content:"❌ Mot de passe incorrect.", ephemeral:true });

    const embed = new EmbedBuilder()
      .setTitle("🐾 Menu Admin F4X_Cat")
      .setDescription(
        `👑 Maître : ${data.maitre ? `<@${data.maitre}>`:"Aucun"}\n🍗 Faim : **${data.faim}%** ${barreProgression(data.faim,"faim")}\n💖 Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur,"bonheur")}`
      ).setColor("Gold").setFooter({ text:"Menu visible uniquement pour toi" }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("faimPlus").setLabel("🍖 +10% Faim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("bonheurPlus").setLabel("💖 +10% Bonheur").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("abandonMaitre").setLabel("😿 Abandonner maître").setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds:[embed], components:[row], ephemeral:true });
  }

  // --- Gestion boutons Admin ---
  if(interaction.isButton()){
    switch(interaction.customId){
      case "faimPlus": data.faim=Math.min(100,data.faim+10); break;
      case "bonheurPlus": data.bonheur=Math.min(100,data.bonheur+10); break;
      case "abandonMaitre":
        const guild=interaction.guild;
        const role=guild.roles.cache.get(ROLE_MAITRE);
        if(data.maitre){
          const member=guild.members.cache.get(data.maitre);
          if(member && role) await member.roles.remove(role);
          data.maitre=null;
        }
        break;
    }
    saveData();
    const updatedEmbed=new EmbedBuilder()
      .setTitle("🐾 Menu Admin F4X_Cat (Mis à jour)")
      .setDescription(
        `👑 Maître : ${data.maitre ? `<@${data.maitre}>`:"Aucun"}\n🍗 Faim : **${data.faim}%** ${barreProgression(data.faim,"faim")}\n💖 Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur,"bonheur")}`
      ).setColor("Blue").setFooter({ text:"Menu visible uniquement pour toi" }).setTimestamp();
    await interaction.update({ embeds:[updatedEmbed], components:interaction.message.components });
  }
});

client.login(process.env.TOKEN);
