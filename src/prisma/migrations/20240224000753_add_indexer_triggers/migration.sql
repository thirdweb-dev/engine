CREATE OR REPLACE FUNCTION notify_indexedcontracts_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('indexed_contracts_events', json_build_object('op', 'INSERT', 'data', row_to_json(NEW))::text);
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION notify_indexedcontracts_delete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('indexed_contracts_events', json_build_object('op', 'DELETE', 'data', row_to_json(OLD))::text);
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE TRIGGER indexedcontracts_insert_trigger
  AFTER INSERT ON "IndexedContracts"
  FOR EACH ROW 
  EXECUTE FUNCTION notify_indexedcontracts_insert();

CREATE OR REPLACE TRIGGER indexedcontracts_delete_trigger
  AFTER DELETE ON "IndexedContracts"
  FOR EACH ROW 
  EXECUTE FUNCTION notify_indexedcontracts_delete();
