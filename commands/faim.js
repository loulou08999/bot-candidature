// commands/faim.js
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('faim')
    .setDescription('Voir le niveau de faim de F4X_Cat'),
  async execute(interaction, db) {
    db.get(`SELECT faim FROM f4xcat`, (err, row) => {
      const faim = row ? row.faim : 0;
      interaction.reply(`🐱 F4X_Cat a actuellement ${faim}% de faim.`);
    });
  },
};
