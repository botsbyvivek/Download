const { Telegraf } = require('telegraf');
require('dotenv').config();
const cron = require('node-cron');
const PORT = process.env.PORT || 5001;
const express = require('express');
const app = express();

let bot;
if (process.env.LOCAL_SERVER) {
    bot = new Telegraf(process.env.BOT_TOKEN, { telegram: { apiRoot: process.env.LOCAL_SERVER } });
} else {
    bot = new Telegraf(process.env.BOT_TOKEN);
}

app.listen(PORT, () => {
    console.log('Our app is running on port ${PORT}');
});

// Add this block to catch and log errors
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

const downloadYoutubeVideo = require('./downloaders/youtube_dl');
const downloadTikTokVideo = require('./downloaders/tiktok_dl')(bot);
const downloadInstagram = require('./downloaders/instagram_dl');
const downloadTwitterVideo = require('./downloaders/twitter_dl');
const helpMessage = require('./helpMessage.json');

let isBotRunning = false;
const userLastLinkTime = {};

bot.start(async (ctx) => {
    isBotRunning = true;
    await ctx.reply(`🤖 Hi ${ctx.from.first_name ? ctx.from.first_name : 'user'}! I'm a downloader bot\n\nBot is a Telegram bot designed to help users easily download media from various social media platforms such as <b>YouTube, TikTok, Instagram, and Twitter</b>. Just send me a link to post with media.\n\nif any questions ask at @BotsXChat`,{parse_mode: "HTML" });
});

bot.help(async (ctx) => {
    try {
        const formattedHelpMessage = helpMessage.helpMessage.join('\n');
        await ctx.reply(formattedHelpMessage, { disable_web_page_preview: true });
    } catch (e) {
        console.error(e);
    }
});

bot.on('text', async (ctx) => {
    const { id: userId } = ctx.from;
    const { text, date: messageTime } = ctx.message;

    if (userLastLinkTime[userId] && Date.now() - userLastLinkTime[userId] < 5000) {
        await ctx.reply('You can send a link once in 5 seconds');
        return;
    }

    const youtubeUrlRegex = /(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=|https?:\/\/youtu\.be\/|https?:\/\/(?:www\.)?youtube\.com\/shorts\/)([\w-]{11})/gi;
    const tiktokUrlRegex = /(https?:\/\/(?:www\.)?tiktok\.com\/(?:@[\w.-]+\/video\/[\w-]+|@[\w.-]+)|vm\.tiktok\.com\/[\w.-]+|vt\.tiktok\.com\/[\w.-]+)/gi;
    const instagramUrlRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(p|tv|reels|stories)\/[\w.-]+)/gi;
    const twitterUrlRegex = /(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?:[\w.-]+)\/status\/[\d]+|https?:\/\/t\.co\/[\w.-]+)/gi;

    const youtubeUrls = text.match(youtubeUrlRegex);
    const tiktokUrls = text.match(tiktokUrlRegex);
    const instagramUrls = text.match(instagramUrlRegex);

    const twitterUrls = [];
    let match;
    while ((match = twitterUrlRegex.exec(text)) !== null) {
        twitterUrls.push(match[0]);
    }

    if (youtubeUrls && youtubeUrls.length > 0) {
        await handleVideoDownload(ctx, youtubeUrls, downloadYoutubeVideo);
    } else if (tiktokUrls && tiktokUrls.length > 0) {
        await handleVideoDownload(ctx, tiktokUrls, downloadTikTokVideo);
    } else if (instagramUrls && instagramUrls.length > 0) {
        await handleVideoDownload(ctx, instagramUrls, downloadInstagram);
    } else if (twitterUrls.length > 0) {
        await handleVideoDownload(ctx, twitterUrls, downloadTwitterVideo);
    } else {
        await ctx.reply('Unknown command');
    }
});

async function handleVideoDownload(ctx, urls, downloaderFn) {
    for (const url of urls) {
        await downloaderFn(ctx, url);
    }
    userLastLinkTime[ctx.from.id] = Date.now();
}

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
