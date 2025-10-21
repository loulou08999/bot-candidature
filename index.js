// index.js
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
  InteractionType,
  PermissionsBitField
} from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// --- Keep alive Express ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot en ligne !'));
app.listen(port, () => console.log(`Serveur en ligne sur le port ${port}`));

// --- Bot setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// --- Variables principales ---
const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID;
const CANDIDATURE_CHANNEL_ID = process.env.CANDIDATURE_CHANNEL_ID;
const MASTER_ROLE_ID_CAT = '1430215534456340592';
const ADMIN_PASSWORD = "FkeeleiosX";

let catData = {
  ownerId: null,
  faim: 100,
  bonheur: 100,
  anciens: {}, // stock les anciens maîtres {id: {faimNeglige, gentillesse}}
  quetes: [],
  cadeaux: []
};

// --- Gestion Ready ---
client.once(Events.ClientReady, () => {
  console.log(`🤖 Connecté en tant ${client.user.tag}`);
});

// --- Commandes ---
const commands = [
  new SlashCommandBuilder().setName('formulaire').setDescription('Remplis le formulaire de candidature !'),
  new SlashCommandBuilder().setName('adopter').setDescription('Adopte F4X_Cat !'),
  new SlashCommandBuilder().setName('faim').setDescription('Vérifie la barre de faim de F4X_Cat !'),
  new SlashCommandBuilder().setName('nourrir').setDescription('Nourris F4X_Cat (+10% faim)'),
  new SlashCommandBuilder().setName('caresser').setDescription('Caresse F4X_Cat (+10% bonheur)'),
  new SlashCommandBuilder().setName('bonheur').setDescription('Vérifie le bonheur de F4X_Cat'),
  new SlashCommandBuilder().setName('abandonner').setDescription('Abandonne F4X_Cat !'),
  new SlashCommandBuilder().setName('admin').setDescription('Ouvre le panel admin (mot de passe requis)'),
  new SlashCommandBuilder().setName('quete').setDescription('Voir tes quêtes quotidiennes'),
  new SlashCommandBuilder().setName('cadeau').setDescription('Recevoir un cadeau spécial aléatoire'),
  new SlashCommandBuilder().setName('stats').setDescription('Voir toutes les stats de F4X_Cat')
].map(cmd => cmd.toJSON());

// --- Enregistrement des commandes ---
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('📦 Mise à jour des commandes globales...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Commandes enregistrées !');
  } catch (error) {
    console.error('❌ Erreur enregistrement slash commands :', error);
  }
})();

// --- Fonctions utils ---
function checkFaimBonheur() {
  if (catData.faim <= 0) {
    // Mort → réinitialisation
    catData.ownerId = null;
    catData.faim = 100;
    catData.bonheur = 100;
    return '💀 F4X_Cat est mort de faim et doit être réadopté !';
  }
  if (catData.bonheur <= 0) {
    catData.faim = Math.max(catData.faim - 20, 0);
    return '😢 F4X_Cat est en dépression et sa faim chute drastiquement !';
  }
  return null;
}

