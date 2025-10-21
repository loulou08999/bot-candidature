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

// --- Constantes depuis .env ---
const SALON_COMMANDES = "1430215423101763604"; // salon spécifique
const ROLE_MAITRE = "1430215534456340592"; // rôle maître
const ADMIN_PASSWORD = "FkeeleiosX";
const DATA_FILE = "./data.json";
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 3000;

// --- Keep alive Express ---
const app = express();
app.get("/", (req, res) => res.send("Bot F4X_Cat en ligne ✅"));
app.listen(PORT, () => console.log(`Serveur en ligne sur le port ${PORT}`));

// --- Chargement / Création fichier data.json ---
let data = { maitre: null, faim: 100, bonheur: 100, energie: 100, humeur: "😺 Heureux", anciensMaitres: [], etat: "vivant", cadeaux: [] };
if(fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE));
else fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
function saveData(){ fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2)); }

// --- Client Discord ---
const client = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// --- Commandes Slash ---
const commands = [
  new SlashCommandBuilder().setName("adopter").setDescription("Adopte F4X_Cat si disponible !"),
  new SlashCommandBuilder().setName("abandonner").setDescription("Abandonner F4X_Cat si tu es le maître."),
  new SlashCommandBuilder().setName("faim").setDescription("Voir la faim de F4X_Cat."),
  new SlashCommandBuilder().setName("nourrir").setDescription("Nourrir F4X_Cat (+10% faim)."),
  new SlashCommandBuilder().setName("caresser").setDescription("Caresser F4X_Cat (+10% bonheur)."),
  new SlashCommandBuilder().setName("bonheur").setDescription("Voir le bonheur de F4X_Cat."),
  new SlashCommandBuilder().setName("jouer").setDescription("Jouer avec F4X_Cat (+énergie & bonheur)."),
  new SlashCommandBuilder().setName("cadeau").setDescription("Donne un cadeau aléatoire à F4X_Cat."),
  new SlashCommandBuilder().setName("admin").setDescription("Accéder au panel admin."),
  new SlashCommandBuilder().setName("regardez").setDescription("Voir toutes les infos F4X_Cat (admin).")
].map(c=>c.toJSON());

// --- Enregistrement des commandes ---
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async()=>{
  try{
    console.log("📦 Mise à jour des commandes...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body:commands });
    console.log("✅ Commandes enregistrées !");
  }catch(e){ console.error("❌ Erreur :", e); }
})();

// --- Barre progressions emoji ---
function barreProgression(val,type){
  const total=10;
  const rempli = Math.round((val/100)*total);
  const vide = total - rempli;
  let emoji = type==="faim" ? (val>70?"🍗":val>40?"🥩":"🍖") :
              type==="bonheur" ? (val>70?"💖":val>40?"💛":"💔") :
              type==="energie" ? (val>70?"⚡":val>40?"🔋":"💤") : "⬛";
  return `${emoji.repeat(rempli)}${"⬛".repeat(vide)} ${val}%`;
}

// --- Gentillesse et anciens maîtres ---
function saveMaitreGentillesse(id,score){
  const idx = data.anciensMaitres.findIndex(m=>m.id===id);
  if(idx>=0) data.anciensMaitres[idx].gentillesse+=score;
  else data.anciensMaitres.push({id,gentillesse:score});
}

// --- Mort, depression et vérification état ---
function checkEtat(){
  if(data.faim<=0){
    data.etat="mort";
    if(data.maitre){
      const guild = client.guilds.cache.get(GUILD_ID);
      const role = guild.roles.cache.get(ROLE_MAITRE);
      const member = guild.members.cache.get(data.maitre);
      if(role && member) member.roles.remove(role).catch(()=>{});
    }
    data.maitre=null;
    data.faim=100; data.bonheur=100; data.energie=100;
    saveData();
  }
  if(data.bonheur<=0){
    data.etat="depression";
    data.faim=Math.max(0,data.faim-20);
  }else if(data.etat==="depression" && data.bonheur>0){
    data.etat="vivant";
  }
}

// --- Bot prêt ---
client.once("ready",()=>console.log(`🤖 Connecté en tant ${client.user.tag}`));

