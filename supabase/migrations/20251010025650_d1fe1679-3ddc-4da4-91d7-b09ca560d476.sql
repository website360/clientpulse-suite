-- Add occurrence fields to accounts_receivable table
ALTER TABLE accounts_receivable
ADD COLUMN occurrence_type text CHECK (occurrence_type IN ('unica', 'mensal', 'trimestral', 'semestral', 'anual', 'parcelada')) DEFAULT 'unica',
ADD COLUMN due_day integer,
ADD COLUMN installments integer,
ADD COLUMN installment_number integer,
ADD COLUMN total_installments integer,
ADD COLUMN parent_receivable_id uuid REFERENCES accounts_receivable(id) ON DELETE CASCADE,
ADD COLUMN issue_date date;

-- Add comment for clarity
COMMENT ON COLUMN accounts_receivable.occurrence_type IS 'Type of occurrence: unica, mensal, trimestral, semestral, anual, parcelada';
COMMENT ON COLUMN accounts_receivable.due_day IS 'Day of month for recurring charges (1-31)';
COMMENT ON COLUMN accounts_receivable.installments IS 'Number of installments for parcelada';
COMMENT ON COLUMN accounts_receivable.installment_number IS 'Current installment number';
COMMENT ON COLUMN accounts_receivable.total_installments IS 'Total number of installments';
COMMENT ON COLUMN accounts_receivable.parent_receivable_id IS 'Reference to parent receivable if this is a generated charge';
COMMENT ON COLUMN accounts_receivable.issue_date IS 'Issue date of the receivable';