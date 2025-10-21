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
  ModalBuilder,
  InteractionType,
  SlashCommandBuilder,
  REST,
  Routes,
  Events
} from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// --- Keep Alive Express ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot en ligne !'));
app.listen(PORT, () => console.log(`Serveur web sur le port ${PORT}`));

// --- Bot Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// --- Constantes ---
const COMMAND_CHANNEL_ID = process.env.STAFF_CHANNEL_ID;
const CANDIDATURE_CHANNEL_ID = process.env.CANDIDATURE_CHANNEL_ID;
const MASTER_ROLE_ID = '1430215534456340592';
const CAT_NAME = 'f4x_cat';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// --- Données persistantes ---
let f4xData = {};
const dataFile = './f4x_data.json';
if (fs.existsSync(dataFile)) {
  f4xData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
} else {
  f4xData = {
    masterId: null,
    hunger: 100,
    happiness: 100,
    history: []
  };
}

// --- Commandes ---
const commands = [
  new SlashCommandBuilder().setName('formulaire').setDescription('Remplis le formulaire de candidature !'),
  new SlashCommandBuilder().setName('adopter').setDescription(`Adopte ${CAT_NAME}`),
  new SlashCommandBuilder().setName('abandonner').setDescription(`Abandonne ${CAT_NAME}`),
  new SlashCommandBuilder().setName('faim').setDescription(`Voir la barre de faim de ${CAT_NAME}`),
  new SlashCommandBuilder().setName('nourrir').setDescription(`Nourrir ${CAT_NAME} (+10% faim)`),
  new SlashCommandBuilder().setName('caresser').setDescription(`Augmenter le bonheur de ${CAT_NAME}`),
  new SlashCommandBuilder().setName('bonheur').setDescription(`Voir le bonheur de ${CAT_NAME}`),
  new SlashCommandBuilder().setName('admin').setDescription('Ouvrir le panel admin')
].map(c => c.toJSON());

// --- Enregistrement commandes sur le serveur ---
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  try {
    console.log('📦 Mise à jour des commandes...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commandes enregistrées sur le serveur.');
  } catch (err) {
    console.error('❌ Erreur enregistrement commandes:', err);
  }
})();

// --- Fonctions utilitaires ---
function saveData() {
  fs.writeFileSync(dataFile, JSON.stringify(f4xData, null, 2));
}

// --- Bot Ready ---
client.once(Events.ClientReady, () => {
  console.log(`🤖 Connecté en tant ${client.user.tag}`);
});

// --- Interaction Create ---
client.on(Events.InteractionCreate, async interaction => {
  // --- Slash Commands ---
  if (interaction.isChatInputCommand()) {
    const userId = interaction.user.id;

    switch (interaction.commandName) {
      case 'formulaire':
        if (interaction.channelId !== COMMAND_CHANNEL_ID) {
          return interaction.reply({ content: '❌ Tu ne peux utiliser cette commande ici.', ephemeral: true });
        }
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
          new TextInputBuilder()
            .setCustomId(q.id)
            .setLabel(q.label)
            .setStyle(q.style)
            .setRequired(true)
        ));
        modal.addComponents(...rows);
        await interaction.showModal(modal);
        break;

      case 'adopter':
        if (f4xData.masterId && f4xData.masterId !== userId) {
          const masterTag = await client.users.fetch(f4xData.masterId).then(u => u.tag);
          return interaction.reply({ content: `❌ ${CAT_NAME} est déjà adopté par ${masterTag}`, ephemeral: true });
        }
        f4xData.masterId = userId;
        const guild = interaction.guild;
        const member = await guild.members.fetch(userId);
        await member.roles.add(MASTER_ROLE_ID);
        saveData();
        await interaction.reply({ content: `✅ Félicitations ! Tu es maintenant le maître de ${CAT_NAME} 🐱💖` });
        break;

      case 'abandonner':
        if (f4xData.masterId !== userId) {
          return interaction.reply({ content: '❌ Tu n’es pas le maître de f4x_cat.', ephemeral: true });
        }
        f4xData.masterId = null;
        const memberAbandon = await interaction.guild.members.fetch(userId);
        await memberAbandon.roles.remove(MASTER_ROLE_ID);
        saveData();
        await interaction.reply({ content: `⚠️ Tu as abandonné ${CAT_NAME}. Il est de nouveau disponible à l’adoption.` });
        break;

      case 'faim':
        await interaction.reply({ content: `🍖 La faim de ${CAT_NAME} est à ${f4xData.hunger}%` });
        break;

      case 'nourrir':
        if (f4xData.masterId !== userId) {
          return interaction.reply({ content: '❌ Seul le maître peut nourrir f4x_cat.', ephemeral: true });
        }
        f4xData.hunger = Math.min(100, f4xData.hunger + 10);
        saveData();
        await interaction.reply({ content: `🍽️ Tu as nourri ${CAT_NAME}. Faim: ${f4xData.hunger}%` });
        break;

      case 'caresser':
        if (f4xData.masterId !== userId) {
          return interaction.reply({ content: '❌ Seul le maître peut caresser f4x_cat.', ephemeral: true });
        }
        f4xData.happiness = Math.min(100, f4xData.happiness + 10);
        saveData();
        await interaction.reply({ content: `💖 Tu as caressé ${CAT_NAME}. Bonheur: ${f4xData.happiness}%` });
        break;

      case 'bonheur':
        await interaction.reply({ content: `😊 Le bonheur de ${CAT_NAME} est à ${f4xData.happiness}%` });
        break;

      case 'admin':
        await interaction.reply({
          content: '🔒 Entrez le mot de passe pour accéder au panel admin :',
          ephemeral: true
        });
        break;

      default:
        break;
    }
  }

  // --- Modal Submit ---
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
      )
      .setColor('Blue')
      .setTimestamp();

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept')
        .setLabel('✅ Accepter')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('refuse')
        .setLabel('❌ Refuser')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('discussion')
        .setLabel('💬 Discussion')
        .setStyle(ButtonStyle.Secondary)
    );

    const channel = await client.channels.fetch(CANDIDATURE_CHANNEL_ID);
    await channel.send({ embeds: [embed], components: [rowButtons] });
    await interaction.reply({ content: '✅ Ta candidature a été envoyée aux admins !', ephemeral: true });
  }

  // --- Button interactions ---
  if (interaction.isButton()) {
    const userId = interaction.user.id;
    const message = interaction.message;

    if (interaction.customId === 'accept') {
      await interaction.reply({ content: `✅ Candidature acceptée par ${interaction.user.tag}` });
      await message.edit({ components: [] });
    }

    if (interaction.customId === 'refuse') {
      await interaction.reply({ content: `❌ Candidature refusée par ${interaction.user.tag}` });
      await message.edit({ components: [] });
    }

    if (interaction.customId === 'discussion') {
      const guild = interaction.guild;
      const candidateName = message.embeds[0].fields.find(f => f.name === 'Pseudo')?.value || 'candidat';
      const channel = await guild.channels.create({
        name: `discussion-${candidateName}`,
        type: 0,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
          { id: userId, allow: ['ViewChannel', 'SendMessages'] },
          { id: client.user.id, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });
      await interaction.reply({ content: `💬 Salon privé créé : ${channel}`, ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
