// commands/bonheur.js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('bonheur')
    .setDescription('Voir le niveau de bonheur de F4X_Cat'),
  async execute(interaction, db) {
    db.get(`SELECT bonheur FROM f4xcat`, (err, row) => {
      const bonheur = row ? row.bonheur : 0;
      interaction.reply(`😸 Le bonheur de F4X_Cat est actuellement à ${bonheur}%.`);
    });
  },
};