// --- Interactions ---
client.on(Events.InteractionCreate, async interaction => {

  // --- FORMULAIRE ---
  if (interaction.isChatInputCommand() && interaction.commandName === 'formulaire') {
    const modal = new ModalBuilder()
      .setCustomId('candidatureModal')
      .setTitle('Formulaire de candidature');

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
    await interaction.showModal(modal);
  }

  // --- Modal submit candidature ---
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'candidatureModal') {
    const pseudo = interaction.fields.getTextInputValue('pseudo');
    const age = interaction.fields.getTextInputValue('age');
    const experience = interaction.fields.getTextInputValue('experience');
    const motivation = interaction.fields.getTextInputValue('motivation');
    const dispo = interaction.fields.getTextInputValue('dispo');

    const embed = new EmbedBuilder()
      .setTitle('📄 Nouvelle candidature')
      .setColor('Blue')
      .addFields(
        { name: 'Pseudo', value: pseudo },
        { name: 'Âge', value: age },
        { name: 'Expérience', value: experience },
        { name: 'Motivation', value: motivation },
        { name: 'Disponibilités', value: dispo }
      )
      .setTimestamp();

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('accept').setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('refuse').setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('discussion').setLabel('💬 Discussion').setStyle(ButtonStyle.Secondary)
    );

    try {
      const channel = await client.channels.fetch(CANDIDATURE_CHANNEL_ID);
      await channel.send({ embeds: [embed], components: [rowButtons] });
      await interaction.reply({ content: '✅ Ta candidature a été envoyée aux admins !', ephemeral: false });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  }

  // --- COMMANDES F4X_CAT ---
  if (interaction.isChatInputCommand()) {
    const user = interaction.user;
    const member = await interaction.guild.members.fetch(user.id);

    // --- ADOPTER ---
    if (interaction.commandName === 'adopter') {
      if (catData.ownerId) return interaction.reply({ content: `❌ F4X_Cat est déjà adopté par <@${catData.ownerId}> !`, ephemeral: true });
      catData.ownerId = user.id;
      if (!member.roles.cache.has(MASTER_ROLE_ID_CAT)) member.roles.add(MASTER_ROLE_ID_CAT);
      return interaction.reply({ content: `🎉 Bravo <@${user.id}>, tu as adopté F4X_Cat !`, ephemeral: false });
    }

    // --- FAIM ---
    if (interaction.commandName === 'faim') {
      const msg = checkFaimBonheur();
      return interaction.reply({ content: `🍖 F4X_Cat a ${catData.faim}% de faim. ${msg || ''}`, ephemeral: false });
    }

    // --- NOURRIR ---
    if (interaction.commandName === 'nourrir') {
      if (user.id !== catData.ownerId) return interaction.reply({ content: `❌ Tu n'es pas le maître de F4X_Cat !`, ephemeral: true });
      catData.faim = Math.min(catData.faim + 10, 100);
      const msg = checkFaimBonheur();
      return interaction.reply({ content: `🥩 F4X_Cat a été nourri (+10%) ! Faim actuelle : ${catData.faim}%. ${msg || ''}`, ephemeral: false });
    }

    // --- CARESSER ---
    if (interaction.commandName === 'caresser') {
      if (user.id !== catData.ownerId) return interaction.reply({ content: `❌ Tu n'es pas le maître de F4X_Cat !`, ephemeral: true });
      catData.bonheur = Math.min(catData.bonheur + 10, 100);
      const msg = checkFaimBonheur();
      return interaction.reply({ content: `😺 F4X_Cat est heureux (+10%) ! Bonheur actuel : ${catData.bonheur}%. ${msg || ''}`, ephemeral: false });
    }

    // --- BONHEUR ---
    if (interaction.commandName === 'bonheur') {
      const msg = checkFaimBonheur();
      return interaction.reply({ content: `😸 F4X_Cat a ${catData.bonheur}% de bonheur. ${msg || ''}`, ephemeral: false });
    }

    // --- ABANDONNER ---
    if (interaction.commandName === 'abandonner') {
      if (user.id !== catData.ownerId) return interaction.reply({ content: `❌ Tu n'es pas le maître de F4X_Cat !`, ephemeral: true });
      catData.anciens[user.id] = { faimNeglige: 100 - catData.faim, gentillesse: catData.bonheur };
      catData.ownerId = null;
      catData.faim = 100;
      catData.bonheur = 100;
      return interaction.reply({ content: `💔 F4X_Cat a été abandonné et est à nouveau disponible !`, ephemeral: false });
    }

    // --- STATS ---
    if (interaction.commandName === 'stats') {
      const embed = new EmbedBuilder()
        .setTitle('📊 Stats F4X_Cat')
        .setColor('Green')
        .addFields(
          { name: 'Maître actuel', value: catData.ownerId ? `<@${catData.ownerId}>` : 'Aucun' },
          { name: 'Faim', value: `${catData.faim}%` },
          { name: 'Bonheur', value: `${catData.bonheur}%` },
          { name: 'Anciens maîtres', value: Object.keys(catData.anciens).length.toString() }
        );
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }

    // --- ADMIN PANEL ---
    if (interaction.commandName === 'admin') {
      const modal = new ModalBuilder()
        .setCustomId('adminModal')
        .setTitle('Panel Admin - Mot de passe requis')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('password').setLabel('Entrez le mot de passe').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
      await interaction.showModal(modal);
    }

    // --- QUETE ---
    if (interaction.commandName === 'quete') {
      catData.quetes.push(`🌟 Nouvelle quête pour <@${user.id}> !`);
      return interaction.reply({ content: catData.quetes.join('\n'), ephemeral: false });
    }

    // --- CADEAU ---
    if (interaction.commandName === 'cadeau') {
      const gift = `🎁 Cadeau aléatoire pour <@${user.id}> !`;
      catData.cadeaux.push(gift);
      return interaction.reply({ content: gift, ephemeral: false });
    }
  }

  // --- MODAL ADMIN ---
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'adminModal') {
    const password = interaction.fields.getTextInputValue('password');
    if (password !== ADMIN_PASSWORD) return interaction.reply({ content: '❌ Mot de passe incorrect !', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛠 Panel Admin')
      .setColor('Red')
      .setDescription('1️⃣ Voir toutes les candidatures\n2️⃣ Accepter / Refuser candidature\n3️⃣ Créer un rôle spécial\n4️⃣ Supprimer un rôle\n5️⃣ Voir F4X_Cat stats\n6️⃣ Réinitialiser F4X_Cat\n7️⃣ Voir anciens maîtres\n8️⃣ Donner un rôle\n9️⃣ Retirer un rôle\n🔟 Réinitialiser toutes les quêtes\n1️⃣1️⃣ Voir cadeaux');

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// --- Connexion ---
client.login(process.env.TOKEN);
