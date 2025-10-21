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
  Events
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";

dotenv.config();

// --- Constantes ---
const SALON_COMMANDES = "1430215423101763604";
const ROLE_MAITRE = "1430215534456340592";
const ADMIN_PASSWORD = "FkeeleiosX";
const DATA_FILE = "./data.json";

// --- Express keep alive ---
const app = express();
app.get("/", (req, res) => res.send("Bot F4X_Cat en ligne ✅"));
app.listen(process.env.PORT || 3000);

// --- Charger ou créer le fichier data.json ---
let data = { maitre: null, faim: 100, bonheur: 100, anciensMaitres: [], etat: "vivant" };
if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE));
else fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

// --- Client Discord ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// --- Commandes slash ---
const commands = [
  new SlashCommandBuilder().setName("adopter").setDescription("Adopte F4X_Cat si disponible !"),
  new SlashCommandBuilder().setName("abandonner").setDescription("Abandonner F4X_Cat (uniquement pour le maître)."),
  new SlashCommandBuilder().setName("faim").setDescription("Voir le niveau de faim de F4X_Cat."),
  new SlashCommandBuilder().setName("nourrir").setDescription("Nourrir F4X_Cat (+10% faim)."),
  new SlashCommandBuilder().setName("caresser").setDescription("Caresser F4X_Cat (+10% bonheur)."),
  new SlashCommandBuilder().setName("bonheur").setDescription("Voir le bonheur de F4X_Cat."),
  new SlashCommandBuilder().setName("admin").setDescription("Accéder au panel admin de F4X_Cat."),
].map(c => c.toJSON());

// --- Enregistrer les commandes ---
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log("📦 Mise à jour des commandes...");
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log("✅ Commandes slash enregistrées !");
  } catch (e) { console.error("❌ Erreur :", e); }
})();

// --- Helper barres emoji stylées ---
function barreProgression(val, type){
  const total = 10;
  const rempli = Math.round((val/100)*total);
  const vide = total - rempli;
  let emoji = type==="faim" ? (val>70?"🍗":val>40?"🥩":"🍖") : (val>70?"💖":val>40?"💛":"💔");
  return `${emoji.repeat(rempli)}⬛`.repeat(vide) + ` ${val}%`;
}

// --- Fonction gentillesse ---
function saveMaitreGentillesse(id, score){
  const idx = data.anciensMaitres.findIndex(m => m.id === id);
  if(idx>=0) data.anciensMaitres[idx].gentillesse += score;
  else data.anciensMaitres.push({id, gentillesse: score});
}

// --- Mort et depression ---
function checkEtat(){
  if(data.faim <= 0){
    data.etat = "mort";
    if(data.maitre){
      const role = client.guilds.cache.first().roles.cache.get(ROLE_MAITRE);
      if(role){
        const member = client.guilds.cache.first().members.cache.get(data.maitre);
        if(member) member.roles.remove(role).catch(()=>{});
      }
    }
    data.maitre = null;
    data.faim = 100;
    data.bonheur = 100;
    saveData();
  }
  if(data.bonheur <= 0){
    data.etat = "depression";
  } else if(data.etat === "depression" && data.bonheur > 0){
    data.etat = "vivant";
  }
}

// --- Bot prêt ---
client.once("ready",()=>console.log(`🤖 Connecté en tant ${client.user.tag}`));

