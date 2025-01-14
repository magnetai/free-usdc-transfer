import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as fs from 'fs/promises';
import { http } from 'viem'
import { mainnet } from 'viem/chains'
import { createEnsPublicClient } from '@ensdomains/ensjs'
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { ethers } from "ethers";

// import { bootstrap } from 'global-agent';
// process.env.GLOBAL_AGENT_HTTP_PROXY = 'http://127.0.0.1:10080';
// process.env.GLOBAL_AGENT_HTTPS_PROXY = 'http://127.0.0.1:10080';
// process.env.GLOBAL_AGENT_NO_PROXY = 'localhost,127.0.0.1';
// bootstrap();

// Base scan
const BASE_SCAN_ADDR = "https://basescan.org/address/"

// Check for API key
const COINBASE_CDP_API_KEY_NAME = process.env.COINBASE_CDP_API_KEY_NAME!;
if (!COINBASE_CDP_API_KEY_NAME) {
    console.error("Error: COINBASE_CDP_API_KEY_NAME environment variable is required");
    process.exit(1);
}
const COINBASE_CDP_PRIVATE_KEY = process.env.COINBASE_CDP_PRIVATE_KEY!;
if (!COINBASE_CDP_PRIVATE_KEY) {
    console.error("Error: COINBASE_CDP_SECRET environment variable is required");
    process.exit(1);
}
Coinbase.configure({ apiKeyName: COINBASE_CDP_API_KEY_NAME, privateKey: COINBASE_CDP_PRIVATE_KEY });


// Create server instance
const server = new Server(
    {
        name: "free-usdc-transfer",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define Zod schemas for validation
const BstsArgumentsSchema = z.object({
    usdc_amount: z.number().gt(0),
    recipient: z.string()
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "buy_something_to_somebody",
                description: "Analyze the value of the purchased items and transfer USDC to the recipient via the Base chain. Due to the uncertainty of blockchain transaction times, the transaction is only scheduled here and will not wait for the transaction to be completed.",
                inputSchema: {
                    type: "object",
                    properties: {
                        usdc_amount: {
                            type: "number",
                            description: "USDC amount, greater than 0",
                        },
                        recipient: {
                            type: "string",
                            description: "Recipient's on-chain address or ENS addresses ending in .eth",
                        }
                    },
                    required: ["usdc_amount", "recipient"],
                },
            },
            {
                name: "create_mpc_wallet",
                description: "Used to create your coinbase MPC wallet address. The newly created wallet cannot be used directly; the user must first deposit USDC. The transfer after creation requires user confirmation",
                inputSchema: {
                    type: "object"
                },
            }
        ],
    };
});

// Create the client
const client = createEnsPublicClient({
    chain: mainnet,
    transport: http(),
})

// ENS
async function getAddress(recipient: string) {
    if (recipient.toLowerCase().endsWith('.eth')) {
        return (await client.getAddressRecord({ name: recipient }))?.value
    }
    if (!recipient || recipient.length != 42) {
        return undefined
    }
    return recipient;
};

async function createMPCWallet() {
    let wallet = await Wallet.create({ networkId: "base-mainnet" });
    const seedFilePath = "mpc_info.json";
    wallet.saveSeedToFile(seedFilePath);
    return (await wallet.getDefaultAddress()).getId();
}

async function sendUSDCUseMPCWallet(walletId: string, recipientAddr: string, amount: number) {
    const wallet = await Wallet.fetch(walletId)
    await wallet.loadSeedFromFile('mpc_info.json')
    const defaultAddress = await wallet.getDefaultAddress()

    await defaultAddress.createTransfer({
        amount: amount,
        assetId: Coinbase.assets.Usdc,
        destination: ethers.getAddress(recipientAddr),
        gasless: true
    })

    return defaultAddress.getId()
}

async function queryMpcWallet() {
    try {
        const jsonString = await fs.readFile("mpc_info.json", 'utf8')
        const ids = Object.keys(JSON.parse(jsonString))
        if (!ids || ids.length === 0) {
            return { mpcAddress: "", mpcId: "" }
        }
        const wallet = await Wallet.fetch(ids[0])
        await wallet.loadSeedFromFile('mpc_info.json')
        return { mpcAddress: (await wallet.getDefaultAddress()).getId(), mpcId: ids[0] }
    } catch (err) {
        console.error(`${err}`)
        return { mpcAddress: "", mpcId: "" }
    }
}

async function queryMpcWalletId() {
    try {
        const jsonString = await fs.readFile("mpc_info.json", 'utf8')
        const ids = Object.keys(JSON.parse(jsonString))
        if (!ids || ids.length === 0) {
            return ""
        }
        return ids[0]
    } catch (err) {
        console.error(`${err}`)
        return ""
    }
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "buy_something_to_somebody") {
            const { usdc_amount, recipient } = BstsArgumentsSchema.parse(args);
            const mpcId= await queryMpcWalletId();
            if (!mpcId) {
                return {
                    content: [
                        {
                            type: "text",
                            text: "You haven't created a Coinbase MPC wallet yet",
                        },
                    ],
                };
            }
            const recipientAddr = await getAddress(recipient)
            if (!recipientAddr) {
                return {
                    content: [
                        {
                            type: "text",
                            text: 'Invalid address or ENS',
                        },
                    ]
                }
            }
            const addr= await sendUSDCUseMPCWallet(mpcId, recipientAddr, usdc_amount)
            const linkAddr = BASE_SCAN_ADDR + addr + "#tokentxns"
            return {
                content: [
                    {
                        type: "text",
                        text: `The transaction (send ${usdc_amount} USDC to ${recipientAddr}) has been scheduled and you can view the details via link: ${linkAddr}`,
                    },
                ],
            };
        } else if (name === "create_mpc_wallet") {
            const { mpcAddress } = await queryMpcWallet();
            if (!mpcAddress) {
                const newMpcAddress = await createMPCWallet()
                return {
                    content: [
                        {
                            type: "text",
                            text: `Your Coinbase MPC wallet address has been successfully created (${newMpcAddress}). Now please transfer USDC to MPC wallet, and you can later use it to transfer funds to others without fees.`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `You already have an address, which is ${mpcAddress}`,
                    },
                ],
            };
        }
        else {
            throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(
                `Invalid arguments: ${error.errors
                    .map((e) => `${e.path.join(".")}: ${e.message}`)
                    .join(", ")}`
            );
        }
        throw error;
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Free USDC transfer MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
