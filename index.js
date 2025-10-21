// index.js (version finale)
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextInputBuilder,
  TextInputStyle,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  ModalBuilder,
  InteractionType
} from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// --- Config depuis .env ---
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_MASTER_ID = process.env.ROLE_ID || '1430215534456340592';
const CANDIDATURE_CHANNEL_ID = process.env.CANDIDATURE_CHANNEL_ID;
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'FkeeleiosX';

// --- Fichier de données ---
const DATA_FILE = './f4x_data.json';

// --- Keep-alive express ---
const app = express();
app.get('/', (req, res) => res.send('Bot F4X_Cat en ligne ✅'));
app.listen(PORT, () => console.log(`Serveur web sur le port ${PORT}`));

// --- Charger / init data ---
let catData = {
  ownerId: null,
  faim: 100,
  bonheur: 100,
  energie: 100,
  etat: 'vivant', // vivant | depression | mort
  anciens: {},    // { userId: { faimNeglige, gentillesse } }
  cadeaux: [],
  quetes: []
};
if (fs.existsSync(DATA_FILE)) {
  try { catData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { console.error('Erreur lecture data:', e); }
}
function saveData() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(catData, null, 2)); } catch (e) { console.error('Erreur save data:', e); }
}

// --- Client Discord ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL'] // pour DM si besoin
});

// --- Helpers ---
function barreProgression(val, type) {
  const total = 10;
  const rempli = Math.round((val / 100) * total);
  const vide = total - rempli;
  const emoji = type === 'faim' ? (val > 70 ? '🍗' : val > 40 ? '🥩' : '🍖')
    : type === 'bonheur' ? (val > 70 ? '💖' : val > 40 ? '💛' : '💔')
    : type === 'energie' ? (val > 70 ? '⚡' : val > 40 ? '🔋' : '💤') : '⬛';
  return `${emoji.repeat(rempli)}${'⬛'.repeat(vide)} ${val}%`;
}

function addAncien(userId) {
  if (!catData.anciens[userId]) catData.anciens[userId] = { faimNeglige: 0, gentillesse: 0 };
}

function saveGentillesse(userId, score) {
  addAncien(userId);
  catData.anciens[userId].gentillesse += score;
  saveData();
}

// DM helper (ignore erreur si bloque)
async function dmUser(userId, text) {
  try {
    const user = await client.users.fetch(userId);
    if (user) await user.send({ content: text });
  } catch (e) {
    // utilisateur a DMs fermés ou erreur — log mais ne crash pas
    console.warn('Impossible DM user', userId, e.message);
  }
}

// check état & alertes — renvoie message système si événement critique
async function checkEtatEtAlerte() {
  // Dépression si bonheur <=0
  if (catData.bonheur <= 0 && catData.etat !== 'depression') {
    catData.etat = 'depression';
    saveData();
    if (catData.ownerId) await dmUser(catData.ownerId, '⚠️ F4X_Cat est en **dépression** ! Sa faim va chuter plus vite. Donne-lui de l\'attention ( /caresser ) et de la nourriture ( /nourrir ).');
  }
  // Mort si faim <=0
  if (catData.faim <= 0 && catData.etat !== 'mort') {
    catData.etat = 'mort';
    // sauvegarder ancien état au propriétaire
    if (catData.ownerId) {
      addAncien(catData.ownerId);
      catData.anciens[catData.ownerId].faimNeglige += (100 - catData.faim);
      await dmUser(catData.ownerId, '💀 Triste nouvelle : F4X_Cat est mort de faim... Il a été réinitialisé et est à nouveau adoptable.');
    }
    // reset pour redevenir adoptable
    catData.ownerId = null;
    catData.faim = 100;
    catData.bonheur = 100;
    catData.energie = 100;
    saveData();
    return 'mort';
  }

  // Alertes seuils (envoi DM unique par seuil — on ne spammera pas)
  // On marque dans catData.alerteSeen pour ne pas spammer (création simple)
  catData._alerteSeen = catData._alerteSeen || {};

  if (catData.faim <= 30 && !catData._alerteSeen.lowFaim && catData.ownerId) {
    catData._alerteSeen.lowFaim = true;
    await dmUser(catData.ownerId, `⚠️ Alerte : la faim de F4X_Cat est à ${catData.faim}%. Pense à le nourrir (/nourrir) !`);
  }
  if (catData.bonheur <= 30 && !catData._alerteSeen.lowBonheur && catData.ownerId) {
    catData._alerteSeen.lowBonheur = true;
    await dmUser(catData.ownerId, `😢 Alerte : le bonheur de F4X_Cat est à ${catData.bonheur}%. Caresse-le (/caresser) pour le remonter !`);
  }
  // reset alertes si valeurs remontent
  if (catData.faim > 40) catData._alerteSeen.lowFaim = false;
  if (catData.bonheur > 40) catData._alerteSeen.lowBonheur = false;

  saveData();
  return null;
}

