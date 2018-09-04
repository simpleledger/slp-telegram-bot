const network = require('slpjs').bitbox
    , _  = require('lodash');

module.exports = class Util {
    static async utxo(address){
        const set = await network.getUtxoWithRetry(address);
        let txIds = set.map(i => i.txid)
    
        if(txIds.length === 0){
            return [];
        }
    
        // Split txIds into chunks of 20 (BitBox limit), run the detail queries in parallel
        let txDetails = await Promise.all(_.chunk(txIds, 20).map(txIdchunk => {
            return network.getTransactionDetailsWithRetry(txIdchunk);
        }));
    
        // concat the chunked arrays
        txDetails = [].concat(...txDetails);
    
        for(let i = 0; i < set.length; i++){
            set[i].tx = txDetails[i];
        }
    
        return set;
    }
}
