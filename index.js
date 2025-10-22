// index.js
require('dotenv').config();
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
// (Optionnel) import de la librairie sqlite3 ou Sequelize pour DB
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite'); // crée le fichier DB si inexistant

// Création des tables si nécessaire
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS f4xcat (
    ownerId TEXT, faim INTEGER, bonheur INTEGER, depression INTEGER, morts INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS applications (
    userId TEXT, status TEXT, reponses TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    userId TEXT, isValid INTEGER
  )`);
  // autres tables selon besoin...
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});
client.commands = new Collection();
// Charger chaque commande dans /commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

client.once(Events.ClientReady, () => {
  console.log(`Bot prêt (${client.user.tag})`);
  // (Facultatif) Enregistrer les slash commands sur le serveur
  /*
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commandsArray });
  console.log('Slash commands enregistrées.');
  */
  // Boucle temporelle pour dégrader la faim
  setInterval(() => {
    db.get(`SELECT ownerId, faim, depression FROM f4xcat`, (err, row) => {
      if (!row || !row.ownerId) return;
      let degrade = row.depression ? 10 : 5; // plus rapide si dépression
      let newFaim = Math.max(0, row.faim - degrade);
      db.run(`UPDATE f4xcat SET faim = ?`, [newFaim]);
      // Envoyer alerte si <20%
      if (newFaim < 20) {
        client.users.fetch(row.ownerId).then(user => {
          user.send('🐱 F4X_Cat a très faim ! Nourrissez-le vite.');
        }).catch(console.error);
      }
      // Gestion de la mort
      if (newFaim === 0) {
        // F4X meurt
        client.users.fetch(row.ownerId).then(user => {
          user.send('💀 F4X_Cat est mort... Le chat renaît.');
        }).catch(console.error);
        // Réinitialiser état
        db.run(`UPDATE f4xcat SET ownerId=NULL, faim=100, bonheur=100, depression=0, morts=morts+1`);
        // Retirer rôle Maître F4X
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        const member = guild.members.cache.get(row.ownerId);
        const role = guild.roles.cache.find(r => r.name === 'Maître F4X');
        if (member && role) member.roles.remove(role);
      }
    });
  }, 3600 * 1000); // toutes les heures
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    // Gestion des boutons (admin, candidature, etc.)
    const [type, action] = interaction.customId.split('_');
    if (type === 'admin') {
      // ex: admin_add, admin_reset ...
      if (action === 'add') {
        await interaction.reply({ content: 'Entrez l’ID du nouvel admin :', ephemeral: true });
        // puis attendre réponse / modal...
      }
      // autres actions...
    } else if (type === 'form') {
      // boutons du formulaire (accept/refuse)
      if (action === 'accepter') {
        const userId = interaction.customId.split('_')[2];
        // donner rôle ou confirmer
        await interaction.update({ content: 'Candidature acceptée ! 🎉', components: [] });
        // ajouter rôle via guild.members.cache.get(userId).roles.add(...)
      }
      // ...
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, db);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'Erreur lors de l’exécution de la commande.', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
