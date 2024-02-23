CREATE OR REPLACE FUNCTION notify_indexedcontracts_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('indexed_contracts_update', row_to_json(NEW)::text);
END;
$function$;

CREATE OR REPLACE TRIGGER indexedcontracts_update_trigger
  AFTER INSERT OR UPDATE ON "IndexedContracts"
  FOR EACH ROW 
  EXECUTE FUNCTION notify_indexedcontracts_update();