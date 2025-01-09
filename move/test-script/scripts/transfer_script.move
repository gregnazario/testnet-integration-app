/// xxd -c 1000000 -p build/test-script/bytecode_scripts/transfer.mv
script {
    use aptos_framework::aptos_account;

    /// Test script
    fun transfer(caller: &signer, receiver: address, amount: u64) {
        aptos_account::transfer(caller, receiver, amount);
    }
}