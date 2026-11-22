-- Create dmhoa_case_outputs table for storing AI-generated outputs and extracted data
CREATE TABLE IF NOT EXISTS dmhoa_case_outputs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id uuid REFERENCES dmhoa_cases(id) ON DELETE CASCADE,
    case_token text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),

    -- AI-generated outputs (JSON)
    outputs jsonb,

    -- Fine tracking fields (extracted from violation notice)
    fine_per_day numeric,
    fine_start_date date,

    -- Metadata
    model text,
    prompt_version text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(case_token)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dmhoa_case_outputs_case_token ON dmhoa_case_outputs(case_token);
CREATE INDEX IF NOT EXISTS idx_dmhoa_case_outputs_case_id ON dmhoa_case_outputs(case_id);
CREATE INDEX IF NOT EXISTS idx_dmhoa_case_outputs_status ON dmhoa_case_outputs(status);

-- Enable RLS
ALTER TABLE dmhoa_case_outputs ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role can manage dmhoa_case_outputs" ON dmhoa_case_outputs
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE dmhoa_case_outputs IS 'Stores AI-generated case outputs including fine tracking data extracted from violation notices';
COMMENT ON COLUMN dmhoa_case_outputs.fine_per_day IS 'Daily fine amount extracted from the violation notice';
COMMENT ON COLUMN dmhoa_case_outputs.fine_start_date IS 'Date when fines started accruing per the violation notice';
