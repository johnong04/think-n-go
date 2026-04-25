-- SQL Functions for Agentic Liquidity Scenarios
-- Provides atomic money movement for settlement and BNPL minting

CREATE OR REPLACE FUNCTION fn_settle_contract_early(
    p_contract_id UUID,
    p_discount_rate NUMERIC
)
RETURNS JSON AS $$
DECLARE
    v_principal NUMERIC;
    v_merchant_id UUID;
    v_supplier_id UUID;
    v_accrued_interest NUMERIC;
    v_discount_amount NUMERIC;
    v_supplier_payout NUMERIC;
    v_merchant_rebate NUMERIC;
    v_status VARCHAR;
BEGIN
    -- 1. Lock and fetch contract
    SELECT principal_amount, merchant_id, supplier_id, status 
    INTO v_principal, v_merchant_id, v_supplier_id, v_status
    FROM contracts 
    WHERE id = p_contract_id 
    FOR UPDATE;

    IF v_status != 'FUNDED_INVESTED' AND v_status != 'FUNDED' THEN
        RAISE EXCEPTION 'Contract % is not in FUNDED/FUNDED_INVESTED state.', p_contract_id;
    END IF;

    -- 2. Fetch accrued interest from investment_ledger (or 0 if not found)
    SELECT COALESCE(accrued_interest, 0)
    INTO v_accrued_interest
    FROM investment_ledger
    WHERE contract_id = p_contract_id
    FOR UPDATE;

    -- 3. Calculate splits
    v_discount_amount := v_principal * p_discount_rate;
    v_supplier_payout := v_principal - v_discount_amount;
    v_merchant_rebate := v_discount_amount + v_accrued_interest;

    -- 4. Credit Supplier
    INSERT INTO wallets (id, user_id, role, balance, currency, updated_at)
    VALUES (gen_random_uuid(), v_supplier_id, 'SUPPLIER', v_supplier_payout, 'MYR', NOW())
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = wallets.balance + v_supplier_payout, updated_at = NOW();

    -- 5. Credit Merchant
    INSERT INTO wallets (id, user_id, role, balance, currency, updated_at)
    VALUES (gen_random_uuid(), v_merchant_id, 'MERCHANT', v_merchant_rebate, 'MYR', NOW())
    ON CONFLICT (user_id) DO UPDATE 
    SET balance = wallets.balance + v_merchant_rebate, updated_at = NOW();

    -- 6. Update Contract Status
    UPDATE contracts 
    SET status = 'SOLVED', solved_at = NOW()
    WHERE id = p_contract_id;

    RETURN json_build_object(
        'contract_id', p_contract_id,
        'status', 'SOLVED',
        'payout_to_supplier', v_supplier_payout,
        'rebate_to_merchant', v_merchant_rebate,
        'discount_captured', v_discount_amount
    );
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION fn_mint_bnpl_escrow(
    p_merchant_id UUID,
    p_supplier_id UUID,
    p_principal NUMERIC
)
RETURNS JSON AS $$
DECLARE
    v_credit_score INTEGER;
    v_contract_id UUID;
    v_yield_rate NUMERIC := 0.0350;
BEGIN
    -- 1. Check Merchant Credit Score
    SELECT credit_score INTO v_credit_score
    FROM merchants
    WHERE id = p_merchant_id;

    IF v_credit_score IS NULL OR v_credit_score <= 650 THEN
        RAISE EXCEPTION 'Merchant credit score % is insufficient for instant BNPL underwriting.', v_credit_score;
    END IF;

    -- 2. Create the Contract (Mints BNPL Escrow)
    INSERT INTO contracts (
        supplier_id, merchant_id, principal_amount, status, yield_rate, description, created_at
    ) VALUES (
        p_supplier_id, p_merchant_id, p_principal, 'FUNDED_INVESTED', v_yield_rate, 'Secured via MIXED_BNPL', NOW()
    ) RETURNING id INTO v_contract_id;

    -- 3. Create Investment Ledger (Mock GO+ mapping)
    INSERT INTO investment_ledger (
        contract_id, amount_held, daily_yield_rate, accrued_interest, last_accrual_date
    ) VALUES (
        v_contract_id, p_principal, v_yield_rate, 0, NOW()
    );

    RETURN json_build_object(
        'contract_id', v_contract_id,
        'status', 'FUNDED_INVESTED',
        'principal', p_principal,
        'funding_source', 'MIXED_BNPL'
    );
END;
$$ LANGUAGE plpgsql;
