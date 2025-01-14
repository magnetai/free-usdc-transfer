// For test
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import * as fs from 'fs/promises';

Coinbase.configure({ apiKeyName: "", privateKey: "" });

async function queryMpcWallet() {
    try {
        const jsonString = await fs.readFile("mpc_info.json", 'utf8')
        console.log(jsonString)
        const ids = Object.keys(JSON.parse(jsonString))
        if (!ids || ids.length === 0) {
            return { mpcAddress: null, mpcId: null }
        }
        const wallet = await Wallet.fetch(ids[0])
        await wallet.loadSeedFromFile('mpc_info.json')
        return { mpcAddress: await wallet.getDefaultAddress(), mpcId: ids[0] }
    } catch (err) {
        console.error(`${err}`)
        return { mpcAddress: null, mpcId: null }
    }
}

await queryMpcWallet()