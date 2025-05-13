/// A simple canonical token factory for testing
module token_factory_address::token_factory {
    use std::option::{Self, Option};
    use std::signer;
    use std::string::String;
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_framework::fungible_asset;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;

    /// The address of the FA is already registered for this symbol
    const E_FA_ALREADY_EXISTS: u64 = 1;

    /// The address of the FA is not registered for this symbol
    const E_FA_NOT_FOUND: u64 = 2;

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Keeps track of registered FAs
    struct FARegistry has key {
        by_symbol: SmartTable<String, address>
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Holds the refs to mint, burn, etc
    enum FARefs has key {
        V1 {
            extend_ref: object::ExtendRef,
            obj_transfer_ref: object::TransferRef,
            mint_ref: fungible_asset::MintRef,
            transfer_ref: fungible_asset::TransferRef,
            burn_ref: fungible_asset::BurnRef
        }
    }

    /// Initialize the lookup table
    fun init_module(publisher: &signer) {
        move_to(publisher, FARegistry {
            by_symbol: smart_table::new()
        });
    }

    /// Creates an FA for testing, with a built in faucet
    ///
    /// Note that it is permissionless, so anyone can create the canonical version
    public entry fun create_test_fa(
        caller: &signer,
        decimals: u8,
        name: String,
        symbol: String,
        icon_uri: String,
        project_uri: String
    ) acquires FARegistry {
        // Create sticky object, as it's required for FA
        let caller_address = signer::address_of(caller);
        let const_ref = object::create_sticky_object(caller_address);

        // Add to the registry
        let obj_address = object::address_from_constructor_ref(&const_ref);
        let registry = &mut FARegistry[@token_factory_address].by_symbol;
        assert!(!registry.contains(symbol), E_FA_ALREADY_EXISTS);
        registry.add(symbol, obj_address);

        // To ensure that this object is only controlled by this contract, move the object to be owned by this contract
        let extend_ref = object::generate_extend_ref(&const_ref);
        let obj_transfer_ref = object::generate_transfer_ref(&const_ref);
        let linear_transfer_ref = object::generate_linear_transfer_ref(&obj_transfer_ref);
        object::transfer_with_ref(linear_transfer_ref, @token_factory_address);

        // Create asset
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            &const_ref,
            option::none(),
            name,
            symbol,
            decimals,
            icon_uri,
            project_uri,
        );
        let mint_ref = fungible_asset::generate_mint_ref(&const_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(&const_ref);
        let burn_ref = fungible_asset::generate_burn_ref(&const_ref);

        let object_signer = object::generate_signer(&const_ref);
        move_to(&object_signer, FARefs::V1 {
            extend_ref,
            obj_transfer_ref,
            mint_ref,
            transfer_ref,
            burn_ref
        });
    }

    #[view]
    /// Looks up an FA address
    public fun fa_address(
        symbol: String,
    ): Option<address> acquires FARegistry {
        let registry = &FARegistry[@token_factory_address].by_symbol;
        if (registry.contains(symbol)) {
            option::some(*registry.borrow(symbol))
        } else {
            option::none()
        }
    }

    /// Mints the number of tokens to the address (primary store only)
    entry fun mint(
        _caller: &signer,
        symbol: String,
        amount: u64,
        destination: address,
    ) acquires FARefs, FARegistry {
        let fa_metadata = fa_address(symbol);
        assert!(fa_metadata.is_some(), E_FA_NOT_FOUND);
        let fa_refs = &FARefs[fa_metadata.destroy_some()];
        primary_fungible_store::mint(&fa_refs.mint_ref, destination, amount);
    }

    /// Burns the number of tokens from the address (primary store only)
    entry fun burn(
        _caller: &signer,
        symbol: String,
        amount: u64,
        destination: address,
    ) acquires FARefs, FARegistry {
        let fa_metadata = fa_address(symbol);
        assert!(fa_metadata.is_some(), E_FA_NOT_FOUND);
        let fa_refs = &FARefs[fa_metadata.destroy_some()];
        primary_fungible_store::burn(&fa_refs.burn_ref, destination, amount);
    }

    /// Mints the number of tokens to the address (primary store only)
    entry fun mint_by_object(
        _caller: &signer,
        fa_metadata: Object<FARefs>,
        amount: u64,
        destination: address,
    ) acquires FARefs {
        let fa_refs = get_fa_refs(fa_metadata);
        primary_fungible_store::mint(&fa_refs.mint_ref, destination, amount);
    }

    /// Burns the number of tokens from the address (primary store only)
    entry fun burn_by_object(
        _caller: &signer,
        fa_metadata: Object<FARefs>,
        amount: u64,
        destination: address,
    ) acquires FARefs {
        let fa_refs = get_fa_refs(fa_metadata);
        primary_fungible_store::burn(&fa_refs.burn_ref, destination, amount);
    }

    inline fun get_fa_refs(
        fa_metadata: Object<FARefs>
    ): &FARefs {
        let metadata_address = object::object_address(&fa_metadata);
        &FARefs[metadata_address]
    }

    inline fun get_fa_refs_from_address(
        fa_metadata: address
    ): &FARefs {
        &FARefs[fa_metadata]
    }
}
