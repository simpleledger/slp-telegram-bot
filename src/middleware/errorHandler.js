const SendError = require('../slp').SendError;

function handleError(ctx, err, reply = false){
    console.error(err);
    if(err instanceof SendError){
        let msg = `Ooops, there was some error broadcasting the transaction 💩\n<pre>${String(err)}</pre>`;
        if(String(err).includes('insufficient priority')){
            msg += '\n\Maybe the bot ran out of funds?';
        }

        ctx.replyWithHTML(msg, {
            reply_to_message_id: reply ? ctx.message.message_id : undefined
        });
    } else {
        let msg = `Ooops, I ran into some error 💩\n<pre>${String(err)}</pre>`;
        ctx.replyWithHTML(msg, {
            reply_to_message_id: reply ? ctx.message.message_id : undefined
        });
    }
}

module.exports = async (ctx, next) => {
    try {
        await next();
    } catch(err){
        handleError(ctx, err, true);
    }
};

module.exports.handleError = handleError;

