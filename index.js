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
  SlashCommandBuilder
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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

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
    console.error(error);
  }
})();

// --- interaction avec le formulaire (modal) ---
client.on(Events.InteractionCreate, async interaction => {
  // Commande slash
  if (interaction.isChatInputCommand() && interaction.commandName === 'formulaire') {
    const modal = new ActionRowBuilder()
    const modalBuilder = new TextInputBuilder();
    // Création du modal
    const candidatureModal = new ActionRowBuilder();
    
    const modalForm = new TextInputBuilder()
      .setCustomId('pseudo')
      .setLabel('Ton pseudo Discord')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const ageInput = new TextInputBuilder()
      .setCustomId('age')
      .setLabel('Ton âge')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const experienceInput = new TextInputBuilder()
      .setCustomId('experience')
      .setLabel('Ton expérience sur le serveur')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const row1 = new ActionRowBuilder().addComponents(modalForm);
    const row2 = new ActionRowBuilder().addComponents(ageInput);
    const row3 = new ActionRowBuilder().addComponents(experienceInput);

    const { ModalBuilder } = await import('discord.js');
    const modalFinal = new ModalBuilder()
      .setCustomId('candidatureModal')
      .setTitle('Formulaire de candidature')
      .addComponents(row1, row2, row3);

    await interaction.showModal(modalFinal);
  }

  // Modal submit
  if (interaction.isModalSubmit() && interaction.customId === 'candidatureModal') {
    const pseudo = interaction.fields.getTextInputValue('pseudo');
    const age = interaction.fields.getTextInputValue('age');
    const experience = interaction.fields.getTextInputValue('experience');

    // Embed à envoyer
    const embed = new EmbedBuilder()
      .setTitle('📄 Nouvelle candidature')
      .addFields(
        { name: 'Pseudo', value: pseudo },
        { name: 'Âge', value: age },
        { name: 'Expérience', value: experience }
      )
      .setColor('Blue')
      .setTimestamp();

    // Remplace "CANDIDATURE_CHANNEL_ID" par l'ID de ton canal staff
    const channel = await client.channels.fetch('CANDIDATURE_CHANNEL_ID');
    channel.send({ embeds: [embed] });

    await interaction.reply({ content: '✅ Ta candidature a été envoyée !', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
