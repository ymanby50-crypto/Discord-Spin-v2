const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers
    ]
});

let inviteCounts = new Map(); 
let invitedUsers = new Map(); 
const logChannelId = "1434646141932277841"; // حط ايدي روم اللوق

client.once('ready', () => {
    console.log('Developer By : 3nB.');
});

async function fetchAndStoreUserInvites(guild) {
    const invites = await guild.invites.fetch();
    invites.forEach(invite => {
        const inviterId = invite.inviter.id;
        const uses = invite.uses;
        if (inviteCounts.has(inviterId)) {
            inviteCounts.set(inviterId, inviteCounts.get(inviterId) + uses);
        } else {
            inviteCounts.set(inviterId, uses);
        }
    });
}

function getUserInvites(userId) {
    return inviteCounts.get(userId) || 0;
}

function updateUserInvites(userId, newCount) {
    inviteCounts.set(userId, newCount);
}

function resetUserInvites(userId) {
    inviteCounts.set(userId, 0);
}

function resetAllUserInvites() {
    inviteCounts.clear();
}

client.on('guildMemberAdd', async member => {
    const guild = member.guild;
    const invitesBeforeJoin = await guild.invites.fetch();

    invitesBeforeJoin.forEach(invite => {
        if (invite.inviter && !invitedUsers.has(member.id)) {
            const inviterId = invite.inviter.id;
            if (invite.uses > 0 && inviterId !== member.id) {
                invitedUsers.set(member.id, inviterId);
                
                const currentInvites = getUserInvites(inviterId);
                updateUserInvites(inviterId, currentInvites + 1);

                console.log(`Added 1 Point To User : ${inviterId}`);
            }
        }
    });
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const userInvites = getUserInvites(interaction.user.id);
    let reward;
    let spinType;

    if (interaction.customId === 'normal_spin') {
        spinType = 'العجلة العادية';
        if (userInvites >= 1) {
            const spinNormal = ["20k", "40k", "60k", "50k", "65k", "10k", "30k", "حظ اوفر"]; // المكافات
            reward = spinNormal[Math.floor(Math.random() * spinNormal.length)];
            updateUserInvites(interaction.user.id, userInvites - 1);
            await interaction.reply({ content: `فزت معنا : ${reward}`, ephemeral: true });
        } else {
            return interaction.reply({ content: "لا تملك نقاط كافية لاستخدام العجلة العادية.", ephemeral: true });
        }
    } else if (interaction.customId === 'special_spin') {
        spinType = 'العجلة الخاصة';
        if (userInvites >= 2) {
            const spinSpecial = ["", "", "", "", "", "", "", ""]; // حقت البريم
            reward = spinSpecial[Math.floor(Math.random() * spinSpecial.length)];
            updateUserInvites(interaction.user.id, userInvites - 2);
            await interaction.reply({ content: `فزت معنا : ${reward}`, ephemeral: true });
        } else {
            return interaction.reply({ content: "لا تملك نقاط كافية لاستخدام العجلة الخاصة.", ephemeral: true });
        }
    }

    const logChannel = client.channels.cache.get(logChannelId);
    if (logChannel) {
        const embed = new EmbedBuilder()
            .setTitle("تفاصيل الجائزة")
            .addFields(
                { name: "العضو", value: interaction.user.tag, inline: true },
                { name: "الجائزة", value: reward, inline: true },
                { name: "نوع العجلة", value: spinType, inline: true },
                { name: "الوقت", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setColor("996214");

        logChannel.send({ embeds: [embed] });
    }
});

client.on("messageCreate", async (message) => {
    if (message.content.startsWith("$reset")) {
        const args = message.content.split(" ");
        if (args[1] === "all") {
            resetAllUserInvites();
            return message.reply("**تم تصفير جميع النقاط**");
        } else {
            const user = message.mentions.users.first();
            if (user) {
                resetUserInvites(user.id);
                return message.reply(`**تم تصفير نقاط ${user.tag}**`);
            }
        }
    }

    if (message.content.startsWith("$spin")) {
        await fetchAndStoreUserInvites(message.guild);

        const userInvites = getUserInvites(message.author.id);

        if (userInvites === 0) {
            return message.reply("**ليس لديك نقاط كافية لاستخدام العجلة.**");
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('normal_spin')
                    .setLabel('Normal Spin')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(userInvites < 1), 
                new ButtonBuilder()
                    .setCustomId('special_spin')
                    .setLabel('Special Spin')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(userInvites < 2) 
            );

        await message.reply({ components: [row] });
    }
});

client.login(""); // token your bot
