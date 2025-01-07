/// Test faucet module
///
/// This module provides a faucet for minting coins and fungible assets for testing purposes.
/// The faucet is used to mint coins and fungible assets to a given address.
/// These have no value and are used for testing purposes only.
/// This can be burned at any time.
module test_faucet_addr::faucet {

    use std::option;
    use std::signer;
    use std::string::utf8;
    use aptos_framework::aptos_account;
    use aptos_framework::coin;
    use aptos_framework::fungible_asset;
    use aptos_framework::object;
    use aptos_framework::object::{create_sticky_object, Object};
    use aptos_framework::primary_fungible_store;

    const MAX_MINT: u64 = 100000000; // 100 full coins / assets

    /// Over max mint amount, can only mint 100.000000
    const E_OVER_MAX_AMOUNT: u64 = 1;

    /// Admin only allowed to burn
    const E_NOT_ADMIN: u64 = 2;

    const ADMIN: address = @0xc67545d6f3d36ed01efc9b28cbfd0c1ae326d5d262dd077a29539bcee0edce9e;

    struct TestFaucetCoin {}

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Management of faucet coins
    struct ManagementObject has key {
        extend_ref: object::ExtendRef,
        coin_burn_cap: coin::BurnCapability<TestFaucetCoin>,
        coin_mint_cap: coin::MintCapability<TestFaucetCoin>,
        fa_burn_ref: fungible_asset::BurnRef,
        fa_mint_ref: fungible_asset::MintRef
    }

    /// Address to the fungible asset
    struct FaucetObjectRef has key {
        ref: address
    }

    fun init_module(deployer: &signer) {
        let deployer_address = signer::address_of(deployer);
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<TestFaucetCoin>(
            deployer,
            utf8(b"Test Faucet Coin"),
            utf8(b"TFC"),
            6,
            true
        );
        coin::destroy_freeze_cap(freeze_cap);

        let const_ref = create_sticky_object(deployer_address);
        let extend_ref = object::generate_extend_ref(&const_ref);
        let object_signer = object::generate_signer(&const_ref);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &const_ref,
            option::none(),
            utf8(b"Test Faucet Fungible Asset"),
            utf8(b"TFFA"),
            6,
            utf8(b""),
            utf8(b""),
        );

        let mint_ref = fungible_asset::generate_mint_ref(&const_ref);
        let burn_ref = fungible_asset::generate_burn_ref(&const_ref);

        move_to<ManagementObject>(&object_signer, ManagementObject {
            extend_ref,
            coin_burn_cap: burn_cap,
            coin_mint_cap: mint_cap,
            fa_burn_ref: burn_ref,
            fa_mint_ref: mint_ref
        });

        move_to(deployer, FaucetObjectRef {
            ref: object::address_from_constructor_ref(&const_ref)
        })
    }

    /// Mints test coins
    entry fun mint_coin_to(
        _caller: &signer,
        receiver: address,
        amount: u64
    ) acquires ManagementObject, FaucetObjectRef {
        // Let anyone mint, amount must be less than MAX_MINT
        assert!(amount <= MAX_MINT, E_OVER_MAX_AMOUNT);

        let obj_addr = borrow_global<FaucetObjectRef>(@test_faucet_addr).ref;
        let mint_cap = &borrow_global<ManagementObject>(obj_addr).coin_mint_cap;
        let coins = coin::mint(amount, mint_cap);
        aptos_account::deposit_coins(receiver, coins);
    }

    /// Mints Fungible asset coins
    entry fun mint_fa_to(_caller: &signer, receiver: address, amount: u64) acquires FaucetObjectRef, ManagementObject {
        // Let anyone mint, amount must be less than MAX_MINT
        assert!(amount <= MAX_MINT, E_OVER_MAX_AMOUNT);

        let obj_addr = borrow_global<FaucetObjectRef>(@test_faucet_addr).ref;
        let mint_ref = &borrow_global<ManagementObject>(obj_addr).fa_mint_ref;
        primary_fungible_store::mint(mint_ref, receiver, amount);
    }

    entry fun burn_coin_from(
        caller: &signer,
        user: address,
        amount: u64
    ) acquires ManagementObject, FaucetObjectRef {
        let caller_address = signer::address_of(caller);
        assert!(caller_address == ADMIN, E_NOT_ADMIN);

        let obj_addr = borrow_global<FaucetObjectRef>(@test_faucet_addr).ref;
        let burn_cap = &borrow_global<ManagementObject>(obj_addr).coin_burn_cap;
        coin::burn_from(user, amount, burn_cap);
    }

    entry fun burn_fa_from(caller: &signer, user: address, amount: u64) acquires FaucetObjectRef, ManagementObject {
        let caller_address = signer::address_of(caller);
        assert!(caller_address == ADMIN, E_NOT_ADMIN);

        let obj_addr = borrow_global<FaucetObjectRef>(@test_faucet_addr).ref;
        let burn_ref = &borrow_global<ManagementObject>(obj_addr).fa_burn_ref;
        primary_fungible_store::burn(burn_ref, user, amount);
    }

    entry fun burn_fa_from_store<T: key>(
        caller: &signer,
        store: Object<T>,
        amount: u64
    ) acquires FaucetObjectRef, ManagementObject {
        let caller_address = signer::address_of(caller);
        assert!(caller_address == ADMIN, E_NOT_ADMIN);

        let obj_addr = borrow_global<FaucetObjectRef>(@test_faucet_addr).ref;
        let burn_ref = &borrow_global<ManagementObject>(obj_addr).fa_burn_ref;
        fungible_asset::burn_from(burn_ref, store, amount);
    }
}