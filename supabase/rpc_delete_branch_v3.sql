-- ═══════════════════════════════════════════════════════════════════
-- RPC FUNCTION: delete_branch_v3
-- Purpose: Safely delete a branch with server-side dependency checks
-- to avoid timeouts and "zombie transactions"
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.delete_branch_v3(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    branch_id_arg TEXT;
    dependency_found TEXT;
BEGIN
    -- Extract branch_id from the JSON payload
    branch_id_arg := payload->>'branch_id';
    
    IF branch_id_arg IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'branch_id is required');
    END IF;

    -- 1. Check Profiles (Staff)
    IF EXISTS (SELECT 1 FROM profiles WHERE branch_id = branch_id_arg LIMIT 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete: Staff members are assigned to this branch');
    END IF;

    -- 2. Check Inventory (Products)
    IF EXISTS (SELECT 1 FROM inventory WHERE branch_id = branch_id_arg LIMIT 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete: Inventory items exist at this branch');
    END IF;

    -- 3. Check Sales
    IF EXISTS (SELECT 1 FROM sales WHERE branch_id = branch_id_arg LIMIT 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete: Sales records exist for this branch');
    END IF;
    
    -- 4. Check Expenses
    IF EXISTS (SELECT 1 FROM expenses WHERE branch_id = branch_id_arg LIMIT 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete: Expenses exist for this branch');
    END IF;

     -- 5. Check Attendance
    IF EXISTS (SELECT 1 FROM attendance WHERE branch_id = branch_id_arg LIMIT 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot delete: Attendance records exist for this branch');
    END IF;

    -- 6. Delete Branch
    DELETE FROM branches WHERE id = branch_id_arg;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant permissions (Essential for the function to be callable)
GRANT EXECUTE ON FUNCTION public.delete_branch_v3(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_branch_v3(JSONB) TO service_role;

-- Force schema cache reload (Optional, but good practice)
NOTIFY pgrst, 'reload config';
