// commands/adopter.js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('adopter')
    .setDescription('Adopter F4X_Cat comme maître'),
  async execute(interaction, db) {
    // Vérifier si déjà un maître
    db.get(`SELECT ownerId FROM f4xcat`, (err, row) => {
      if (row && row.ownerId) {
        interaction.reply({ content: '😿 F4X_Cat a déjà un maître !', ephemeral: true });
      } else {
        // Assigner nouveau maître
        const userId = interaction.user.id;
        db.run(`UPDATE f4xcat SET ownerId = ?`, [userId]);
        // Donner rôle Maître F4X
        const role = interaction.guild.roles.cache.find(r => r.name === 'Maître F4X');
        await interaction.member.roles.add(role);
        interaction.reply(`🎉 Bravo <@${userId}>, vous êtes maintenant le maître de F4X_Cat !`);
      }
    });
  },
};
