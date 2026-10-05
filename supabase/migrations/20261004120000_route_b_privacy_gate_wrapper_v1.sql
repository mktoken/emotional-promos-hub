-- RB3-B: wrapper server-side para activar el privacy gate de Route B.
-- Esta migración no modifica la lógica del core: solo lo renombra cuando
-- todavía existe con el nombre original y delega desde el boundary protegido.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure(
       'public.submit_project_brief_internal_core(uuid,text,jsonb,text,text,boolean)'
     ) IS NULL
     AND to_regprocedure(
       'public.submit_project_brief_internal(uuid,text,jsonb,text,text,boolean)'
     ) IS NOT NULL
  THEN
    EXECUTE '
      ALTER FUNCTION public.submit_project_brief_internal(
        uuid, text, jsonb, text, text, boolean
      ) RENAME TO submit_project_brief_internal_core
    ';
  END IF;

  IF to_regprocedure(
       'public.submit_project_brief_internal_core(uuid,text,jsonb,text,text,boolean)'
     ) IS NULL
  THEN
    RAISE EXCEPTION
      'submit_project_brief_internal_core is required before creating the privacy wrapper';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION
  public.submit_project_brief_internal_core(uuid, text, jsonb, text, text, boolean)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_project_brief_internal(
  p_request_id uuid,
  p_request_fingerprint text,
  p_datos_cliente jsonb,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_privacy_consent boolean DEFAULT false
)
RETURNS TABLE (
  quote_id uuid,
  result text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  PERFORM pg_catalog.set_config('app.pe_privacy_active', 'true', true);
  PERFORM pg_catalog.set_config('app.pe_privacy_version', 'PE-PRIVACY-V1', true);
  PERFORM pg_catalog.set_config('app.pe_privacy_url', '/aviso-de-privacidad', true);

  RETURN QUERY
  SELECT *
  FROM public.submit_project_brief_internal_core(
    p_request_id,
    p_request_fingerprint,
    p_datos_cliente,
    p_email,
    p_phone,
    p_privacy_consent
  );
END;
$function$;

REVOKE ALL ON FUNCTION
  public.submit_project_brief_internal(uuid, text, jsonb, text, text, boolean)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.submit_project_brief_internal(uuid, text, jsonb, text, text, boolean)
TO service_role;

COMMENT ON FUNCTION
  public.submit_project_brief_internal(uuid, text, jsonb, text, text, boolean)
IS
  'Boundary server-side de Route B: fija PE-PRIVACY-V1 y delega al core sin cambiar idempotencia, rate limit ni persistencia.';

COMMIT;
