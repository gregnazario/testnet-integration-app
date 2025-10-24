import { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// Internal components
import { toast } from "@/components/ui/use-toast";
import { aptosClient } from "@/utils/aptosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCoinBalance, getFaBalance } from "@/view-functions/getAccountBalance";

// Token Logo Component
function TokenLogo({ token, size = 24 }: { token: CoinType; size?: number }) {
  const logoFiles = {
    [CoinType.APT]: "/aptos.png",
    [CoinType.USDT]: "/usdt.svg",
    [CoinType.USDC]: "/usdc.svg",
    [CoinType.USDE]: "/usde.svg",
    [CoinType.SUSDE]: "/susde.png",
  };

  const logoFile = logoFiles[token as keyof typeof logoFiles];

  if (logoFile) {
    return (
      <img
        src={logoFile}
        alt={token}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }

  // Fallback for any unmapped tokens
  return (
    <div
      className="rounded-full flex items-center justify-center text-white text-xs font-bold bg-gray-500"
      style={{ width: size, height: size }}
    >
      {token.charAt(0)}
    </div>
  );
}

export enum CoinType {
  USDT = "USDt",
  USDE = "USDe",
  SUSDE = "sUSDe",
  USDC = "USDC",
  APT = "APT",
}

export type Balances = {
  aptBalance: bigint;
  usdtBalance: bigint;
  usdcBalance: bigint;
  usdeBalance: bigint;
  susdeBalance: bigint;
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

  const [balance, setBalance] = useState<Balances>({
    aptBalance: 0n,
    usdtBalance: 0n,
    usdcBalance: 0n,
    usdeBalance: 0n,
    susdeBalance: 0n,
  });
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
        const [aptBalance, usdtBalance, usdcBalance, usdeBalance, susdeBalance] = await Promise.all([
          getCoinBalance({
            type: "0x1::aptos_coin::AptosCoin",
            accountAddress: account!.address.toString(),
          }),
          getFaBalance({
            metadataAddress: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050",
            accountAddress: account!.address.toString(),
          }),
          getFaBalance({
            metadataAddress: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
            accountAddress: account!.address.toString(),
          }),
          getFaBalance({
            metadataAddress: "0xce0d439eac6f53be3f295c7f370e2a0c168f07fb17c4cc7773b7e1571f5b8490",
            accountAddress: account!.address.toString(),
          }),
          getFaBalance({
            metadataAddress: "0x8e67e42c4ff61e16dca908b737d1260b312143c1f7ba1577309f075a27cb4d90",
            accountAddress: account!.address.toString(),
          }),
        ]);
        return {
          balances: {
            aptBalance,
            usdtBalance,
            usdcBalance,
            usdeBalance,
            susdeBalance,
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
            usdeBalance: 0n,
            susdeBalance: 0n,
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
      switch (coinSymbol) {
        case CoinType.USDT:
          committedTransaction = await signAndSubmitTransaction({
            data: {
              function: "0x24246c14448a5994d9f23e3b978da2a354e64b6dfe54220debb8850586c448cc::usdt::faucet_to_address",
              typeArguments: [],
              functionArguments: [recipient, transferAmount * 10 ** 6],
            },
          });
          break;
        case CoinType.USDE:
        case CoinType.SUSDE:
          committedTransaction = await signAndSubmitTransaction({
            data: {
              function: "0xc7a799e2b03f3ffa3ed4239ab9ecec797cc97d51fbee2cb7bf93eb201f356b36::token_factory::mint",
              typeArguments: [],
              functionArguments: [coinSymbol, transferAmount * 10 ** 6, recipient],
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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TokenLogo token={CoinType.USDT} size={24} />
            <h4 className="text-lg font-medium text-card-foreground">USDT Balance: {displayWithDecimals(balance.usdtBalance, 6)}</h4>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Recipient</label>
            <Input disabled={!account} placeholder="0x1" onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount (Max 10.000000)</label>
            <Input disabled={!account} placeholder="10" onChange={(e) => setTransferAmount(parseFloat(e.target.value))} />
          </div>
          <Button disabled={!account || !recipient || !transferAmount || transferAmount <= 0} onClick={onClickButton}>
            Mint
          </Button>
        </div>
      );
      break;
    case CoinType.USDC:
      coinDetails = (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TokenLogo token={CoinType.USDC} size={24} />
            <h4 className="text-lg font-medium text-card-foreground">USDC Balance: {displayWithDecimals(balance.usdcBalance, 6)}</h4>
          </div>
          <Button onClick={() => window.open("https://faucet.circle.com/", "_blank")}>{"Visit USDC's faucet"}</Button>
        </div>
      );
      break;
    case CoinType.USDE:
      coinDetails = (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TokenLogo token={CoinType.USDE} size={24} />
            <h4 className="text-lg font-medium text-card-foreground">USDe Balance: {displayWithDecimals(balance.usdeBalance, 6)}</h4>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Recipient</label>
            <Input disabled={!account} placeholder="0x1" onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount (Max 10.000000)</label>
            <Input disabled={!account} placeholder="10" onChange={(e) => setTransferAmount(parseFloat(e.target.value))} />
          </div>
          <Button disabled={!account || !recipient || !transferAmount || transferAmount <= 0} onClick={onClickButton}>
            Mint
          </Button>
        </div>
      );
      break;
    case CoinType.SUSDE:
      coinDetails = (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TokenLogo token={CoinType.SUSDE} size={24} />
            <h4 className="text-lg font-medium text-card-foreground">sUSDe Balance: {displayWithDecimals(balance.susdeBalance, 6)}</h4>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Recipient</label>
            <Input disabled={!account} placeholder="0x1" onChange={(e) => setRecipient(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Amount (Max 10.000000)</label>
            <Input disabled={!account} placeholder="10" onChange={(e) => setTransferAmount(parseFloat(e.target.value))} />
          </div>
          <Button disabled={!account || !recipient || !transferAmount || transferAmount <= 0} onClick={onClickButton}>
            Mint
          </Button>
        </div>
      );
      break;
    case CoinType.APT:
      coinDetails = (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TokenLogo token={CoinType.APT} size={24} />
            <h4 className="text-lg font-medium text-card-foreground">APT Balance: {displayWithDecimals(balance.aptBalance, 8)}</h4>
          </div>
          <Button onClick={() => window.open("https://aptos.dev/en/network/faucet", "_blank")}>
            {"Visit the APT testnet faucet"}
          </Button>
        </div>
      );
      break;
  }

  return (
    <div className="flex flex-col gap-6 p-6 bg-card border border-border rounded-lg shadow-sm">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Choose an asset</label>
        <div className="relative">
          <select
            value={coinSymbol}
            defaultValue={coinSymbol}
            onChange={(e) => setCoinSymbol(e.target.value)}
            className="w-full pl-12 pr-10 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent appearance-none"
          >
            <option value={CoinType.USDT}>USDt</option>
            <option value={CoinType.USDC}>USDC</option>
            <option value={CoinType.USDE}>USDe</option>
            <option value={CoinType.SUSDE}>sUSDe</option>
            <option value={CoinType.APT}>APT</option>
          </select>
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <TokenLogo token={coinSymbol as CoinType} size={20} />
          </div>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {coinDetails}
      </div>
    </div>
  );
}
