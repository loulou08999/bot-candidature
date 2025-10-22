// commands/caresser.js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('caresser')
    .setDescription('Caresser F4X_Cat'),
  async execute(interaction, db) {
    db.get(`SELECT ownerId, bonheur FROM f4xcat`, (err, row) => {
      if (!row || row.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ Vous devez être le maître pour caresser F4X_Cat.', ephemeral: true });
      }
      let newBonheur = Math.min(100, row.bonheur + 20);
      db.run(`UPDATE f4xcat SET bonheur = ?`, [newBonheur]);
      interaction.reply(`🥰 Vous caressez F4X_Cat. Bonheur : ${row.bonheur}% → ${newBonheur}%`);
    });
  },
};
