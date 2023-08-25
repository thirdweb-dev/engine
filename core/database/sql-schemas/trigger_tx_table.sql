CREATE OR REPLACE TRIGGER transactions_insert_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_transactions_insert();

CREATE OR REPLACE TRIGGER transactions_update_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_transactions_update();
