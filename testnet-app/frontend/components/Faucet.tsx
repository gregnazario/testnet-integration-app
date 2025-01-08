import {useEffect, useState} from "react";
import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
// Internal components
import {toast} from "@/components/ui/use-toast";
import {aptosClient} from "@/utils/aptosClient";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {getCoinBalance, getFaBalance} from "@/view-functions/getAccountBalance";

export function Faucet() {
    const {account, signAndSubmitTransaction} = useWallet();
    const queryClient = useQueryClient();

    const [coinBalance, setCoinBalance] = useState<number>(0);
    const [faBalance, setFABalance] = useState<number>(0);
    const [recipient, setRecipient] = useState<string>();
    const [transferAmount, setTransferAmount] = useState<number>();
    const [isFa, setIsFa] = useState<boolean>(false);

    const {data} = useQuery({
        queryKey: ["apt-balance", account?.address],
        refetchInterval: 10_000,
        queryFn: async () => {
            try {
                if (account === null) {
                    console.error("Account not available");
                }

                const [coinBalance, faBalance] = await Promise.all([getCoinBalance({
                    type: "0xc41a43fe91e24dfb73a94d6a5cc9d388037819db72c651437c9615a64aa4dcb2::faucet::TestFaucetCoin",
                    accountAddress: account!.address
                }), getFaBalance({
                    metadataAddress: "0x5a1d9d10b81424cf06223dfbdfe6d26d6ba28fd02d6721ffb28b96c3e0cb8feb",
                    accountAddress: account!.address
                })]);

                return {
                    coinBalance,
                    faBalance
                };
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error,
                });
                return {
                    coinBalance: 0,
                    faBalance: 0
                };
            }
        },
    });

    const onClickButton = async () => {
        if (!account || !recipient || !transferAmount) {
            return;
        }

        if (!isFa) {
            try {
                const committedTransaction = await signAndSubmitTransaction(
                    {
                        data: {
                            function: "0xc41a43fe91e24dfb73a94d6a5cc9d388037819db72c651437c9615a64aa4dcb2::faucet::mint_coin_to",
                            typeArguments: [],
                            functionArguments: [recipient, Math.pow(10, 6) * transferAmount],
                        }
                    }
                );
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
        } else {
            try {
                const committedTransaction = await signAndSubmitTransaction(
                    {
                        data: {
                            function: "0xc41a43fe91e24dfb73a94d6a5cc9d388037819db72c651437c9615a64aa4dcb2::faucet::mint_fa_to",
                            typeArguments: [],
                            functionArguments: [recipient, Math.pow(10, 6) * transferAmount],
                        }
                    }
                );
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
        }
    };

    useEffect(() => {
        if (data) {
            setCoinBalance(data.coinBalance);
            setFABalance(data.faBalance);
        }
    }, [data]);

    return (
        <div className="flex flex-col gap-6">
            <h4 className="text-lg font-medium">Test Coin balance: {coinBalance / Math.pow(10, 8)}</h4>
            <h4 className="text-lg font-medium">Test FA balance: {faBalance / Math.pow(10, 8)}</h4>
            Type <div className="flex gap-4">
            <div className="flex items-center gap-2">
                <input
                    type="radio"
                    id="coin"
                    name="type"
                    checked={!isFa}
                    onChange={() => setIsFa(false)}
                />
                <label htmlFor="coin">Coin</label>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="radio"
                    id="fa"
                    name="type"
                    checked={isFa}
                    onChange={() => setIsFa(true)}
                />
                <label htmlFor="fa">FA</label>
            </div>
        </div>
            Recipient <Input disabled={!account} placeholder="0x1" onChange={(e) => setRecipient(e.target.value)}/>
            Amount (Max 100.000000) <Input disabled={!account} placeholder="100"
                                           onChange={(e) => setTransferAmount(parseFloat(e.target.value))}/>
            <Button
                disabled={!account || !recipient || !transferAmount || transferAmount <= 0}
                onClick={onClickButton}
            >
                Mint
            </Button>
        </div>
    );
}
