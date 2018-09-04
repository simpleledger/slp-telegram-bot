const BITBOXCli = require('bitbox-cli/lib/bitbox-cli').default
    , BITBOX    = new BITBOXCli()
    , slpjs     = require('slpjs').slp
    , slputils  = require('slpjs').utils
    , bitdb     = require('slpjs').bitdb
    , util      = require('./util')
    , BigNumber = require('bignumber.js');

module.exports = class SLP {

    static async utxo(address){
        const set = await util.utxo(address);
        for(let txOut of set) {
            try {
                txOut.slp = slpjs.decodeTxOut(txOut);
            } catch(_) {}
        }
        return set;
    }

    static async sendTokens(keyPair, tokenId, to){
        const set        = await SLP.utxo(BITBOX.ECPair.toCashAddress(keyPair))
            , validSLPTx = await bitdb.verifyTransactions([...new Set(set.map(txOut => txOut.txid))]);

        let slpSendTxnConfig = {
            slpSendOpReturn: null,
            input_token_utxos: [],
            tokenReceiverAddressArray: [],
            bchChangeReceiverAddress: BITBOX.ECPair.toCashAddress(keyPair),
            wif: BITBOX.ECPair.toWIF(keyPair)
        }     

        if(to.length < 1)
            throw new Error('Need at least one receiver');

        let tokenAmount = new BigNumber(0)
          , dust = Number.MAX_SAFE_INTEGER;

        for(const txOut of set) {
            if('slp' in txOut && validSLPTx.includes(txOut.txid)){
                if(txOut.slp.token !== tokenId) {
                    continue;
                }
                tokenAmount = tokenAmount.plus(txOut.slp.quantity);

                if(txOut.satoshis < dust) {
                    dust = txOut.satoshis;
                }
            }
            satAmount += txOut.satoshis;
            inputs++;

            slpSendTxnConfig.input_token_utxos.push({
                token_utxo_txid: txOut.txid, 
                token_utxo_vout: txOut.vout, 
                token_utxo_satoshis: txOut.satoshis
            });
        }

        if(tokenAmount.isZero())
            throw new SendError('No token inputs found!');

        let opReturn;
        if(to.length === 1 && to[0].amount === 'all'){ // Send all token UTXO to another address
            opReturn = slpjs.buildSendOpReturn({ tokenIdHex: tokenId, outputQtyArray: [tokenAmount] });
        } else {
            const tokenChange = tokenAmount.minus(to.map(t => t.amount).reduce((sum, i) => sum.plus(i), new BigNumber(0)));
            if(tokenChange.isNegative())
                throw new SendError('Token outputs amount exceeds token inputs amount');
    
            if(!tokenChange.isZero()){
                to.push({
                    amount: tokenChange,
                    receiver: BITBOX.ECPair.toCashAddress(keyPair)
                });
            }
    
            if(to.length > 19)
                throw new SendError('Too many receivers!');
    
            opReturn = slpjs.buildSendOpReturn({ tokenIdHex: tokenId, outputQtyArray: to.map(t => t.amount) });
        }

        slpSendTxnConfig.slpSendOpReturn = opReturn;

        for(const t of to) {
            slpSendTxnConfig.tokenReceiverAddressArray.push(slputils.toSlpAddress(t.receiver));
        }



        let txHex = slpjs.buildRawSendTx(slpSendTxnConfig);
        console.log(txHex);
        const txId = await BITBOX.RawTransactions.sendRawTransaction(txHex);

        if(!txId.match(/^[0-9a-f]+$/)){
            throw new SendError(txId);
        }

        return txId;
    }
}

class SendError extends Error {
    constructor(message){
        super(message);
        this.name = 'SendError';
    }
}

module.exports.SendError = SendError;
