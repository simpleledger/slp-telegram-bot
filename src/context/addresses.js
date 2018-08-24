const { bindContext } = require('../middleware');

module.exports = function(bot, db){
    bot.context.addresses = {};

    bot.context.addresses.get = async function(){
        const chatId = this.ctx.message.chat.id
            , list   = await db.listChatAddresses(chatId);
            
        return list;
    };

    bot.context.addresses.set = async function(address){
        const chatId = this.ctx.message.chat.id
            , userId = this.ctx.message.from.id;

        await db.setUserAddress(chatId, userId, address);
    };

    bot.context.addresses.clear = async function(){
        const chatId = this.ctx.message.chat.id;
        await db.removeChatAddresses(chatId);
    };

    bot.use(bindContext(['addresses', 'ctx']));
};
