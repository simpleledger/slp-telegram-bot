const escape    = require('escape-html')
    , BigNumber = require('bignumber.js');

module.exports = async function(ctx){
    const [balance, settings] = await Promise.all([
        ctx.account.balance(),
        ctx.settings.getSettings()
    ]);

    const msg = [
        `<b>Addresses:</b>`,
        `<pre>${ctx.account.address}</pre>`,
        `<pre>${ctx.account.slpAddress}</pre>`,
        `<b>Path:</b> ${ctx.account.derivationPath}`,
        ``,
        `Only admins can do airdrops: ${settings.adminOnly ? 'Yes' : 'No'} (Set using the /admin command)`,
        ``,
        `<b>BCH Balance: ${(balance.satoshis / 100).toFixed(2)} bits</b>`,
        ``
    ];

    if(settings.token){
        const tokenBalance = balance[settings.token] || new BigNumber(0);

        msg.push(`<b>Token Name:</b> ${escape(settings.tokenName ? settings.tokenName : '<no name>')}`),
        msg.push(`<b>Token ID:</b> ${settings.token}`);
        msg.push(`<b>Token balance:</b> ${tokenBalance.dividedBy(10 ** settings.tokenPrecision).toFixed(settings.tokenPrecision)}`);
        msg.push(`<b>Airdrop amount:</b> ${settings.amount.dividedBy(10 ** settings.tokenPrecision).toFixed(settings.tokenPrecision)}`);
    } else {
        msg.push(`<b>No token set!</b> Set one using the /token command`);
    }

    ctx.replyWithHTML(msg.join('\n'), {
        reply_to_message_id: ctx.message.message_id
    });
};
