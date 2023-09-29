-- AlterTable
CREATE OR REPLACE FUNCTION notify_transactions_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('new_transaction_data', json_build_object(
      'id', NEW.id
  )::text);
  RETURN NEW;
END;
$function$;