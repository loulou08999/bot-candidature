// commands/nourrir.js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('nourrir')
    .setDescription('Nourrir F4X_Cat'),
  async execute(interaction, db) {
    db.get(`SELECT ownerId, faim, bonheur FROM f4xcat`, async (err, row) => {
      if (!row || row.ownerId !== interaction.user.id) {
        return interaction.reply({ content: '❌ Vous devez être le maître pour nourrir F4X_Cat.', ephemeral: true });
      }
      let newFaim = Math.min(100, row.faim + 20);
      let newBonheur = Math.min(100, row.bonheur + 5);
      db.run(`UPDATE f4xcat SET faim = ?, bonheur = ?`, [newFaim, newBonheur]);
      interaction.reply(`🍖 Vous nourrissez F4X_Cat. Faim : ${row.faim}% → ${newFaim}%. Bonheur : ${row.bonheur}% → ${newBonheur}% 😺`);
    });
  },
};
