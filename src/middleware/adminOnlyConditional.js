module.exports = async (ctx, next) => {
    const adminOnly = await ctx.settings.isAdminOnly();
    if(adminOnly){
        const member = await ctx.telegram.getChatMember(ctx.message.chat.id, ctx.message.from.id);
        if(!member){
            throw new Error('Member not found');
        }
    
        if(member.status !== 'creator' && member.status !== 'administrator'){
            ctx.replyWithHTML(`Sorry, the bot is configured to only allow this command to be executed by admins 🤷‍♂️`, {
                reply_to_message_id: ctx.message.message_id
            });
            return
        }
    }
    
    await next(ctx);
};