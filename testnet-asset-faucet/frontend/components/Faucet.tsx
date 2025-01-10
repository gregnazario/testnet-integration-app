import { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// Internal components
import { toast } from "@/components/ui/use-toast";
import { aptosClient } from "@/utils/aptosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCoinBalance, getFaBalance } from "@/view-functions/getAccountBalance";

export enum CoinType {
  USDT = "usdc",
  USDC = "usdt",
  APT = "apt",
}

export type Balances = {
  aptBalance: bigint;
  usdtBalance: bigint;
  usdcBalance: bigint;
};

function displayWithDecimals(balance: bigint, decimals: number) {
  const balString = balance.toString();
  if (decimals === 0) return balString;

  if (balString.length <= decimals) {
    return "0." + "0".repeat(decimals - balString.length) + balString;
  }

  return balString.slice(0, -decimals) + "." + balString.slice(-decimals);
}

export function Faucet() {
  const { account, signAndSubmitTransaction } = useWallet();
  const queryClient = useQueryClient();

  const [balance, setBalance] = useState<Balances>({ aptBalance: 0n, usdtBalance: 0n, usdcBalance: 0n });
  const [recipient, setRecipient] = useState<string>();
  const [transferAmount, setTransferAmount] = useState<number>();
  const [coinSymbol, setCoinSymbol] = useState<string>(CoinType.USDT);

  const { data } = useQuery({
    queryKey: ["balances", account?.address],
    refetchInterval: 10_000,
    queryFn: async () => {
      try {
        if (account === null || account === undefined) {
          console.error("Account not available");
        }

        // Fetch all balances
        const [aptBalance, usdtBalance, usdcBalance] = await Promise.all([
          getCoinBalance({
            type: "0x1::aptos_coin::AptosCoin",
            accountAddress: account!.address,
          }),
          getFaBalance({
            metadataAddress: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050",
            accountAddress: account!.address,
          }),
          getFaBalance({
            metadataAddress: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
            accountAddress: account!.address,
          }),
        ]);
        return {
          balances: {
            aptBalance,
            usdtBalance,
            usdcBalance,
          },
        };
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
        return {
          balances: {
            aptBalance: 0n,
            usdtBalance: 0n,
            usdcBalance: 0n,
          },
        };
      }
    },
  });

  const onClickButton = async () => {
    if (!account || !recipient || !transferAmount) {
      return;
    }

    try {
      let committedTransaction: { hash: string } | null = null;
      switch (coinSymbol.toLowerCase()) {
        case CoinType.USDT:
          committedTransaction = await signAndSubmitTransaction({
            data: {
              function: "0x24246c14448a5994d9f23e3b978da2a354e64b6dfe54220debb8850586c448cc::usdt::faucet_to_address",
              typeArguments: [],
              functionArguments: [recipient, 6 * transferAmount],
            },
          });
          break;
        // These below need special faucets
        case CoinType.USDC:
        case CoinType.APT:
        default:
      }
      if (committedTransaction === null) {
        toast({
          title: "Error",
          description: `Unsupported coin type ${coinSymbol}`,
        });
        return;
      }

      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });
      await queryClient.invalidateQueries();
      toast({
        title: "Success",
        description: `Transaction succeeded, hash: ${executedTransaction.hash}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (data?.balances) {
      setBalance(data.balances);
    }
  }, [data]);

  let coinDetails = null;
  switch (coinSymbol) {
    case CoinType.USDT:
      coinDetails = (
        <>
          <h4 className="text-lg font-medium">USDT Balance: {displayWithDecimals(balance.usdtBalance, 6)}</h4>
          Recipient <Input disabled={!account} placeholder="0x1" onChange={(e) => setRecipient(e.target.value)} />
          Amount (Max 10.000000){" "}
          <Input disabled={!account} placeholder="10" onChange={(e) => setTransferAmount(parseFloat(e.target.value))} />
          <Button disabled={!account || !recipient || !transferAmount || transferAmount <= 0} onClick={onClickButton}>
            Mint
          </Button>
        </>
      );
      break;
    case CoinType.USDC:
      coinDetails = (
        <>
          <h4 className="text-lg font-medium">USDC Balance: {displayWithDecimals(balance.usdcBalance, 6)}</h4>
          <Button onClick={() => window.open("https://faucet.circle.com/", "_blank")}>{"Visit USDC's faucet"}</Button>
        </>
      );
      break;
    case CoinType.APT:
      coinDetails = (
        <>
          <h4 className="text-lg font-medium">APT Balance: {displayWithDecimals(balance.aptBalance, 8)}</h4>
          <Button onClick={() => window.open("https://aptos.dev/en/network/faucet", "_blank")}>
            {"Visit APT's faucet"}
          </Button>
        </>
      );
      break;
  }

  return (
    <div className="flex flex-col gap-6">
      Choose an asset
      <select
        value={coinSymbol}
        defaultValue={coinSymbol}
        onChange={(e) => setCoinSymbol(e.target.value)}
        className="border border-gray-300 rounded-md"
      >
        <option value={CoinType.USDT}>USDT</option>
        <option value={CoinType.USDC}>USDC</option>
        <option value={CoinType.APT}>APT</option>
      </select>
      {coinDetails}
    </div>
  );
}
