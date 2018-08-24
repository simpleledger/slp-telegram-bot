module.exports = async (ctx, next) => {
    if(!ctx.message || !ctx.message.text){
        /* No textual message */
        return;
    }
    await next();
};
