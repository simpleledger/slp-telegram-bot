const slp    = require('../slp')
    , Extra  = require('telegraf/extra')
    , Markup = require('telegraf/markup');

const slpRegex = /simpleledger:[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{42}/g;

// Three types of airdrop:
// (1) Address provided - Airdrop to address
// (2) No address provided, response to message containing address - Airdrop to addresses in message
// (3) No address provided, not responding to another message - Airdrop to all known addresses
module.exports = async function(ctx){
    const { amount } = await ctx.settings.getSettings();

    let address = ctx.message.text.split(' ')[1];
    if(address){ // 1
        console.log('Airdrop to address in chat', ctx.message.chat.id);

        address = address.trim();
        try {
            address = slp.toCashAddr(address);
        } catch(err){
            ctx.reply(`That's not a valid SLP address 🙁`, {
                reply_to_message_id: ctx.message.message_id
            });
            return;
        }

        const txId = await ctx.account.sendTokens([{
            receiver: address,
            amount,
        }]);

        console.log('Transaction ID:', txId)

        const keyboard = Markup.inlineKeyboard([
            Markup.urlButton('Open in explorer', `tokengraph.network/tx/${txId}`)
        ]);
        ctx.replyWithHTML(`I sent some tokens to you 😘`, {
            reply_to_message_id: ctx.message.message_id,
            reply_markup: Extra.markup(keyboard),
        });
    } else if(ctx.message.reply_to_message) { // 2
        console.log('Airdrop to response in chat', ctx.message.chat.id);

        const addresses = (ctx.message.reply_to_message.text.match(slpRegex) || []).filter(addr => {
            return slp.isSLPAddr(addr);
        })

        if(addresses.length > 18){
            addresses.length = 18;
        }

        if(addresses.length === 0){
            ctx.reply(`There's no SLP address in that message 🤔\nEither specify a specific SLP address to airdrop or have users post their SLP address and I will airdrop the last 18 addresses.`, {
                reply_to_message_id: ctx.message.message_id
            });
        } else {
            const txId = await ctx.account.sendTokens(addresses.map(addr => ({
                receiver: slp.toCashAddr(addr),
                amount
            })));

            console.log('Transaction ID:', txId)

            const keyboard = Markup.inlineKeyboard([
                Markup.urlButton('Open in explorer', `tokengraph.network/tx/${txId}`)
            ]);
            ctx.replyWithHTML(`Send tokens to ${addresses.length} address${addresses.length !== 1 ? 'es' : ''} 🤑`, {
                reply_to_message_id: ctx.message.message_id,
                reply_markup: Extra.markup(keyboard),
            });
        }
    } else { // 3
        console.log('Airdrop to list in chat', ctx.message.chat.id);

        const addresses = await ctx.addresses.get();

        const txId = await ctx.account.sendTokens(addresses.map(addr => ({
            receiver: slp.toCashAddr(addr),
            amount
        })));

        console.log('Transaction ID:', txId)

        const keyboard = Markup.inlineKeyboard([
            Markup.urlButton('Open in explorer', `tokengraph.network/tx/${txId}`)
        ]);
        ctx.replyWithHTML(`Airdrop for everybody 🎉`, {
            reply_to_message_id: ctx.message.message_id,
            reply_markup: Extra.markup(keyboard),
        });
    }
};