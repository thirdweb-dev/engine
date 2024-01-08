-- Configuration Triggers
CREATE OR REPLACE FUNCTION notify_configuration_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('new_configuration_data', row_to_json(NEW)::text);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION notify_configuration_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('updated_configuration_data', json_build_object(
      'id', NEW.id
  )::text);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER configuration_insert_trigger
  AFTER INSERT ON configuration
  FOR EACH ROW
  EXECUTE FUNCTION notify_configuration_insert();

CREATE OR REPLACE TRIGGER configuration_update_trigger
  AFTER UPDATE ON configuration
  FOR EACH ROW
  EXECUTE FUNCTION notify_configuration_update();

-- Webhooks Triggers
CREATE OR REPLACE FUNCTION notify_webhooks_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('new_webhook_data', row_to_json(NEW)::text);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION notify_webhooks_update()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM pg_notify('updated_webhook_data', json_build_object(
      'id', NEW.id
  )::text);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER webhooks_insert_trigger
  AFTER INSERT ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhooks_insert();

CREATE OR REPLACE TRIGGER webhooks_update_trigger
  AFTER UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION notify_webhooks_update();