import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

const STAFF_CHANNEL_ID = "1429795283595694130";
const ROLE_ID = "1425911899987509309";
const FORM_CHANNEL_ID = "1429799246755790848";

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'formulaire') {
    if (interaction.channel.id !== FORM_CHANNEL_ID) {
      return interaction.reply({ content: "❌ Tu ne peux utiliser cette commande que dans le salon de candidature.", ephemeral: true });
    }

    // Crée le modal avec 10 questions
    const modal = new ModalBuilder()
      .setCustomId('formulaire_modo')
      .setTitle('Candidature Modérateur');

    const questions = [
      "Pourquoi veux-tu devenir modérateur ?",
      "As-tu déjà été modérateur auparavant ?",
      "Depuis combien de temps es-tu sur le serveur ?",
      "À quelle fréquence es-tu actif ?",
      "As-tu déjà eu des problèmes avec d'autres membres ?",
      "Que ferais-tu face à un membre toxique ?",
      "Que ferais-tu si deux membres se disputent ?",
      "Que penses-tu pouvoir apporter à l’équipe ?",
      "As-tu un micro et Discord vocal ?",
      "As-tu autre chose à ajouter ?"
    ];

    const components = questions.map((q, i) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`q${i}`)
          .setLabel(q)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );

    modal.addComponents(components);

    await interaction.showModal(modal);
  }

  // Quand le formulaire est soumis
  if (interaction.isModalSubmit() && interaction.customId === 'formulaire_modo') {
    const answers = [];
    for (let i = 0; i < 10; i++) {
      answers.push(interaction.fields.getTextInputValue(`q${i}`));
    }

    const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setTitle('📝 Nouvelle Candidature Modérateur')
      .setDescription(`Candidature de <@${interaction.user.id}>`)
      .addFields(
        answers.map((a, i) => ({
          name: `Question ${i + 1}`,
          value: a.length > 1024 ? a.slice(0, 1020) + "..." : a,
        }))
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accepter_${interaction.user.id}`)
        .setLabel('✅ Accepter')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`refuser_${interaction.user.id}`)
        .setLabel('❌ Refuser')
        .setStyle(ButtonStyle.Danger)
    );

    await staffChannel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "✅ Ta candidature a été envoyée au staff !", ephemeral: true });
  }

  // Boutons d’acceptation ou de refus
  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split('_');

    const member = await interaction.guild.members.fetch(userId);

    if (action === 'accepter') {
      await member.roles.add(ROLE_ID);
      await member.send("🎉 Félicitations ! Ta candidature a été acceptée, tu es maintenant modérateur !");
      await interaction.update({ content: `✅ ${member.user.tag} a été accepté.`, components: [], embeds: [] });
    } else if (action === 'refuser') {
      await member.send("❌ Ta candidature a été refusée. Merci d’avoir tenté ta chance !");
      await interaction.update({ content: `❌ ${member.user.tag} a été refusé.`, components: [], embeds: [] });
    }
  }
});

client.login(process.env.TOKEN);
