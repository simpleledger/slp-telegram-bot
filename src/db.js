const sqlite    = require('sqlite')
    , SQL       = require('sql-template-strings')
    , BigNumber = require('bignumber.js');

const migrationsPath = './src/migrations';

const defaultChat = {
    token: '',
    tokenName: null,
    tokenPrecision: 0,
    amount: new BigNumber(1),
    adminOnly: true
};

module.exports = class Database {
    constructor(filename){
        if(typeof filename !== 'string'){
            throw new Error('Filename must be a string');
        }

        this._filename = filename;
    }

    async open(){
        this._db = await sqlite.open(this._filename, { promise: Promise });
        await this._db.migrate({ migrationsPath });
    }

    async setChatToken(chatId, token, tokenName, tokenPrecision){
        const res = await this._db.run(SQL`UPDATE chats SET token = ${token}, token_name = ${tokenName}, token_precision = ${tokenPrecision} WHERE id = ${chatId};`);
        if(res.stmt.changes > 0)
            return;

        await this._db.run(SQL`INSERT INTO chats (id, token, token_name, token_precision) VALUES (${chatId}, ${token}, ${tokenName}, ${tokenPrecision});`);
    }

    async setChatAdminOnly(chatId, adminOnly){
        const res = await this._db.run(SQL`UPDATE chats SET admin_only = ${adminOnly} WHERE id = ${chatId};`);
        if(res.stmt.changes > 0)
            return;

        await this._db.run(SQL`INSERT INTO chats (id, admin_only) VALUES (${chatId}, ${adminOnly});`);
    }

    async setChatAmount(chatId, amount){
        if(!(amount instanceof BigNumber)){
            throw new Error('Amount must be a BigNumber');
        }

        if(!amount.isInteger() || amount.isLessThan(1)){
            throw new Error('Amount must be an integer n > 0');
        }

        const res = await this._db.run(SQL`UPDATE chats SET amount = ${amount.toString()} WHERE id = ${chatId};`);
        if(res.stmt.changes > 0)
            return;

        await this._db.run(SQL`INSERT INTO chats (id, amount) VALUES (${chatId}, ${amount.toString()});`);
    }

    async getChat(chatId){
        const res = await this._db.get(SQL`SELECT admin_only, token, token_name, token_precision, amount FROM chats WHERE id = ${chatId};`);
        if(!res)
            return defaultChat;

        let amount = new BigNumber(res.amount);
        if(amount.isNaN()){
            throw new Error('Amount is not a valid BigNumber');
        }

        return {
            token: res.token,
            tokenName: res.token_name,
            tokenPrecision: res.token_precision,
            amount,
            adminOnly: res.admin_only,
        };
    }

    async setUserAddress(chatId, userId, address){
        const ts = Math.round(Date.now() / 1000);

        const res = await this._db.run(SQL`UPDATE addresses SET address = ${address}, modified = ${ts} WHERE chat_id = ${chatId} AND user_id = ${userId};`);
        if(res.stmt.changes > 0)
            return;

        await this._db.run(SQL`INSERT INTO addresses (chat_id, user_id, address, modified) VALUES (${chatId}, ${userId}, ${address}, ${ts});`);
    }

    async removeChatAddresses(chatId){
        await this._db.run(SQL`DELETE FROM addresses WHERE chat_id = ${chatId};`)
    }

    async listChatAddresses(chatId){
        const res = await this._db.all(SQL`SELECT address FROM addresses WHERE chat_id = ${chatId} ORDER BY modified DESC LIMIT 18;`);
        return (res || []).map(i => i.address);
    }
}