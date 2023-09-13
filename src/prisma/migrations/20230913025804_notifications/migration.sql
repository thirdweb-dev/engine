-- 
CREATE OR REPLACE FUNCTION notify_transactions_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('new_transaction_data', row_to_json(NEW)::text);
  RETURN NEW;
END;
$function$;

-- Trigger to return only specific column, to keep it under the size limit
CREATE OR REPLACE FUNCTION notify_transactions_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('updated_transaction_data', json_build_object(
      'id', NEW.id
  )::text);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER transactions_insert_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_transactions_insert();

CREATE OR REPLACE TRIGGER transactions_update_trigger
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_transactions_update();
