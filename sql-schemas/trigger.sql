-- Create the trigger on the transactions table
CREATE TRIGGER transactions_insert_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_transactions_insert();