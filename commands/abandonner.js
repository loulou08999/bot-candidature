// commands/abandonner.js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('abandonner')
    .setDescription('Abandonner F4X_Cat'),
  async execute(interaction, db) {
    db.get(`SELECT ownerId, bonheur, faim FROM f4xcat`, async (err, row) => {
      if (!row || row.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ Vous n’êtes pas le maître de F4X_Cat.', ephemeral: true });
      }
      // Retirer rôle
      const role = interaction.guild.roles.cache.find(r => r.name === 'Maître F4X');
      await interaction.member.roles.remove(role);
      // Historique : noter si maître gentil (ex. bonheur>50) ou cruel
      const gentil = (row.bonheur > 50 && row.faim > 50);
      const ancienRole = gentil ? 'Ancien maître gentil' : 'Ancien maître cruel';
      const guildMember = interaction.member;
      const roleAncien = interaction.guild.roles.cache.find(r => r.name === ancienRole);
      if (roleAncien) guildMember.roles.add(roleAncien);
      // Réinitialiser le chat
      db.run(`UPDATE f4xcat SET ownerId = NULL, bonheur = 50, faim = 50, depression=0`);
      interaction.reply(`😿 Vous avez abandonné F4X_Cat. Elle sera réinitialisée. Bon sang que c'est triste...`);
    });
  },
};
