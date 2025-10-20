// index.js
import {
  Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, Events, InteractionType, PermissionsBitField
} from 'discord.js';
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const ACCEPT_ROLE_ID = 'ID_DU_ROLE_QUE_LA_PERSONNE_OBTIENT'; 
const PRIVATE_ROLE_ID = '1426254219001987172'; 
const COMMAND_CHANNEL_ID = '1429799246755790848';
const CANDIDATURE_CHANNEL_ID = '1429795283595694130';

// Keep alive express
const app = express();
app.get('/', (req, res) => res.send('Bot en ligne !'));
app.listen(process.env.PORT || 3000, () => console.log('Serveur en ligne !'));

client.once(Events.ClientReady, () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {

  // Slash command formulaire
  if (interaction.isChatInputCommand() && interaction.commandName === 'formulaire') {
    if (interaction.channelId !== COMMAND_CHANNEL_ID)
      return interaction.reply({ content: '❌ Tu ne peux utiliser cette commande ici.', ephemeral: true });

    const modal = new ModalBuilder().setCustomId('candidatureModal').setTitle('Formulaire de candidature');
    const questions = [
      { id: 'pseudo', label: 'Ton pseudo Discord', style: TextInputStyle.Short },
      { id: 'age', label: 'Ton âge', style: TextInputStyle.Short },
      { id: 'experience', label: 'Ton expérience sur le serveur', style: TextInputStyle.Paragraph },
      { id: 'motivation', label: 'Pourquoi veux-tu rejoindre ?', style: TextInputStyle.Paragraph },
      { id: 'dispo', label: 'Tes disponibilités', style: TextInputStyle.Short }
    ];
    modal.addComponents(...questions.map(q => new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId(q.id).setLabel(q.label).setStyle(q.style).setRequired(true)
    )));
    await interaction.showModal(modal);
  }

  // Modal submit
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
      new ButtonBuilder().setCustomId('accept').setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('refuse').setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('discussion').setLabel('💬 Discussion').setStyle(ButtonStyle.Secondary)
    );

    const channel = await client.channels.fetch(CANDIDATURE_CHANNEL_ID);
    await channel.send({ embeds: [embed], components: [rowButtons] });
    await interaction.reply({ content: '✅ Ta candidature a été envoyée aux admins !', ephemeral: true });
  }

  // Boutons
  if (interaction.isButton()) {
    const message = interaction.message;
    const guild = interaction.guild;

    // Accepter
    if (interaction.customId === 'accept') {
      const pseudo = message.embeds[0].fields.find(f => f.name === 'Pseudo')?.value;
      const member = guild.members.cache.find(m => m.user.username === pseudo);
      if (member) await member.roles.add(ACCEPT_ROLE_ID);
      if (member) await member.send('✅ Ta candidature a été acceptée !');
      await interaction.reply({ content: '✅ Candidature acceptée et rôle attribué !', ephemeral: true });
      await message.edit({ components: [] });
    }

    // Refuser
    if (interaction.customId === 'refuse') {
      const pseudo = message.embeds[0].fields.find(f => f.name === 'Pseudo')?.value;
      const member = guild.members.cache.find(m => m.user.username === pseudo);
      if (member) await member.send('❌ Ta candidature a été refusée.');
      await interaction.reply({ content: '❌ Candidature refusée.', ephemeral: true });
      await message.edit({ components: [] });
    }

    // Discussion
    if (interaction.customId === 'discussion') {
      const candidateName = message.embeds[0].fields.find(f => f.name === 'Pseudo')?.value || 'candidat';
      const adminMember = interaction.member;
      const channel = await guild.channels.create({
        name: `discussion-${candidateName}`,
        type: 0, // text
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: adminMember.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });
      await interaction.reply({ content: `💬 Salon privé créé : ${channel}`, ephemeral: true });

      // Supprime le salon après 30 minutes
      setTimeout(() => { channel.delete().catch(() => {}); }, 30 * 60 * 1000);
    }
  }
});

client.login(process.env.TOKEN);