// périodique : baisse faim / énergie toutes les X secondes (configurable)
const HUNGER_INTERVAL_SEC = Number(process.env.HUNGER_INTERVAL_SEC) || 300; // toutes les 5 minutes par défaut
setInterval(async () => {
  // si vivant -> appliquer la perte
  if (catData.etat !== 'mort') {
    const decay = (catData.etat === 'depression') ? 4 : 1; // dépression => perte x4 par tick
    catData.faim = Math.max(0, catData.faim - 1 * decay);
    catData.energie = Math.max(0, catData.energie - 1);
    // vérifier état et alerter
    await checkEtatEtAlerte();
    saveData();
  }
}, HUNGER_INTERVAL_SEC * 1000);

// --- Commandes slash à enregistrer globalement ---
const commands = [
  new SlashCommandBuilder().setName('formulaire').setDescription('Remplis le formulaire de candidature !'),
  new SlashCommandBuilder().setName('adopter').setDescription('Adopte F4X_Cat si disponible !'),
  new SlashCommandBuilder().setName('abandonner').setDescription('Abandonner F4X_Cat (si tu es le maître).'),
  new SlashCommandBuilder().setName('faim').setDescription('Voir la faim de F4X_Cat.'),
  new SlashCommandBuilder().setName('nourrir').setDescription('Nourrir F4X_Cat (+10% faim).'),
  new SlashCommandBuilder().setName('caresser').setDescription('Caresser F4X_Cat (+10% bonheur).'),
  new SlashCommandBuilder().setName('bonheur').setDescription('Voir le bonheur de F4X_Cat.'),
  new SlashCommandBuilder().setName('jouer').setDescription('Jouer avec F4X_Cat (+énergie & bonheur).'),
  new SlashCommandBuilder().setName('cadeau').setDescription('Donne un cadeau aléatoire à F4X_Cat.'),
  new SlashCommandBuilder().setName('stats').setDescription('Voir toutes les stats de F4X_Cat.'),
  new SlashCommandBuilder().setName('admin').setDescription('Accéder au panel admin (mot de passe requis).')
].map(c => c.toJSON());

// --- Enregistrer commandes globales (application-wide) ---
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('📦 Enregistrement des commandes globales...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commandes enregistrées globalement.');
  } catch (err) {
    console.error('❌ Erreur enregistrement commandes:', err);
  }
})();

