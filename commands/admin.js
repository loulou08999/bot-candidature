// commands/admin.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Panel d’administration (mot de passe requis)')
    .addStringOption(opt => opt.setName('motdepasse').setDescription('Mot de passe admin').setRequired(true)),
  async execute(interaction, db) {
    const passwd = interaction.options.getString('motdepasse');
    if (passwd !== process.env.ADMIN_PASSWORD) {
      return interaction.reply({ content: '🔒 Mot de passe incorrect.', ephemeral: true });
    }
    // Créer un embed avec un menu
    const embed = new EmbedBuilder()
      .setTitle('🔧 Panneau Admin F4X_Cat')
      .setDescription('Sélectionnez une action ci-dessous :')
      .setColor(0x00FF00);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin_add').setLabel('➕ Ajouter Admin').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('admin_remove').setLabel('❌ Retirer Admin').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('admin_reset').setLabel('🔄 Reset Chat').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('admin_logs').setLabel('📜 Voir Logs').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('admin_params').setLabel('⚙️ Paramètres Chat').setStyle(ButtonStyle.Secondary)
      // Ajouter d'autres boutons pour chaque commande (comme décrit plus haut)
    );
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
