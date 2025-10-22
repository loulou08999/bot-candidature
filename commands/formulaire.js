// commands/formulaire.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('formulaire')
    .setDescription('Remplir une candidature'),
  async execute(interaction, db) {
    const user = interaction.user;
    // Enregistrement dans DB (status "en attente")
    db.run(`INSERT INTO applications (userId, status) VALUES (?, ?)`, [user.id, 'pending']);
    // Créer salon privé pour discussion
    const guild = interaction.guild;
    const channel = await guild.channels.create({
      name: `candidature-${user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        // id des rôles modérateurs/admin (à remplir)
      ],
    });
    // Envoyer message avec boutons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`form_accepter_${user.id}`).setLabel('✅ Accepter').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`form_refuser_${user.id}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`form_discussion_${user.id}`).setLabel('💬 Discussion').setStyle(ButtonStyle.Primary)
    );
    channel.send({
      content: `📄 **Candidature de <@${user.id}>**`,
      components: [row]
    });
    interaction.reply({ content: 'Votre candidature a été envoyée au staff !', ephemeral: true });
  },
};
