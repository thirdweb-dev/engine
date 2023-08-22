CREATE OR REPLACE FUNCTION notify_transactions_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('new_transaction_data', row_to_json(NEW)::text);
  RETURN NEW;
END;
$function$;

-- Original Trigger returns all data
-- CREATE OR REPLACE FUNCTION notify_transactions_update()
--   RETURNS TRIGGER
--   LANGUAGE plpgsql
-- AS $function$
-- BEGIN
--   PERFORM pg_notify('updated_transaction_data', row_to_json(NEW)::text);
--   RETURN NEW;
-- END;
-- $function$;


-- New Trigger to return only specific data, to keep it under the size limit
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

-- New Trigger to check for payload size and return appropriate data
-- CREATE OR REPLACE FUNCTION notify_transactions_update()
--   RETURNS TRIGGER
--   LANGUAGE plpgsql
-- AS $function$
-- DECLARE
--     payload TEXT;
-- BEGIN
--     payload := row_to_json(NEW)::text;

--     IF length(payload) < 8000 THEN
--         PERFORM pg_notify('updated_transaction_data', payload);
--     ELSE
--         payload := json_build_object(
--           'identifier', NEW.identifier,
--           'txErrored', NEW.txErrored,
--           'errorMessage', NEW.errorMessage
--         )::text;
--         PERFORM pg_notify('updated_transaction_data', payload);
--     END IF;

--     RETURN NEW;
-- END;
-- $function$;