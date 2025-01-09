import { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// Internal components
import { toast } from "@/components/ui/use-toast";
import { aptosClient } from "@/utils/aptosClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCoinBalance } from "@/view-functions/getAccountBalance";
import { AccountAddress, U64 } from "@aptos-labs/ts-sdk";

const transferScript =
  "0xa11ceb0b0700000a05010002030206050806070e17082520000000010001000103060c0503000d6170746f735f6163636f756e74087472616e736665720000000000000000000000000000000000000000000000000000000000000001000001050b000b010b02110002";

export function ScriptTest() {
  const { account, signAndSubmitTransaction } = useWallet();
  const queryClient = useQueryClient();

  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [recipient, setRecipient] = useState<string>();
  const [transferAmount, setTransferAmount] = useState<number>();

  const { data } = useQuery({
    queryKey: ["apt-balance", account?.address],
    refetchInterval: 10_000,
    queryFn: async () => {
      try {
        if (account === null) {
          console.error("Account not available");
        }

        const coinBalance = await getCoinBalance({
          type: "0x::aptos_coin::AptosCoin",
          accountAddress: account!.address,
        });

        return {
          coinBalance,
        };
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error,
        });
        return {
          coinBalance: 0,
          faBalance: 0,
        };
      }
    },
  });

  const onClickButton = async () => {
    if (!account || !recipient || !transferAmount) {
      return;
    }

    try {
      const committedTransaction = await signAndSubmitTransaction({
        data: {
          bytecode: transferScript,
          typeArguments: [],
          functionArguments: [AccountAddress.from(recipient), new U64(Math.pow(10, 6) * transferAmount)],
        },
      });
      const executedTransaction = await aptosClient().waitForTransaction({
        transactionHash: committedTransaction.hash,
      });
      queryClient.invalidateQueries();
      toast({
        title: "Success",
        description: `Transaction succeeded, hash: ${executedTransaction.hash}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (data) {
      setCoinBalance(data.coinBalance);
    }
  }, [data]);

  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-lg font-medium">APT: {coinBalance / Math.pow(10, 8)}</h4>
      Recipient <Input disabled={!account} placeholder="0x1" onChange={(e) => setRecipient(e.target.value)} />
      Amount (Max 100.000000){" "}
      <Input disabled={!account} placeholder="100" onChange={(e) => setTransferAmount(parseFloat(e.target.value))} />
      <Button disabled={!account || !recipient || !transferAmount || transferAmount <= 0} onClick={onClickButton}>
        Mint
      </Button>
    </div>
  );
}
