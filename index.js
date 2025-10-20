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
  InteractionType
} from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

// --- keep alive express ---
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot en ligne !'));
app.listen(port, () => console.log(`Serveur en ligne sur le port ${port}`));

// --- bot setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// --- salon commande et candidature ---
const COMMAND_CHANNEL_ID = '1429799246755790848';
const CANDIDATURE_CHANNEL_ID = '1429795283595694130';

// --- slash command ---
const commands = [
  new SlashCommandBuilder()
    .setName('formulaire')
    .setDescription('Remplis le formulaire de candidature !')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Mise à jour des commandes slash...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Commandes slash enregistrées !');
  } catch (error) {
    console.error('❌ Erreur enregistrement slash commands :', error);
  }
})();

// --- interaction ---
client.on(Events.InteractionCreate, async interaction => {

  // --- Slash Command ---
  if (interaction.isChatInputCommand() && interaction.commandName === 'formulaire') {
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

    try {
      const channel = await client.channels.fetch(CANDIDATURE_CHANNEL_ID);
      await channel.send({ embeds: [embed], components: [rowButtons] });
      await interaction.reply({ content: '✅ Ta candidature a été envoyée aux admins !', ephemeral: true });
    } catch (err) {
      console.error('❌ Erreur envoi candidature :', err);
      await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
  }

  // --- Gestion des boutons ---
  if (interaction.isButton()) {
    if (!interaction.guild) return;

    const member = interaction.member;
    const message = interaction.message;

    // Accepter
    if (interaction.customId === 'accept') {
      await interaction.reply({ content: `✅ Candidature acceptée par ${member.user.tag}`, ephemeral: true });
      await message.edit({ components: [] }); // retire les boutons
    }

    // Refuser
    if (interaction.customId === 'refuse') {
      await interaction.reply({ content: `❌ Candidature refusée par ${member.user.tag}`, ephemeral: true });
      await message.edit({ components: [] });
    }

    // Discussion
    if (interaction.customId === 'discussion') {
      // Crée un salon privé temporaire
      const guild = interaction.guild;
      const candidateName = message.embeds[0].fields.find(f => f.name === 'Pseudo')?.value || 'candidat';
      const category = null; // si tu veux mettre dans une catégorie spécifique
      const channel = await guild.channels.create({
        name: `discussion-${candidateName}`,
        type: 0, // text channel
        parent: category,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: ['ViewChannel'] },
          { id: member.id, allow: ['ViewChannel', 'SendMessages'] },
          { id: client.user.id, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });
      await interaction.reply({ content: `💬 Salon privé créé : ${channel}`, ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
