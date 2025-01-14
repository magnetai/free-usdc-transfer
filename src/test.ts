// For test
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import * as fs from 'fs/promises';

Coinbase.configure({ apiKeyName: "organizations/009bf85e-8bd3-4cce-8e95-56a83f841c04/apiKeys/152988d0-0294-4195-91d3-3fe5a7d93e75", privateKey: "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIM550SqXJHPc1vLEEUg9gatKv1+2tkYh/YB+hX0p9JTMoAoGCCqGSM49\nAwEHoUQDQgAEN8ZYx98QL4I1wVk87YpuJC+JKDKRMa3dcrvsA7E+OgQdncnlLu5O\npVL2KJhznnZPwKPzKrVgPICQ9sAexUhFdw==\n-----END EC PRIVATE KEY-----\n" });

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