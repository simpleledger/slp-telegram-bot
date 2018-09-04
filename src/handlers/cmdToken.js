const apiKey = process.env.BITDB_KEY || '';
if(!apiKey){
    throw new Error('Missing BitDB key');
}

const bitdb     = require('slpjs').bitdb
    , escape    = require('escape-html')
    , BigNumber = require('bignumber.js');

const regexToken = /^[0-9a-f]{64}$/
    , defAmount  = new BigNumber(1);

module.exports = async function(ctx){
    const tokenId = ctx.message.text.split(' ')[1];
    if(!tokenId){
        ctx.replyWithHTML(`I can't find any parameter 👀`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    if(!tokenId.match(regexToken)){
        ctx.replyWithHTML(`That's not a valid token id 🙄`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    const { tokenName, tokenPrecision } = await bitdb.getTokenInformation(tokenId, apiKey);

    await ctx.settings.setToken(tokenId, tokenName, tokenPrecision);
    await ctx.settings.setAmount(defAmount.multipliedBy(10 ** tokenPrecision));

    ctx.replyWithHTML([
        `Changed token ✌️`,
        `<b>Name:</b> ${escape(tokenName ? tokenName : '<no name>')}`,
        `<b>Decimal places:</b> ${escape(tokenPrecision)}`
    ].join('\n'), {
        reply_to_message_id: ctx.message.message_id
    });
};
