const BITBOXCli       = require('bitbox-cli/lib/bitbox-cli').default
    , BITBOX          = new BITBOXCli()
    , slp             = require('../slp')
    , slputils        = require('slpjs').utils
    , bitdb           = require('slpjs').bitdb
    , { bindContext } = require('../middleware')
    , BigNumber       = require('bignumber.js');

module.exports = function(bot, hdNode, path){
    if(!hdNode){
        throw new Error('HDNode must be set')
    }

    if(typeof path !== 'string'){
        throw new Error('Path must be a string');
    }

    try {
        BITBOX.HDNode.derivePath(hdNode, path.replace('%d', 0));
    } catch(err){
        throw new Error('Invalid HDNode or path: ' + String(err));
    }
    
    bot.context.account = {};

    Object.defineProperty(bot.context.account, 'derivationPath', {
        get: function(){
            const chatId  = this.ctx.message.chat.id
                , hash    = BITBOX.Crypto.sha256(new Buffer(chatId.toFixed(0), 'ascii'))
                , childId = hash.readUInt32LE(0) & 0x7fffffff /* cut to uint31 */

            return path.replace('%d', childId);
        }
    });

    Object.defineProperty(bot.context.account, 'keyPair', {
        get: function(){
            const childNode = BITBOX.HDNode.derivePath(hdNode, this.derivationPath)   
            return BITBOX.HDNode.toKeyPair(childNode);
        }
    });

    Object.defineProperty(bot.context.account, 'address', {
        get: function(){
            return BITBOX.ECPair.toCashAddress(this.keyPair);
        }
    });

    Object.defineProperty(bot.context.account, 'slpAddress', {
        get: function(){
            return slputils.toSlpAddress(this.address);
        }
    });

    bot.context.account.utxo = async function(){
        const set = await slp.utxo(this.address);
        return set;
    };

    bot.context.account.balance = async function(){
        const set        = await this.utxo()
            , validSLPTx = await bitdb.verifyTransactions([...new Set(set.map(txOut => txOut.txid))]);

        const map = {
            satoshis: 0,
        };

        for(const txOut of set){
            if('slp' in txOut && validSLPTx.includes(txOut.txid)){
                if(!(txOut.slp.token in map)){
                    map[txOut.slp.token] = new BigNumber(0);
                }
                map[txOut.slp.token] = map[txOut.slp.token].plus(txOut.slp.quantity);
            } else {
                map.satoshis += txOut.satoshis;
            }
        }

        return map;
    };

    bot.context.account.sendTokens = async function(to){
        const tokenId = await this.ctx.settings.getToken();
        const txId = await slp.sendTokens(this.keyPair, tokenId, to);
        return txId;
    };

    bot.use(bindContext(['account', 'ctx']));
};