// --- Interaction principale ---
client.on(Events.InteractionCreate, async interaction=>{
  if(interaction.isChatInputCommand()){
    if(interaction.channelId!==SALON_COMMANDES && !["admin","abandonner"].includes(interaction.commandName))
      return interaction.reply({ content:"❌ Cette commande n'est pas autorisée ici.", ephemeral:true });

    // --- Adopter ---
    if(interaction.commandName==="adopter"){
      if(data.maitre) return interaction.reply({ content:`😿 F4X_Cat est déjà adopté par <@${data.maitre}> !`, ephemeral:true });
      data.maitre=interaction.user.id;
      saveMaitreGentillesse(interaction.user.id,0);
      saveData();
      const role = interaction.guild.roles.cache.get(ROLE_MAITRE);
      if(role) await interaction.member.roles.add(role);
      return interaction.reply(`🎉 Bravo <@${interaction.user.id}> ! Tu as adopté **F4X_Cat** 🐱\n🍀 Prends bien soin de lui !`);
    }

    // --- Abandonner ---
    if(interaction.commandName==="abandonner"){
      if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut abandonner F4X_Cat.", ephemeral:true });
      const role = interaction.guild.roles.cache.get(ROLE_MAITRE);
      if(role) await interaction.member.roles.remove(role);
      data.maitre=null;
      saveData();
      return interaction.reply("😿 F4X_Cat a été abandonné et est maintenant disponible pour adoption !");
    }

    // --- Faim ---
    if(interaction.commandName==="faim")
      return interaction.reply(`🍗 Faim de F4X_Cat : **${data.faim}%**\n${barreProgression(data.faim,"faim")}`);

    // --- Nourrir ---
    if(interaction.commandName==="nourrir"){
      if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut nourrir F4X_Cat.", ephemeral:true });
      data.faim=Math.min(100,data.faim+10);
      if(data.etat==="depression") data.faim=Math.min(100,data.faim+5);
      saveMaitreGentillesse(interaction.user.id,2);
      checkEtat();
      saveData();
      return interaction.reply(`🍖 F4X_Cat a été nourri ! Faim : **${data.faim}%**\n${barreProgression(data.faim,"faim")}`);
    }

    // --- Caresser ---
    if(interaction.commandName==="caresser"){
      if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut caresser F4X_Cat.", ephemeral:true });
      data.bonheur=Math.min(100,data.bonheur+10);
      saveMaitreGentillesse(interaction.user.id,2);
      checkEtat();
      saveData();
      return interaction.reply(`😺 F4X_Cat ronronne ! Bonheur : **${data.bonheur}%**\n${barreProgression(data.bonheur,"bonheur")}`);
    }

    // --- Bonheur ---
    if(interaction.commandName==="bonheur")
      return interaction.reply(`💖 Bonheur de F4X_Cat : **${data.bonheur}%**\n${barreProgression(data.bonheur,"bonheur")}`);

    // --- Admin ---
    if(interaction.commandName==="admin"){
      const modal = new ModalBuilder().setCustomId("adminModal").setTitle("🔐 Accès Admin F4X_Cat");
      const pwd = new TextInputBuilder().setCustomId("adminPassword").setLabel("Mot de passe").setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(pwd));
      return interaction.showModal(modal);
    }
  }

  // --- Modal admin ---
  if(interaction.type===InteractionType.ModalSubmit && interaction.customId==="adminModal"){
    const pwd = interaction.fields.getTextInputValue("adminPassword");
    if(pwd!==ADMIN_PASSWORD) return interaction.reply({ content:"❌ Mot de passe incorrect.", ephemeral:true });

    const embed = new EmbedBuilder()
      .setTitle("🐾 Panel Admin F4X_Cat")
      .setDescription(
        `👑 Maître : ${data.maitre ? `<@${data.maitre}>`:"Aucun"}\n🍗 Faim : **${data.faim}%** ${barreProgression(data.faim,"faim")}\n💖 Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur,"bonheur")}\n🧠 Etat : ${data.etat}\n📜 Maîtres précédents : ${data.anciensMaitres.map(m=>`<@${m.id}> (${m.gentillesse})`).join(", ") || "Aucun"}`
      )
      .setColor("Gold").setFooter({ text:"Menu admin interactif" }).setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("resetF4X").setLabel("♻️ Réinitialiser F4X").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("addFaim").setLabel("🍗 +10 Faim").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("addBonheur").setLabel("💖 +10 Bonheur").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("forceAdopt").setLabel("👑 Forcer Adoption").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("forceAbandon").setLabel("😿 Forcer Abandon").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("reanimer").setLabel("🩺 Réanimer F4X").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("supprimerMaitre").setLabel("❌ Supprimer Maître").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("ajouterMaitre").setLabel("➕ Ajouter Maître").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("bonusFaim").setLabel("🍗 Bonus Faim +50").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("bonusBonheur").setLabel("💖 Bonus Bonheur +50").setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ embeds:[embed], components:[row], ephemeral:true });
  }

  // --- Gestion boutons admin ---
  if(interaction.isButton()){
    const user = interaction.user;
    if(interaction.message.interaction?.user.id!==user.id) return interaction.reply({ content:"❌ Ces boutons sont uniquement pour l'admin.", ephemeral:true });

    switch(interaction.customId){
      case "resetF4X":
        data.faim=100; data.bonheur=100; data.etat="vivant"; data.maitre=null; saveData();
        return interaction.update({ content:"♻️ F4X_Cat réinitialisé !", embeds:[], components:[] });
      case "addFaim":
        data.faim=Math.min(100,data.faim+10); saveData();
        return interaction.update({ content:`🍗 +10 Faim. Faim actuelle : ${data.faim}%`, embeds:[], components:[] });
      case "addBonheur":
        data.bonheur=Math.min(100,data.bonheur+10); saveData();
        return interaction.update({ content:`💖 +10 Bonheur. Bonheur actuel : ${data.bonheur}%`, embeds:[], components:[] });
      case "forceAdopt":
        data.maitre=user.id; saveMaitreGentillesse(user.id,0); saveData();
        const role = interaction.guild.roles.cache.get(ROLE_MAITRE);
        if(role){ const member = interaction.guild.members.cache.get(user.id); if(member) member.roles.add(role).catch(()=>{}); }
        return interaction.update({ content:`👑 F4X_Cat adopté par <@${user.id}> !`, embeds:[], components:[] });
      case "forceAbandon":
        data.maitre=null; saveData();
        const role2 = interaction.guild.roles.cache.get(ROLE_MAITRE);
        if(role2){ const member = interaction.guild.members.cache.get(user.id); if(member) member.roles.remove(role2).catch(()=>{}); }
        return interaction.update({ content:"😿 F4X_Cat abandonné !", embeds:[], components:[] });
      case "reanimer":
        if(data.etat==="mort"){ data.etat="vivant"; data.faim=50; data.bonheur=50; saveData(); return interaction.update({ content:"🩺 F4X_Cat réanimé !", embeds:[], components:[] }); }
        else return interaction.reply({ content:"❌ F4X_Cat n'est pas mort.", ephemeral:true });
      case "supprimerMaitre":
        data.anciensMaitres = data.anciensMaitres.filter(m=>m.id!==user.id); saveData();
        return interaction.update({ content:"❌ Maître supprimé de l'historique.", embeds:[], components:[] });
      case "ajouterMaitre":
        data.anciensMaitres.push({id:user.id,gentillesse:0}); saveData();
        return interaction.update({ content:"➕ Maître ajouté à l'historique.", embeds:[], components:[] });
      case "bonusFaim":
        data.faim=Math.min(100,data.faim+50); saveData();
        return interaction.update({ content:`🍗 Bonus Faim +50. Faim actuelle : ${data.faim}%`, embeds:[], components:[] });
      case "bonusBonheur":
        data.bonheur=Math.min(100,data.bonheur+50); saveData();
        return interaction.update({ content:`💖 Bonus Bonheur +50. Bonheur actuelle : ${data.bonheur}%`, embeds:[], components:[] });
      default: return;
    }
  }
});

client.login(process.env.TOKEN);
