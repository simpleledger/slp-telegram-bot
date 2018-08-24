module.exports = async (ctx, next) => {
    if(ctx.message.chat.type !== 'group' && ctx.message.chat.type !== 'supergroup'){
        ctx.replyWithHTML(`I only work in Telegram groups! Please add me to a group 🤗`);
        return
    }
    
    await next(ctx);
};
