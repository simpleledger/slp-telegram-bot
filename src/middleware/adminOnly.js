module.exports = async (ctx, next) => {
    const member = await ctx.telegram.getChatMember(ctx.message.chat.id, ctx.message.from.id);
    if(!member){
        throw new Error('Member not found');
    }

    if(member.status !== 'creator' && member.status !== 'administrator'){
        ctx.replyWithHTML(`You are not an admin, Sir 👆`, {
            reply_to_message_id: ctx.message.message_id
        });
        return
    }

    await next(ctx);
};