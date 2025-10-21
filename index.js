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
const ROLE_MAITRE = "1430215534456340592";
const ADMIN_PASSWORD = "FkeeleiosX";
const DATA_FILE = "./data.json";
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TOKEN = process.env.TOKEN;
const PORT = process.env.PORT || 3000;
const FORM_CHANNEL_ID = process.env.CANDIDATURE_CHANNEL_ID;

// --- Keep alive Express ---
const app = express();
app.get("/", (req, res) => res.send("Bot F4X_Cat en ligne ✅"));
app.listen(PORT, () => console.log(`Serveur en ligne sur le port ${PORT}`));

// --- Chargement / Création fichier data.json ---
let data = {
  maitre: null,
  faim: 100,
  bonheur: 100,
  energie: 100,
  humeur: "😺 Heureux",
  anciensMaitres: [],
  etat: "vivant",
  cadeaux: []
};
if(fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE));
else fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2));
function saveData(){ fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2)); }

// --- Client Discord ---
const client = new Client({ intents:[GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// --- Commandes Slash ---
const commands = [
  new SlashCommandBuilder().setName("formulaire").setDescription("Remplis le formulaire de candidature !"),
  new SlashCommandBuilder().setName("adopter").setDescription("Adopte F4X_Cat si disponible !"),
  new SlashCommandBuilder().setName("abandoner").setDescription("Abandonner F4X_Cat si tu es le maître."),
  new SlashCommandBuilder().setName("faim").setDescription("Voir la faim de F4X_Cat."),
  new SlashCommandBuilder().setName("nourrir").setDescription("Nourrir F4X_Cat (+10% faim)."),
  new SlashCommandBuilder().setName("caresser").setDescription("Caresser F4X_Cat (+10% bonheur)."),
  new SlashCommandBuilder().setName("bonheur").setDescription("Voir le bonheur de F4X_Cat."),
  new SlashCommandBuilder().setName("jouer").setDescription("Jouer avec F4X_Cat (+énergie & bonheur)."),
  new SlashCommandBuilder().setName("cadeau").setDescription("Donne un cadeau aléatoire à F4X_Cat."),
  new SlashCommandBuilder().setName("admin").setDescription("Accéder au panel admin."),
  new SlashCommandBuilder().setName("regardez").setDescription("Voir toutes les infos F4X_Cat (admin).")
].map(c=>c.toJSON());

// --- Enregistrement des commandes globales ---
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async()=>{
  try{
    console.log("📦 Mise à jour des commandes globales...");
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body:commands });
    console.log("✅ Commandes enregistrées !");
  }catch(e){ console.error("❌ Erreur :", e); }
})();

// --- Fonctions utilitaires ---
function barreProgression(val,type){
  const total=10;
  const rempli = Math.round((val/100)*total);
  const vide = total - rempli;
  let emoji = type==="faim" ? (val>70?"🍗":val>40?"🥩":"🍖") :
              type==="bonheur" ? (val>70?"💖":val>40?"💛":"💔") :
              type==="energie" ? (val>70?"⚡":val>40?"🔋":"💤") : "⬛";
  return `${emoji.repeat(rempli)}${"⬛".repeat(vide)} ${val}%`;
}

