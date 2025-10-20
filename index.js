// index.js
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  ModalBuilder
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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);

  // Test canal candidature
  try {
    const testChannel = await client.channels.fetch(CANDIDATURE_CHANNEL_ID);
    await testChannel.send('Bot prêt et test OK ✅');
  } catch (err) {
    console.error('❌ Erreur test canal candidature :', err);
  }
});

// --- canal commande et canal candidature ---
const COMMAND_CHANNEL_ID = '1429799246755790848'; // salon où les utilisateurs tapent /formulaire
const CANDIDATURE_CHANNEL_ID = '1429795283595694130'; // salon où les admins reçoivent les candidatures

// --- slash command /formulaire ---
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
  // Commande slash
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

  // Modal submit
  if (interaction.isModalSubmit() && interaction.customId === 'candidatureModal') {
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

    try {
      const channel = await client.channels.fetch(CANDIDATURE_CHANNEL_ID);
      if (!channel) throw new Error('Canal candidature introuvable !');
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Ta candidature a été envoyée aux admins !', ephemeral: true });
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'embed :', error);
      await interaction.reply({ content: '❌ Une erreur est survenue, contacte un admin.', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