// --- Interactions handler ---
client.on(Events.InteractionCreate, async interaction => {
  try {
    // -- Formulaire modal
    if (interaction.isChatInputCommand() && interaction.commandName === 'formulaire') {
      const modal = new ModalBuilder().setCustomId('candidatureModal').setTitle('Formulaire de candidature');
      const questions = [
        { id: 'pseudo', label: 'Ton pseudo Discord', style: TextInputStyle.Short },
        { id: 'age', label: 'Ton âge', style: TextInputStyle.Short },
        { id: 'experience', label: 'Ton expérience sur le serveur', style: TextInputStyle.Paragraph },
        { id: 'motivation', label: 'Pourquoi veux-tu rejoindre ?', style: TextInputStyle.Paragraph },
        { id: 'dispo', label: 'Tes disponibilités', style: TextInputStyle.Short }
      ];
      const rows = questions.map(q => new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId(q.id).setLabel(q.label).setStyle(q.style).setRequired(true)
      ));
      modal.addComponents(...rows);
      return await interaction.showModal(modal);
    }

    // modal submit (candidature)
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'candidatureModal') {
      const pseudo = interaction.fields.getTextInputValue('pseudo');
      const age = interaction.fields.getTextInputValue('age');
      const experience = interaction.fields.getTextInputValue('experience');
      const motivation = interaction.fields.getTextInputValue('motivation');
      const dispo = interaction.fields.getTextInputValue('dispo');

      const embed = new EmbedBuilder()
        .setTitle('📄 Nouvelle candidature')
        .addFields(
          { name: 'Pseudo', value: pseudo },
          { name: 'Âge', value: age },
          { name: 'Expérience', value: experience },
          { name: 'Motivation', value: motivation },
          { name: 'Disponibilités', value: dispo }
        ).setColor('Blue').setTimestamp();

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cand_accept').setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('cand_refuse').setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cand_discuss').setLabel('💬 Discussion').setStyle(ButtonStyle.Secondary)
      );

      // send to candidature channel
      try {
        const ch = await client.channels.fetch(CANDIDATURE_CHANNEL_ID);
        await ch.send({ embeds: [embed], components: [buttons] });
        await interaction.reply({ content: '✅ Candidature envoyée aux admins.', ephemeral: true });
      } catch (e) {
        console.error('Erreur envoi candidature:', e);
        await interaction.reply({ content: '❌ Impossible d\'envoyer la candidature (vérifie CANDIDATURE_CHANNEL_ID).', ephemeral: true });
      }
      return;
    }

    // chat commands
    if (!interaction.isChatInputCommand()) return;

    const cmd = interaction.commandName;
    const userId = interaction.user.id;

    // /adopter
    if (cmd === 'adopter') {
      if (catData.ownerId) return interaction.reply({ content: `❌ F4X_Cat est déjà adopté par <@${catData.ownerId}>.`, ephemeral: false });
      catData.ownerId = userId;
      catData.etat = 'vivant';
      saveData();
      // give role
      try {
        const member = await interaction.guild.members.fetch(userId);
        if (member && !member.roles.cache.has(ROLE_MASTER_ID)) await member.roles.add(ROLE_MASTER_ID);
      } catch (e) { console.warn('role add error', e.message); }
      await interaction.reply({ content: `🎉 <@${userId}> a adopté F4X_Cat ! Tu recevras des alertes en MP si nécessaire.`, ephemeral: false });
      await dmUser(userId, '🎉 Félicitations ! Tu es le nouveau maître de F4X_Cat. Utilise /nourrir, /caresser, /jouer, /faim, /bonheur pour t\'occuper de lui.');
      return;
    }

    // /abandonner
    if (cmd === 'abandonner') {
      if (catData.ownerId !== userId) return interaction.reply({ content: '❌ Tu n\'es pas le maître de F4X_Cat.', ephemeral: true });
      addAncien(userId);
      catData.anciens[userId].faimNeglige += Math.max(0, 100 - catData.faim);
      catData.anciens[userId].gentillesse += catData.bonheur;
      catData.ownerId = null;
      catData.faim = 100;
      catData.bonheur = 100;
      catData.energie = 100;
      saveData();
      // remove role
      try { const member = await interaction.guild.members.fetch(userId); if (member) await member.roles.remove(ROLE_MASTER_ID); } catch (e) {}
      await interaction.reply({ content: '😿 Tu as abandonné F4X_Cat — il est de nouveau disponible.', ephemeral: false });
      return;
    }

    // /faim
    if (cmd === 'faim') {
      await checkEtatEtAlerte();
      return interaction.reply({ content: `🍗 Faim : ${catData.faim}%\n${barreProgression(catData.faim, 'faim')}`, ephemeral: false });
    }

    // /nourrir
    if (cmd === 'nourrir') {
      if (catData.ownerId !== userId) return interaction.reply({ content: '❌ Seul le maître peut nourrir F4X_Cat.', ephemeral: true });
      const add = (catData.etat === 'depression') ? 5 : 10;
      catData.faim = Math.min(100, catData.faim + add);
      saveGentillesse(userId, 2);
      await checkEtatEtAlerte();
      saveData();
      await interaction.reply({ content: `🍖 Tu as nourri F4X_Cat (+${add}%). Faim : ${catData.faim}%`, ephemeral: false });
      return;
    }

    // /caresser
    if (cmd === 'caresser') {
      if (catData.ownerId !== userId) return interaction.reply({ content: '❌ Seul le maître peut caresser F4X_Cat.', ephemeral: true });
      catData.bonheur = Math.min(100, catData.bonheur + 10);
      saveGentillesse(userId, 2);
      await checkEtatEtAlerte();
      saveData();
      await interaction.reply({ content: `😺 Tu as caressé F4X_Cat ! Bonheur : ${catData.bonheur}%`, ephemeral: false });
      return;
    }

    // /jouer
    if (cmd === 'jouer') {
      if (catData.ownerId !== userId) return interaction.reply({ content: '❌ Seul le maître peut jouer avec F4X_Cat.', ephemeral: true });
      catData.bonheur = Math.min(100, catData.bonheur + 15);
      catData.energie = Math.max(0, catData.energie - 10);
      saveGentillesse(userId, 3);
      await checkEtatEtAlerte();
      saveData();
      return interaction.reply({ content: `🎾 Tu as joué ! Bonheur : ${catData.bonheur}%, Énergie : ${catData.energie}%`, ephemeral: false });
    }

    // /cadeau
    if (cmd === 'cadeau') {
      const pool = ['🎁 Jouet', '🍗 Biscuit', '✨ Surprise mystère', '💎 Petite gemme'];
      const gift = pool[Math.floor(Math.random() * pool.length)];
      catData.cadeaux.push({ gift, by: userId, at: Date.now() });
      saveData();
      return interaction.reply({ content: `🎉 Tu as donné un cadeau : **${gift}**`, ephemeral: false });
    }

    // /bonheur
    if (cmd === 'bonheur') {
      await checkEtatEtAlerte();
      return interaction.reply({ content: `💖 Bonheur : ${catData.bonheur}%\n${barreProgression(catData.bonheur, 'bonheur')}`, ephemeral: false });
    }

    // /stats
    if (cmd === 'stats') {
      const embed = new EmbedBuilder()
        .setTitle('📊 Stats F4X_Cat')
        .setColor('Green')
        .addFields(
          { name: 'Maître actuel', value: catData.ownerId ? `<@${catData.ownerId}>` : 'Aucun' },
          { name: 'Faim', value: `${catData.faim}%` },
          { name: 'Bonheur', value: `${catData.bonheur}%` },
          { name: 'Énergie', value: `${catData.energie}%` },
          { name: 'État', value: catData.etat },
          { name: 'Anciens maîtres', value: Object.keys(catData.anciens).length.toString() }
        );
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // /admin (ouvre modal mot de passe)
    if (cmd === 'admin') {
      const modal = new ModalBuilder().setCustomId('adminModal').setTitle('Panel Admin - mot de passe requis');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('adminPwd').setLabel('Mot de passe').setStyle(TextInputStyle.Short).setRequired(true)
      ));
      return await interaction.showModal(modal);
    }
  } catch (err) {
    console.error('Interaction erreur:', err);
    if (interaction && !interaction.replied) {
      try { await interaction.reply({ content: '❌ Erreur interne.', ephemeral: true }); } catch (e) {}
    }
  }
});