function saveMaitreGentillesse(id,score){
  const idx = data.anciensMaitres.findIndex(m=>m.id===id);
  if(idx>=0) data.anciensMaitres[idx].gentillesse+=score;
  else data.anciensMaitres.push({id,gentillesse:score});
}

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
    const guild = interaction.guild;
    const member = interaction.member;
    switch(interaction.commandName){
      // --- Formulaire candidature ---
      case "formulaire":
        const modal = new ModalBuilder().setCustomId("candidatureModal").setTitle("Formulaire de candidature");
        const questions = [
          { id:"pseudo", label:"Ton pseudo Discord", style:TextInputStyle.Short },
          { id:"age", label:"Ton âge", style:TextInputStyle.Short },
          { id:"experience", label:"Ton expérience sur le serveur", style:TextInputStyle.Paragraph },
          { id:"motivation", label:"Pourquoi veux-tu rejoindre ?", style:TextInputStyle.Paragraph },
          { id:"dispo", label:"Tes disponibilités", style:TextInputStyle.Short }
        ];
        const rows = questions.map(q=>new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId(q.id).setLabel(q.label).setStyle(q.style).setRequired(true)
        ));
        modal.addComponents(...rows);
        await interaction.showModal(modal);
      break;

      // --- Adoption / Abandon ---
      case "adopter":
        if(data.maitre) return interaction.reply({ content:`😿 F4X_Cat est déjà adopté par <@${data.maitre}> !`, ephemeral:false });
        data.maitre=interaction.user.id; saveMaitreGentillesse(interaction.user.id,0); saveData();
        const roleA = guild.roles.cache.get(ROLE_MAITRE); if(roleA) await member.roles.add(roleA);
        return interaction.reply({ content:`🎉 <@${interaction.user.id}> a adopté **F4X_Cat** 🐱`, ephemeral:false });
      
      case "abandoner":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut abandonner F4X_Cat.", ephemeral:false });
        const roleB = guild.roles.cache.get(ROLE_MAITRE); if(roleB) await member.roles.remove(roleB);
        data.maitre=null; saveData();
        return interaction.reply({ content:"😿 F4X_Cat est abandonné et disponible pour adoption !", ephemeral:false });

      // --- Faim / Bonheur / Nourrir / Caresser / Jouer / Cadeau ---
      case "faim": return interaction.reply({ content:`🍗 Faim : **${data.faim}%** ${barreProgression(data.faim,"faim")}`, ephemeral:false });
      case "bonheur": return interaction.reply({ content:`💖 Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur,"bonheur")}`, ephemeral:false });
      case "nourrir":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut nourrir.", ephemeral:false });
        data.faim=Math.min(100,data.faim+10); if(data.etat==="depression") data.faim=Math.min(100,data.faim+5);
        saveMaitreGentillesse(interaction.user.id,2); checkEtat(); saveData();
        return interaction.reply({ content:`🍖 Nourri ! Faim : **${data.faim}%** ${barreProgression(data.faim,"faim")}`, ephemeral:false });
      case "caresser":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut caresser.", ephemeral:false });
        data.bonheur=Math.min(100,data.bonheur+10); saveMaitreGentillesse(interaction.user.id,2);
        checkEtat(); saveData();
        return interaction.reply({ content:`😺 F4X_Cat est heureux ! Bonheur : **${data.bonheur}%** ${barreProgression(data.bonheur,"bonheur")}`, ephemeral:false });
      case "jouer":
        if(interaction.user.id!==data.maitre) return interaction.reply({ content:"❌ Seul le maître peut jouer.", ephemeral:false });
        data.bonheur=Math.min(100,data.bonheur+15); data.energie=Math.max(0,data.energie-10);
        saveMaitreGentillesse(interaction.user.id,3); checkEtat(); saveData();
        return interaction.reply({ content:`🎾 Vous jouez avec F4X_Cat ! Bonheur : ${barreProgression(data.bonheur,"bonheur")}, Energie : ${barreProgression(data.energie,"energie")}`, ephemeral:false });
      case "cadeau":
        const cadeaux=["🎁 Jouet","🍗 Biscuit","💎 Gemme magique"];
        const cadeau = cadeaux[Math.floor(Math.random()*cadeaux.length)];
        data.cadeaux.push(cadeau); saveData();
        return interaction.reply({ content:`🎉 F4X_Cat reçoit un cadeau : **${cadeau}** !`, ephemeral:false });

      // --- Panel admin (mot de passe) ---
      case "admin":
        await interaction.reply({ content:"🛠️ Entrez le mot de passe pour accéder au panel admin.", ephemeral:true });
      break;

      case "regardez":
        return interaction.reply({ content:JSON.stringify(data,null,2), ephemeral:true });
    }
  }

  // --- Modal Submit pour formulaire ---
  if(interaction.type===InteractionType.ModalSubmit && interaction.customId==="candidatureModal"){
    const pseudo = interaction.fields.getTextInputValue("pseudo");
    const age = interaction.fields.getTextInputValue("age");
    const experience = interaction.fields.getTextInputValue("experience");
    const motivation = interaction.fields.getTextInputValue("motivation");
    const dispo = interaction.fields.getTextInputValue("dispo");

    const embed = new EmbedBuilder()
      .setTitle("📄 Nouvelle candidature")
      .addFields(
        { name:"Pseudo", value:pseudo },
        { name:"Âge", value:age },
        { name:"Expérience", value:experience },
        { name:"Motivation", value:motivation },
        { name:"Disponibilités", value:dispo }
      ).setColor("Blue").setTimestamp();

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept").setLabel("✅ Accepter").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("refuse").setLabel("❌ Refuser").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("discussion").setLabel("💬 Discussion").setStyle(ButtonStyle.Secondary)
    );

    const channel = await client.channels.fetch(FORM_CHANNEL_ID);
    await channel.send({ embeds:[embed], components:[rowButtons] });
    await interaction.reply({ content:"✅ Ta candidature a été envoyée aux admins !", ephemeral:true });
  }
});

client.login(TOKEN);