// --- Interactions ---
client.on(Events.InteractionCreate, async interaction=>{
  if(interaction.isChatInputCommand()){
    
    // --- Vérification salon spécifique sauf admin et regardez ---
    if(!["admin","regardez"].includes(interaction.commandName) && interaction.channelId!==SALON_COMMANDES)
      return interaction.reply({ content:"❌ Cette commande n'est pas autorisée ici.", ephemeral:false });

    switch(interaction.commandName){
      case "adopter":
        if(data.maitre) return interaction.reply({ content:`😿 F4X_Cat est déjà adopté par <@${data.maitre}> !`, ephemeral:false });
        data.maitre=interaction.user.id;
        saveMaitreGentillesse(interaction.user.id,0);
        saveData();
        const role = interaction.guild.roles.cache.get(ROLE_MAITRE);
        if(role) await interaction.member.roles.add(role);
        return interaction.reply({ content:`🎉 <@${interaction.user.id}> a adopté **F4X_Cat** 🐱`, ephemeral:false });
      
      case "abandonner":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut abandonner F4X_Cat.", ephemeral:false });
        const role2 = interaction.guild.roles.cache.get(ROLE_MAITRE);
        if(role2) await interaction.member.roles.remove(role2);
        data.maitre=null; saveData();
        return interaction.reply({ content:"😿 F4X_Cat est abandonné et disponible pour adoption !", ephemeral:false });
      
      case "faim": return interaction.reply({ content:`🍗 Faim : **${data.faim}%** ${barreProgression(data.faim,"faim")}`, ephemeral:false });
      case "bonheur": return interaction.reply({ content:`💖 Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur,"bonheur")}`, ephemeral:false });
      case "nourrir":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut nourrir.", ephemeral:false });
        data.faim=Math.min(100,data.faim+10);
        if(data.etat==="depression") data.faim=Math.min(100,data.faim+5);
        saveMaitreGentillesse(interaction.user.id,2);
        checkEtat(); saveData();
        return interaction.reply({ content:`🍖 Nourri ! Faim : **${data.faim}%** ${barreProgression(data.faim,"faim")}`, ephemeral:false });
      
      case "caresser":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut caresser.", ephemeral:false });
        data.bonheur=Math.min(100,data.bonheur+10);
        saveMaitreGentillesse(interaction.user.id,2);
        checkEtat(); saveData();
        return interaction.reply({ content:`😺 F4X_Cat est heureux ! Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur,"bonheur")}`, ephemeral:false });
      
      case "jouer":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut jouer.", ephemeral:false });
        data.bonheur=Math.min(100,data.bonheur+15);
        data.energie=Math.max(0,data.energie-10);
        saveMaitreGentillesse(interaction.user.id,3);
        checkEtat(); saveData();
        return interaction.reply({ content:`🎾 Vous jouez avec F4X_Cat ! Bonheur : ${barreProgression(data.bonheur,"bonheur")}, Energie : ${barreProgression(data.energie,"energie")}`, ephemeral:false });

      case "cadeau":
        const cadeaux=["🎁 Jouet","🍗 Biscuit","💎 Gemme magique"];
        const cadeau = cadeaux[Math.floor(Math.random()*cadeaux.length)];
        data.cadeaux.push(cadeau); saveData();
        return interaction.reply({ content:`🎉 F4X_Cat reçoit un cadeau : **${cadeau}** !`, ephemeral:false });

      case "admin":
        const modal = new ModalBuilder().setCustomId("adminModal").setTitle("🔐 Admin F4X_Cat");
        const pwd = new TextInputBuilder().setCustomId("adminPassword").setLabel("Mot de passe").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(pwd));
        return interaction.showModal(modal);

      case "regardez":
        const embed = new EmbedBuilder()
          .setTitle("🐾 Infos complètes F4X_Cat")
          .setDescription(`👑 Maître : ${data.maitre?`<@${data.maitre}>`:"Aucun"}\n🍗 Faim : ${data.faim}% ${barreProgression(data.faim,"faim")}\n💖 Bonheur : ${data.bonheur}% ${barreProgression(data.bonheur,"bonheur")}\n⚡ Energie : ${data.energie}% ${barreProgression(data.energie,"energie")}\n🧠 Etat : ${data.etat}\n📜 Anciens maîtres : ${data.anciensMaitres.map(m=>`<@${m.id}> (${m.gentillesse})`).join(", ")||"Aucun"}\n🎁 Cadeaux : ${data.cadeaux.join(", ")||"Aucun"}`);
        return interaction.reply({ embeds:[embed], ephemeral:false });
    }
  }

  // --- Modal admin ---
  if(interaction.type===InteractionType.ModalSubmit && interaction.customId==="adminModal"){
    const mdp = interaction.fields.getTextInputValue("adminPassword");
    if(mdp!==ADMIN_PASSWORD) return interaction.reply({ content:"❌ Mot de passe incorrect.", ephemeral:true });
    return interaction.reply({ content:"✅ Accès au panel admin accordé ! (fonctionnalités à implémenter)", ephemeral:true });
  }
});

client.login(TOKEN);
