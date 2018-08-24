const { bindContext } = require('../middleware');

module.exports = function(bot, db){
    bot.context.settings = {};

    bot.context.settings.getSettings = async function(){
        const chatId   = this.ctx.message.chat.id
            , settings = await db.getChat(chatId);

        return settings;
    };

    bot.context.settings.getToken = async function(){
        const { token } = await this.getSettings();
        return token;
    };

    bot.context.settings.setToken = async function(tokenId, tokenName, tokenPrecision){
        const chatId = this.ctx.message.chat.id;
        await db.setChatToken(chatId, tokenId, tokenName, tokenPrecision);
    };

    bot.context.settings.isAdminOnly = async function(){
        const { adminOnly } = await this.getSettings();
        return adminOnly;
    };

    bot.context.settings.setAdminOnly = async function(adminOnly = true){
        const chatId = this.ctx.message.chat.id;
        await db.setChatAdminOnly(chatId, adminOnly);
    };

    bot.context.settings.getAmount = async function(){
        const { amount } = await this.getSettings();
        return amount;
    };

    bot.context.settings.setAmount = async function(amount){
        const chatId = this.ctx.message.chat.id;
        await db.setChatAmount(chatId, amount);
    };

    bot.use(bindContext(['settings', 'ctx']));
};