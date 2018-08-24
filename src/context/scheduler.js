const { bindContext } = require('../middleware');

module.exports = function(bot){
    const set = new Set([]);

    bot.context.scheduler = {};

    Object.defineProperty(bot.context.scheduler, 'status', {
        get: function(){
            const chatId = this.ctx.message.chat.id;
            return set.has(chatId);
        }
    });

    bot.context.scheduler.register = function(){
        const chatId = this.ctx.message.chat.id;
        set.add(chatId);
    };

    bot.context.scheduler.unregister = function(){
        if(this.status){
            const chatId = this.ctx.message.chat.id;
            set.delete(chatId);
        }
    };

    bot.use(bindContext(['scheduler', 'ctx']));
};
