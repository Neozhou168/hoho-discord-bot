// import createClient from '@base44/sdk';

import { Client, GatewayIntentBits, ActivityType } from 'discord.js';
import 'dotenv/config';

// 初始化 base44 SDK
// const base44 = createClient({
//  appId: process.env.BASE44_APP_ID,
//  apiKey: process.env.BASE44_API_KEY, // 可选，根据是否需要权限
;

// 初始化 Discord Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  presence: {
    status: 'online',
    activities: [{ name: 'for group-up activities', type: ActivityType.Watching }],
  },
});

client.once('ready', () => {
  console.log(`✅ Discord bot "${client.user.tag}" is online.`);
});

// 按钮响应处理
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() || !interaction.customId.startsWith('join_')) return;
  await interaction.deferReply({ ephemeral: true });

  const groupUpId = interaction.customId.replace('join_', '');
  const discordUserId = interaction.user.id;

  try {
    const groupUp = await base44.entities.GroupUp.get(groupUpId);
    if (!groupUp) {
      await interaction.editReply({ content: '❌ This group-up no longer exists.' });
      return;
    }

    const current = groupUp.joined_user_ids || [];
    if (current.includes(discordUserId)) {
      await interaction.editReply({ content: '✅ You are already in this group-up!' });
      return;
    }

    await base44.entities.GroupUp.update(groupUpId, {
      joined_user_ids: [...current, discordUserId]
    });

    const original = await interaction.channel.messages.fetch(interaction.message.id);
    if (original?.embeds?.length > 0) {
      const embed = original.embeds[0];
      const updated = {
        ...embed.toJSON(),
        fields: embed.fields.map(field =>
          field.name === '👥 Participants'
            ? { ...field, value: `${current.length + 1} joined` }
            : field
        ),
      };
      await original.edit({ embeds: [updated], components: original.components });
    }

    await interaction.editReply({ content: '🎉 Success! You have joined the group-up.' });

  } catch (e) {
    console.error(e);
    await interaction.editReply({ content: '❌ Error joining. Try again later.' });
  }
});

// 测试指令
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || msg.content !== '!ping') return;
  await msg.reply('🔔 Pong! The bot is alive.');
});

// 登录
client.login(process.env.DISCORD_BOT_TOKEN);
