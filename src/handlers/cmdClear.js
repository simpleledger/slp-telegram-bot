module.exports = async function(ctx){
    await ctx.addresses.clear();
    ctx.reply('List cleared 🗑', {
        reply_to_message_id: ctx.message.message_id
    });
};