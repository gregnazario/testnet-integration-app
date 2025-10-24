import { PropsWithChildren } from "react";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
// Internal components
import { useToast } from "@/components/ui/use-toast";
// Internal constants
import { APTOS_API_KEY, NETWORK } from "@/constants";

export function WalletProvider({ children }: PropsWithChildren) {
  const { toast } = useToast();

  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      dappConfig={{
        network: NETWORK,
        aptosApiKeys: {
          [NETWORK]: APTOS_API_KEY,
        },
      }}
      optInWallets={[
        "Continue with Google",
        "Continue with Apple",
        "Petra",
        "Backpack",
        "Nightly",
        "OKX Wallet",
        "Bitget Wallet",
        "Gate Wallet",
        "Pontem Wallet",
      ]}
      onError={(error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error || "Unknown wallet error",
        });
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
