import { aptosClient } from "@/utils/aptosClient";

export type GetCoinBalanceArgs = {
  type: string;
  accountAddress: string;
};

export const getCoinBalance = async (args: GetCoinBalanceArgs): Promise<number> => {
  const { accountAddress, type } = args;
  try {
    const balance = await aptosClient().view<[number]>({
      payload: {
        function: "0x1::coin::balance",
        typeArguments: [type],
        functionArguments: [accountAddress],
      },
    });
    return balance[0];
  } catch (e) {
    return 0;
  }
};

export type GetFABalanceArgs = {
  metadataAddress: string;
  accountAddress: string;
};

export const getFaBalance = async (args: GetFABalanceArgs): Promise<number> => {
  const { accountAddress, metadataAddress } = args;
  try {
    const balance = await aptosClient().view<[number]>({
      payload: {
        function: "0x1::primary_fungible_store::balance",
        typeArguments: [],
        functionArguments: [metadataAddress, accountAddress],
      },
    });
    return balance[0];
  } catch (e) {
    return 0;
  }
};
