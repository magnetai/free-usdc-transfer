# Free USDC Transfer MCP Server

An MCP server implementation designed for free USDC transfers on the Base chain and Coinbase MPC wallet management.

## Features

- USDC Transfers: Schedule USDC transfers to specified on-chain addresses or ENS domains via the Base chain.
- Coinbase MPC Wallet Management: Create and manage Coinbase MPC wallets, enabling secure and fee-free transfers.
- ENS Support: Automatically resolves ENS domains to on-chain addresses.

## Tools

### tranfer-usdc
- Description: Analyze the value of the purchased items and transfer USDC to the recipient via the Base chain. Due to the uncertainty of blockchain transaction times, the transaction is only scheduled here and will not wait for the transaction to be completed.
- Inputs:
    - usdc_amount (number): USDC amount, greater than 0.
    - recipient (string): Recipient's on-chain address or ENS domain (e.g., example.eth).
- Behavior:
    - Verifies the recipient's address or resolves ENS domains.
    - Schedules a USDC transfer on the Base chain.
    - Provides a link to view transaction details on BaseScan.

### create_coinbase_mpc_wallet
- Description: Create a Coinbase MPC wallet address. The newly created wallet cannot be used directly; the user must deposit USDC first. Transfers require user confirmation.
- Behavior:
    - Creates a new Coinbase MPC wallet and saves the seed to a secure file.
    - If a wallet already exists, returns the existing wallet address.
    - The seed file for Coinbase MPC wallets is stored in the Documents directory under the file name mpc_info.json.

## Configuration

### Getting an API Key
1. Sign up for a [Coinbase CDP account](https://portal.cdp.coinbase.com/)
2. Generate your API key from the developer dashboard

### Usage with Claude Desktop
Add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "free-usdc-transfer": {
      "command": "npx",
      "args": [
        "-y",
        "@magnetai/free-usdc-transfer"
      ],
      "env": {
        "COINBASE_CDP_API_KEY_NAME": "YOUR_COINBASE_CDP_API_KEY_NAME",
        "COINBASE_CDP_PRIVATE_KEY": "YOUR_COINBASE_CDP_PRIVATE_KEY"
      }
    }
  }
}
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
