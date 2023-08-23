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
      'identifier', NEW.identifier
  )::text);
  RETURN NEW;
END;
$function$;
