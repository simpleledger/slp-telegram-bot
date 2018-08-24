const BigNumber = require('bignumber.js');

module.exports = async function(ctx){
    const amountStr = ctx.message.text.split(' ')[1];
    if(!amountStr){
        ctx.replyWithHTML(`I can't find any parameter 👀`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    let amount = new BigNumber(amountStr);
    if(amount.isNaN() || amount.isLessThanOrEqualTo(0)){
        ctx.replyWithHTML(`That's not a valid amount`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    const { tokenPrecision } = await ctx.settings.getSettings();
    amount = amount.multipliedBy(10 ** tokenPrecision);

    if(!amount.isInteger()){
        ctx.replyWithHTML(`Fractional tokens can not be send`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    await ctx.settings.setAmount(amount.toNumber());

    ctx.replyWithHTML(`Changed the amount`, {
        reply_to_message_id: ctx.message.message_id
    });
};