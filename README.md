# slp-telegram-bot

Distributes SLP tokens in a specified Telegram chat room to a list of registered up to 18 participants.

## Bot commands:

* /info - get chatroom specific status of the bot
* /admin <on-off> - control whether only admins can perform airdrop
* /token <token-id> - set the token id
* /amount <amount> - set the amount to be airdropped to each registered user
* /register <slp-addr> - add a simpleledger address to the registry
* /list - display all of the registered simpleledger addresses
* /clear - remove all of the addresses from the registry
* /airdrop - send the specified amount of the current token id to each user
* /party <on-off> - airdrop automatically every 5 minutes
* /withdraw <withdraw-address> - address to withdraw tokens from

##### NOTE: This bot should be used for experimental purposes only with tiny amounts of BCH! We are not responsible for any loss of funds.

## How to Run

1. Register with Telegram bot manager @BotFather obtain bot token 
2. Obtain BIP 39 mnemonic phrase for use in securing funds managed by the bot
3. Obtain api key for http://bitdb.network
4. `git clone <repo-url>`
5. `cd sip-telegram-bot`
6. `npm install`
7. `CHAT_ID="____" BOT_TOKEN="____" MNEMONIC="___ ___ ___" BITDB_KEY="___" node .` NOTE: To get your chat id you can run this step without CHAT_ID variable and your chat id will be printed to the console.  After you have your chat id you can re-run this command using the appropriate chat id to enable the bot for your chat.
