const apiKey = process.env.BITDB_KEY || '';
if(!apiKey){
    throw new Error('Missing BitDB key');
}

const BITBOXCli = require('bitbox-cli/lib/bitbox-cli').default
    , BITBOX = new BITBOXCli()
    , util = require('./util')
    , request = require('request-promise')
    , cashaddr = require('cashaddrjs')
    , BigNumber = require('bignumber.js');

const bitDbUrl      = 'https://bitdb.network/q/'
    , tokenGraphUrl = 'https://tokengraph.network/verify/';

module.exports = class SLP {
    static toCashAddr(slpAddress){
        const { prefix, type, hash } = cashaddr.decode(slpAddress);
        if(prefix !== 'simpleledger'){
            throw new Error('Not a simpleledger address');
        }
        return cashaddr.encode('bitcoincash', type, hash);
    }

    static toSLPAddr(addr){
        const { type, hash } = cashaddr.decode(addr);
        return cashaddr.encode('simpleledger', type, hash);
    }

    static isSLPAddr(addr){
        try {
            SLP.toSLPAddr(addr);
            return true;
        } catch(err){
            return false;
        }
    }

    static async utxo(address){
        const set = await util.utxo(address);
        for(let txOut of set){
            try {
                txOut.slp = SLP.decodeTxOut(txOut);
            } catch(_) {}
        }
        return set;
    }

    static async sendTokens(keyPair, tokenId, to){
        const set        = await SLP.utxo(BITBOX.ECPair.toCashAddress(keyPair))
            , validSLPTx = await SLP.verifyTransactions([...new Set(set.map(txOut => txOut.txid))]);

        if(to.length < 1){
            throw new Error('Need at least one receiver');
        }

        let builder = new BITBOX.TransactionBuilder('bitcoincash');

        let inputs = 0
          , tokenAmount = new BigNumber(0)
          , satAmount = 0
          , dust = Number.MAX_SAFE_INTEGER;

        for(const txOut of set){
            if('slp' in txOut && validSLPTx.includes(txOut.txid)){
                if(txOut.slp.token !== tokenId){
                    continue;
                }
                tokenAmount = tokenAmount.plus(txOut.slp.quantity);

                if(txOut.satoshis < dust){
                    dust = txOut.satoshis;
                }
            }
            satAmount += txOut.satoshis;
            inputs++;

            builder.addInput(txOut.txid, txOut.vout);
        }

        if(tokenAmount.isZero()){
            throw new SendError('No token inputs found!');
        }

        let opReturn;
        if(to.length === 1 && to[0].amount === 'all'){ // Send all token UTXO to another address
            opReturn = SLP.buildSendOpReturn(tokenId, [tokenAmount]);
        } else {
            const tokenChange = tokenAmount.minus(to.map(t => t.amount).reduce((sum, i) => sum.plus(i), new BigNumber(0)));
            if(tokenChange.isNegative()){
                throw new SendError('Token outputs amount exceeds token inputs amount');
            }
    
            if(!tokenChange.isZero()){
                to.push({
                    amount: tokenChange,
                    receiver: BITBOX.ECPair.toCashAddress(keyPair)
                });
            }
    
            if(to.length > 19){
                throw new SendError('Too many receivers!');
            }
    
            opReturn = SLP.buildSendOpReturn(tokenId, to.map(t => t.amount));
        }
        
        builder.addOutput(opReturn, 0);

        let satChange = satAmount;
        for(const t of to){
            builder.addOutput(t.receiver, dust);
            satChange -= dust;
        }

        const fee = BITBOX.BitcoinCash.getByteCount({ P2PKH: inputs }, { P2PKH: 2 + to.length }) + opReturn.byteLength;
        satChange -= fee;

        if(satChange >= dust){
            builder.addOutput(BITBOX.ECPair.toCashAddress(keyPair), satChange)
        }

        let i = 0;
        for(const txOut of set){
            if('slp' in txOut && txOut.slp.token !== tokenId){
                continue;
            }
            builder.sign(i, keyPair, null, builder.hashTypes.SIGHASH_ALL, txOut.satoshis);
            i++;
        }

        const txId = await BITBOX.RawTransactions.sendRawTransaction(builder.build().toHex());

        if(!txId.match(/^[0-9a-f]+$/)){
            throw new SendError(txId);
        }

        return txId;
    }

    static get lokadIdHex() { return "534c5000" }

    static decodeTxOut(txOut){
        let out = {
            token: '',
            quantity: 0
        };
    
        const script = BITBOX.Script.toASM(Buffer.from(txOut.tx.vout[0].scriptPubKey.hex, 'hex')).split(' ');
    
        if(script[0] !== 'OP_RETURN'){
            throw new Error('Not an OP_RETURN');
        }
    
        if(script[1] !== SLP.lokadIdHex){
            throw new Error('Not a SLP OP_RETURN');
        }
    
        if(script[2] != 'OP_1'){
            throw new Error('Unknown token type');
        }
    
        const type = Buffer.from(script[3], 'hex').toString('ascii').toLowerCase();
    
        if(type === 'genesis'){
            if(txOut.vout !== 1){
                throw new Error('Not a SLP txout');
            }
            out.token = txOut.txid;
            out.quantity = new BigNumber(script[10], 16);
        } else if(type === 'mint'){
            if(txOut.vout !== 1){
                throw new Error('Not a SLP txout');
            }
            out.token = script[4];
            out.quantity = new BigNumber(script[6], 16);
        } else if(type === 'send'){
            if(script.length <= txOut.vout + 4){
                throw new Error('Not a SLP txout');
            }
    
            out.token = script[4];
            out.quantity = new BigNumber(script[txOut.vout + 4], 16);
        } else {
            throw new Error('Invalid tx type');
        }
    
        return out;
    }

    static buildSendOpReturn(tokenId, outputQtyArray) {
        let script = []

        // OP Return Prefix
        script.push(0x6a);

        // Lokad Id
        let lokadId = Buffer.from(SLP.lokadIdHex, 'hex');
        script.push(SLP.getPushDataOpcode(lokadId));
        lokadId.forEach((item) => script.push(item));

        // Token Type
        const tokenType = 0x01;
        script.push(SLP.getPushDataOpcode([tokenType]));
        script.push(tokenType);

        // Transaction Type
        let transactionType = Buffer.from('SEND');
        script.push(SLP.getPushDataOpcode(transactionType));
        transactionType.forEach((item) => script.push(item));

        // Token Id
        tokenId = Buffer.from(tokenId, 'hex');
        script.push(SLP.getPushDataOpcode(tokenId));
        tokenId.forEach((item) => script.push(item));

        // Output Quantities
        if (outputQtyArray.length > 19) {
            throw Error("Cannot have more than 19 SLP token outputs.");
        }
        if (outputQtyArray.length < 1) {
            throw Error("Cannot have less than 1 SLP token output.");
        }
        outputQtyArray.forEach((outputQty) => {
            if (outputQty < 0) {
                throw Error("All outputs must be 0 or greater");
            }
            let qtyBuffer = SLP.int2FixedBuffer(outputQty, 8);
            script.push(SLP.getPushDataOpcode(qtyBuffer));
            qtyBuffer.forEach((item) => script.push(item));
        })

        let encodedScript = SLP.encodeScript(script);
        if (encodedScript.length > 223) {
            throw Error("Script too long, must be less than 223 bytes.");
        }
        return encodedScript;
    }

    static getPushDataOpcode(data) {
        let length = data.length

        if (length === 0)
            return [0x4c, 0x00]
        else if (length < 76)
            return length
        else if (length < 256)
            return [0x4c, length]
        else
            throw Error("Pushdata too large")
    }

    static int2FixedBuffer(amount, byteLength) {
        let hex = amount.toString(16);
        hex = hex.padStart(16, '0')
        return Buffer.from(hex, 'hex');
    }

    static encodeScript(script) {
        const bufferSize = script.reduce((acc, cur) => {
            if (Array.isArray(cur)) return acc + cur.length
            else return acc + 1
        }, 0)

        const buffer = Buffer.allocUnsafe(bufferSize)
        let offset = 0
        script.forEach((scriptItem) => {
            if (Array.isArray(scriptItem)) {
                scriptItem.forEach((item) => {
                    buffer.writeUInt8(item, offset)
                    offset += 1
                })
            } else {
                buffer.writeUInt8(scriptItem, offset)
                offset += 1
            }
        })

        return buffer;
    }

    static txidFromHex(hex) {
        let buffer = Buffer.from(hex, "hex")
        let hash = BITBOX.Crypto.hash256(buffer).toString('hex')
        return hash.match(/[a-fA-F0-9]{2}/g).reverse().join('')
    }

    static async getTokenInformation(tokenId) {
        let query = {
            request: {
                find: {
                    s3: 'GENESIS',
                    tx: tokenId,
                }, 
                project: {
                    b5:  1,
                    b8:  1,
                    _id: 0,
                }
            },
            response: {
                encoding: {
                    b5: 'utf8',
                    b8: 'hex'
                }
            }
        };
        const data = Buffer.from(JSON.stringify(query)).toString('base64');

        const response = await request({
            method: 'GET',
            uri: bitDbUrl + data,
            headers: {
                'key': apiKey,
            },
            json: true,
        });

        if(response.status === 'error'){
            throw new Error(response.message || 'API error message missing');
        }

        const list = [];
        if(response.confirmed){
            list.push(...response.confirmed);
        }
        if(response.unconfirmed){
            list.push(...response.unconfirmed);
        }
        if(list.length === 0){
            throw new Error('Token not found');
        }

        let tokenName, tokenPrecision;
        tokenName      = list[0].b5 || null;
        tokenPrecision = parseInt(list[0].b8, 16) || 0;

        return { tokenName, tokenPrecision };
    }

    static async verifyTransactions(txIds = []) {
        if(txIds.length === 0)
            return [];

        const response = await request({
            method: 'GET',
            uri: tokenGraphUrl + txIds.join(','),
            json: true,
        });

        return response.response.filter(i => !i.errors).map(i => i.tx);
    }
}

class SendError extends Error {
    constructor(message){
        super(message);
        this.name = 'SendError';
    }
}

module.exports.SendError = SendError;
