import { WalletSelector } from "./WalletSelector";

export function Header() {
  return (
    <div className="flex items-center justify-between px-4 py-2 max-w-screen-xl mx-auto w-full flex-wrap">
      <h1 className="display">Aptos Testnet Faucet Gateway</h1>
      <div className="flex gap-2 items-center flex-wrap">
        <a
          href={"https://github.com/gregnazario/testnet-integration-app/tree/main/testnet-asset-faucet"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Source Code
        </a>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <WalletSelector />
      </div>
    </div>
  );
}