// admin modal handling
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'adminModal') {
    const pwd = interaction.fields.getTextInputValue('adminPwd');
    if (pwd !== ADMIN_PASSWORD) return interaction.reply({ content: '❌ Mot de passe incorrect.', ephemeral: true });

    // build admin panel with many actions and multi-level confirmations
    const embed = new EmbedBuilder()
      .setTitle('🛠 Panel Admin - F4X_Cat')
      .setColor('DarkBlue')
      .setDescription('Actions disponibles :\n1) Réinitialiser F4X_Cat (Niv4 confirmation)\n2) Forcer adoption\n3) Forcer abandon\n4) Modifier faim / bonheur\n5) Voir anciens maîtres\n6) Nettoyer cadeaux\n7) Déclencher alerte test\n(Seules les personnes autorisées doivent utiliser ces boutons.)');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_reset_request').setLabel('♻️ Demander reset (Niv4)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin_force_adopt').setLabel('👑 Forcer adoption').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('admin_force_abandon').setLabel('😿 Forcer abandon').setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
});

// admin buttons (multi-level)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  // Only allow the user who opened the admin modal to click (discord provides message.interaction.user)
  const openerId = interaction.message.interaction?.user?.id;
  if (openerId && openerId !== interaction.user.id) {
    return interaction.reply({ content: "❌ Ces boutons sont réservés à l'admin qui a ouvert le panel.", ephemeral: true });
  }

  switch (interaction.customId) {
    case 'admin_force_adopt': {
      // give admin the owner role and set as owner
      catData.ownerId = interaction.user.id;
      catData.etat = 'vivant';
      saveData();
      try { const member = await interaction.guild.members.fetch(interaction.user.id); if (member) await member.roles.add(ROLE_MASTER_ID); } catch {}
      await interaction.update({ content: '👑 Adoption forcée appliquée.', embeds: [], components: [] });
      await dmUser(interaction.user.id, '👑 Vous êtes maintenant maître (forcé) de F4X_Cat via admin.');
      break;
    }

    case 'admin_force_abandon': {
      if (catData.ownerId) {
        const prev = catData.ownerId;
        addAncien(prev);
        catData.anciens[prev].faimNeglige += Math.max(0, 100 - catData.faim);
        catData.anciens[prev].gentillesse += catData.bonheur;
      }
      catData.ownerId = null;
      catData.faim = 100;
      catData.bonheur = 100;
      catData.energie = 100;
      saveData();
      await interaction.update({ content: '😿 Adoption forcée annulée (abandon).', embeds: [], components: [] });
      break;
    }

    case 'admin_reset_request': {
      // start multi-level confirmation: ask user to press confirm (Niv2), then Niv3 final
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_reset_confirm').setLabel('⚠️ Confirmer reset (Niv2)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('admin_reset_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary)
      );
      await interaction.update({ content: '⚠️ CONFIRMATION REQUISE: Ce reset réinitialisera F4X_Cat. Appuyez sur Confirmer pour continuer.', components: [confirmRow], embeds: [] });
      break;
    }

    case 'admin_reset_confirm': {
      // final confirmation (Niv3) - show final confirm
      const finalRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_reset_final').setLabel('✅ Reset final (Niv3)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('admin_reset_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary)
      );
      await interaction.update({ content: 'Dernière étape : êtes-vous sûr ? (Niv3)', components: [finalRow], embeds: [] });
      break;
    }

    case 'admin_reset_final': {
      // perform reset (Niv4)
      catData = { ownerId: null, faim: 100, bonheur: 100, energie: 100, etat: 'vivant', anciens: {}, cadeaux: [], quetes: [] };
      saveData();
      await interaction.update({ content: '♻️ F4X_Cat réinitialisé (Niv4 confirmé).', components: [], embeds: [] });
      break;
    }

    case 'admin_reset_cancel': {
      await interaction.update({ content: '❌ Réinitialisation annulée.', components: [], embeds: [] });
      break;
    }

    default:
      await interaction.reply({ content: '❌ Action inconnue.', ephemeral: true });
  }
});

// --- Ready + connect ---
client.once(Events.ClientReady, () => {
  console.log(`🤖 Connecté en tant ${client.user.tag}`);
});
client.login(TOKEN);
