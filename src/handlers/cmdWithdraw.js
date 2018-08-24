const slp = require('../slp');

module.exports = async function(ctx){
    const address = ctx.message.text.split(' ')[1];
    if(!address){
        ctx.replyWithHTML(`I can't find any parameter 👀`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    if(!slp.isSLPAddr(address)){
        ctx.replyWithHTML(`That's not a valid SLP address 🙄`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    await ctx.account.sendTokens([{
        receiver: address,
        amount: 'all',
    }]);

    ctx.replyWithHTML(`Tokens withdrawn`, {
        reply_to_message_id: ctx.message.message_id
    });
};