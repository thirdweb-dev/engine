CREATE OR REPLACE FUNCTION notify_transactions_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('new_transaction_data', row_to_json(NEW)::text);
  RETURN NEW;
END;
$function$;
