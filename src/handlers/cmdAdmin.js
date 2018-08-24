const arrayTrue  = ['1', 'yes',  'true',  'on']
    , arrayFalse = ['0',  'no', 'false', 'off'];

module.exports = async function(ctx){
    const enabled = (ctx.message.text.split(' ')[1] || '').toLowerCase();
    if(!enabled){
        ctx.replyWithHTML(`I can't find any parameter 👀`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    let adminOnly;
    if(arrayTrue.includes(enabled)){
        adminOnly = true;
    } else if(arrayFalse.includes(enabled)){
        adminOnly = false;
    } else {
        ctx.replyWithHTML(`That's not a valid parameter 👀`, {
            reply_to_message_id: ctx.message.message_id
        });
        return;
    }

    await ctx.settings.setAdminOnly(adminOnly);
    ctx.replyWithHTML(`Changed privileges for doing airdrops ✌️`, {
        reply_to_message_id: ctx.message.message_id
    });
};
