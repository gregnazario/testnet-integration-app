import { aptosClient } from "@/utils/aptosClient";

export type GetCoinBalanceArgs = {
  type: string;
  accountAddress: string;
};

export const getCoinBalance = async (args: GetCoinBalanceArgs): Promise<bigint> => {
  const { accountAddress, type } = args;
  try {
    const balance = await aptosClient().view<[string]>({
      payload: {
        function: "0x1::coin::balance",
        typeArguments: [type],
        functionArguments: [accountAddress],
      },
    });
    return BigInt(balance[0]);
  } catch (e) {
    return 0n;
  }
};

export type GetFABalanceArgs = {
  metadataAddress: string;
  accountAddress: string;
};

export const getFaBalance = async (args: GetFABalanceArgs): Promise<bigint> => {
  const { accountAddress, metadataAddress } = args;
  try {
    const balance = await aptosClient().view<[string]>({
      payload: {
        function: "0x1::primary_fungible_store::balance",
        typeArguments: ["0x1::object::ObjectCore"],
        functionArguments: [accountAddress, metadataAddress],
      },
    });
    return BigInt(balance[0]);
  } catch (e) {
    console.log("ERROR:", e);
    return 0n;
  }
};
