const slp             = require('../slp')
    , { handleError } = require('../middleware/errorHandler');

const interval = 5 * 60 * 1000;

module.exports = async function(ctx){
    const param = ctx.message.text.split(' ')[1];
    if(param){
        if(param === 'off'){
            ctx.scheduler.unregister();
            ctx.replyWithHTML(`Party mode disabled`, {
                reply_to_message_id: ctx.message.message_id
            });
        } else {
            ctx.replyWithHTML(`Invalid parameter`, {
                reply_to_message_id: ctx.message.message_id
            });
        }
        return;
    }

    if(ctx.scheduler.status){
        ctx.replyWithHTML(`Party is already running`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }
   
    ctx.replyWithHTML(`Party mode enabled!`, {
        reply_to_message_id: ctx.message.message_id
    });

    const handler = async function(){
        while(true){
            try {
                ctx.replyWithHTML(`Airdrop in 1 minute, be prepared!`);

                await wait(0.2 * interval);
                if(ctx && ctx.scheduler && !ctx.scheduler.status)
                    return;

                const addresses  = await ctx.addresses.get()
                    , { amount } = await ctx.settings.getSettings();

                const txId = await ctx.account.sendTokens(addresses.map(addr => ({
                    receiver: slp.toCashAddr(addr),
                    amount
                })));

                ctx.replyWithHTML(`Airdrop party 🎉\ntokengraph.network/tx/${txId}`);

                await wait(0.8 * interval);
                if(ctx && ctx.scheduler && !ctx.scheduler.status)
                    return;
            } catch(err){
                handleError(ctx, err);
            }
        }
    };

    ctx.scheduler.register();
    handler();
};

function wait(millis){
    return new Promise((resolve) => {
        setTimeout(resolve, millis);
    });
}
