module.exports = async function(ctx){
    const list = await ctx.addresses.get();

        if(list.length > 0){
            ctx.replyWithDocument({
                source: new Buffer(list.join('\n'), 'utf8'),
                filename: 'addresses.txt',
            }, {
                reply_to_message_id: ctx.message.message_id
            });
        } else {
            ctx.reply('The list is empty 🙈', {
                reply_to_message_id: ctx.message.message_id
            });
        }
};