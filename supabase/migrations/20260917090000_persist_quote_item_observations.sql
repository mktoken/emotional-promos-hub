-- Persistencia compatible de observaciones por producto en solicitudes públicas.
-- La observación es opcional y se almacena únicamente dentro de la línea
-- server-derived de public.cotizaciones_leads.articulos_cotizados.
-- No cambia tablas, columnas, RLS, grants ni la firma de la RPC.

BEGIN;

CREATE OR REPLACE FUNCTION public.submit_public_quote_request(
  p_request_id uuid,
  p_contact jsonb,
  p_quote_format text,
  p_items jsonb
)
RETURNS TABLE (
  quote_id uuid,
  reused boolean,
  pricing_mode text,
  total_estimated numeric,
  item_count integer,
  request_quote_item_count integer
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_name text;
  v_company text;
  v_email text;
  v_phone text;
  v_phone_digits text;
  v_quote_format text;
  v_email_hash text;
  v_phone_hash text;
  v_fingerprint text;
  v_existing public.cotizaciones_leads%ROWTYPE;
  v_idempotency_lock bigint;
  v_email_lock bigint;
  v_phone_lock bigint;
  v_recent_count integer;

  v_item jsonb;
  v_item_index integer;
  v_product_id uuid;
  v_quantity integer;
  v_color text;
  v_observation text;
  v_personalization jsonb;
  v_product record;
  v_price record;
  v_line_subtotal numeric;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_item_count integer := 0;
  v_request_quote_count integer := 0;
  v_has_request_quote boolean := false;
  v_has_v2_generation boolean := false;
  v_pricing_mode text := 'legacy';
  v_quote_id uuid;
BEGIN
  -- Identidad e inputs básicos.
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'request_id_required'
      USING ERRCODE = '22004';
  END IF;

  IF p_contact IS NULL OR jsonb_typeof(p_contact) <> 'object' THEN
    RAISE EXCEPTION 'contact_must_be_object'
      USING ERRCODE = '22023';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'items_must_be_array'
      USING ERRCODE = '22023';
  END IF;

  IF octet_length(p_contact::text) > 5000 THEN
    RAISE EXCEPTION 'contact_payload_too_large'
      USING ERRCODE = '22023';
  END IF;

  IF octet_length(p_items::text) > 100000 THEN
    RAISE EXCEPTION 'items_payload_too_large'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_items) < 1
     OR jsonb_array_length(p_items) > 50
  THEN
    RAISE EXCEPTION 'items_count_out_of_range'
      USING ERRCODE = '22023';
  END IF;

  -- Valida observaciones antes del fingerprint y de la ruta de idempotencia.
  -- Esto evita aceptar un payload inválido solo por reutilizar request_id.
  FOR v_item, v_item_index IN
    SELECT element.value, element.ordinality::integer
    FROM jsonb_array_elements(p_items)
      WITH ORDINALITY AS element(value, ordinality)
  LOOP
    IF jsonb_typeof(v_item) = 'object'
       AND v_item ? 'observation'
    THEN
      IF jsonb_typeof(v_item -> 'observation') = 'null' THEN
        p_items := p_items #- ARRAY[
          (v_item_index - 1)::text,
          'observation'
        ];
      ELSIF jsonb_typeof(v_item -> 'observation') IS DISTINCT FROM 'string' THEN
        RAISE EXCEPTION 'observation_must_be_string'
          USING
            ERRCODE = '22023',
            DETAIL = format('item_index=%s', v_item_index);
      ELSE
        v_observation := NULLIF(btrim(v_item ->> 'observation'), '');

        IF v_observation IS NOT NULL
           AND char_length(v_observation) > 500
        THEN
          RAISE EXCEPTION 'observation_too_long'
            USING
              ERRCODE = '22023',
              DETAIL = format('item_index=%s', v_item_index);
        END IF;

        IF v_observation IS NULL THEN
          p_items := p_items #- ARRAY[
            (v_item_index - 1)::text,
            'observation'
          ];
        ELSE
          p_items := jsonb_set(
            p_items,
            ARRAY[(v_item_index - 1)::text, 'observation'],
            to_jsonb(v_observation),
            true
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  v_name := btrim(COALESCE(p_contact ->> 'name', ''));
  v_company := btrim(COALESCE(p_contact ->> 'company', ''));
  v_email := lower(btrim(COALESCE(p_contact ->> 'email', '')));
  v_phone := btrim(COALESCE(p_contact ->> 'phone', ''));
  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');
  v_quote_format := lower(btrim(COALESCE(p_quote_format, '')));

  IF char_length(v_name) < 2 OR char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'invalid_contact_name'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_company) < 2 OR char_length(v_company) > 160 THEN
    RAISE EXCEPTION 'invalid_contact_company'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_email) < 5
     OR char_length(v_email) > 254
     OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN
    RAISE EXCEPTION 'invalid_contact_email'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(v_phone_digits) < 10
     OR char_length(v_phone_digits) > 15
  THEN
    RAISE EXCEPTION 'invalid_contact_phone'
      USING ERRCODE = '22023';
  END IF;

  IF v_quote_format NOT IN ('individual', 'kit') THEN
    RAISE EXCEPTION 'invalid_quote_format'
      USING ERRCODE = '22023';
  END IF;

  v_email_hash := md5(v_email);
  v_phone_hash := md5(v_phone_digits);

  v_fingerprint := md5(
    jsonb_build_object(
      'contact', jsonb_build_object(
        'name', v_name,
        'company', v_company,
        'email', v_email,
        'phone', v_phone_digits
      ),
      'quote_format', v_quote_format,
      'items', p_items
    )::text
  );

  -- Serializa reintentos con la misma llave.
  v_idempotency_lock :=
    hashtextextended('public-quote-request:' || p_request_id::text, 0);

  PERFORM pg_catalog.pg_advisory_xact_lock(v_idempotency_lock);

  SELECT *
  INTO v_existing
  FROM public.cotizaciones_leads
  WHERE public_request_id = p_request_id
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.public_request_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RAISE EXCEPTION 'idempotency_key_conflict'
        USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT
      v_existing.id,
      true,
      COALESCE(
        NULLIF(v_existing.datos_cliente ->> 'pricing_mode', ''),
        'legacy'
      ),
      v_existing.total_estimado,
      jsonb_array_length(v_existing.articulos_cotizados),
      (
        SELECT count(*)::integer
        FROM jsonb_array_elements(v_existing.articulos_cotizados) AS line(value)
        WHERE line.value ->> 'public_price_status' = 'request_quote'
      );

    RETURN;
  END IF;

  -- Rate limit concurrente: máximo 3 solicitudes por correo o teléfono
  -- dentro de una ventana móvil de 15 minutos.
  v_email_lock := hashtextextended('public-quote-email:' || v_email_hash, 0);
  v_phone_lock := hashtextextended('public-quote-phone:' || v_phone_hash, 0);

  IF v_email_lock <= v_phone_lock THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(v_email_lock);
    PERFORM pg_catalog.pg_advisory_xact_lock(v_phone_lock);
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(v_phone_lock);
    PERFORM pg_catalog.pg_advisory_xact_lock(v_email_lock);
  END IF;

  SELECT count(*)::integer
  INTO v_recent_count
  FROM public.cotizaciones_leads
  WHERE public_submission = true
    AND created_at >= now() - interval '15 minutes'
    AND (
      public_email_hash = v_email_hash
      OR public_phone_hash = v_phone_hash
    );

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = 'P0001';
  END IF;

  -- Recalcula y normaliza todas las líneas en servidor.
  FOR v_item, v_item_index IN
    SELECT element.value, element.ordinality::integer
    FROM jsonb_array_elements(p_items)
      WITH ORDINALITY AS element(value, ordinality)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION 'item_must_be_object'
        USING
          ERRCODE = '22023',
          DETAIL = format('item_index=%s', v_item_index);
    END IF;

    v_observation := CASE
      WHEN jsonb_typeof(v_item -> 'observation') = 'string'
      THEN NULLIF(btrim(v_item ->> 'observation'), '')
      ELSE NULL
    END;


    BEGIN
      v_product_id := NULLIF(btrim(v_item ->> 'product_id'), '')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'invalid_product_id'
          USING
            ERRCODE = '22023',
            DETAIL = format('item_index=%s', v_item_index);
    END;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'product_id_required'
        USING
          ERRCODE = '22004',
          DETAIL = format('item_index=%s', v_item_index);
    END IF;

    IF COALESCE(v_item ->> 'quantity', '') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'invalid_quantity'
        USING
          ERRCODE = '22023',
          DETAIL = format('item_index=%s', v_item_index);
    END IF;

    BEGIN
      v_quantity := (v_item ->> 'quantity')::integer;
    EXCEPTION
      WHEN numeric_value_out_of_range THEN
        RAISE EXCEPTION 'invalid_quantity'
          USING
            ERRCODE = '22023',
            DETAIL = format('item_index=%s', v_item_index);
    END;

    IF v_quantity < 1 OR v_quantity > 1000000 THEN
      RAISE EXCEPTION 'invalid_quantity'
        USING
          ERRCODE = '22023',
          DETAIL = format('item_index=%s', v_item_index);
    END IF;

    v_color := CASE jsonb_typeof(v_item -> 'color')
      WHEN 'string' THEN NULLIF(btrim(v_item ->> 'color'), '')
      WHEN 'object' THEN NULLIF(
        btrim(
          COALESCE(
            v_item -> 'color' ->> 'name',
            v_item -> 'color' ->> 'label',
            ''
          )
        ),
        ''
      )
      ELSE NULL
    END;

    IF v_color IS NOT NULL AND char_length(v_color) > 120 THEN
      RAISE EXCEPTION 'color_too_long'
        USING
          ERRCODE = '22023',
          DETAIL = format('item_index=%s', v_item_index);
    END IF;

    IF jsonb_typeof(v_item -> 'personalization') = 'object' THEN
      IF octet_length((v_item -> 'personalization')::text) > 4000 THEN
        RAISE EXCEPTION 'personalization_payload_too_large'
          USING
            ERRCODE = '22023',
            DETAIL = format('item_index=%s', v_item_index);
      END IF;

      v_personalization := jsonb_strip_nulls(
        jsonb_build_object(
          'type', NULLIF(
            left(btrim(v_item -> 'personalization' ->> 'type'), 80),
            ''
          ),
          'label', NULLIF(
            left(btrim(v_item -> 'personalization' ->> 'label'), 160),
            ''
          ),
          'message', NULLIF(
            left(btrim(v_item -> 'personalization' ->> 'message'), 500),
            ''
          ),
          'requires_review',
            CASE
              WHEN jsonb_typeof(
                v_item -> 'personalization' -> 'requires_review'
              ) = 'boolean'
              THEN (
                v_item -> 'personalization' ->> 'requires_review'
              )::boolean
              ELSE NULL
            END
        )
      );
    ELSE
      v_personalization := '{}'::jsonb;
    END IF;

    SELECT
      pp.id,
      pp.id_interno,
      pp.sku_base,
      pp.datos_generales,
      pp.categoria_principal
    INTO v_product
    FROM public.productos_publicos AS pp
    WHERE pp.id = v_product_id
    ORDER BY pp.updated_at DESC NULLS LAST
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product_unavailable'
        USING
          ERRCODE = 'P0001',
          DETAIL = format(
            'item_index=%s product_id=%s',
            v_item_index,
            v_product_id
          );
    END IF;

    SELECT *
    INTO v_price
    FROM public.get_public_product_price_quote(
      v_product_id,
      v_quantity
    )
    LIMIT 1;

    IF NOT FOUND OR v_price.public_price_status IS NULL THEN
      RAISE EXCEPTION 'price_contract_unavailable'
        USING
          ERRCODE = 'P0001',
          DETAIL = format(
            'item_index=%s product_id=%s',
            v_item_index,
            v_product_id
          );
    END IF;

    IF v_price.public_price_status = 'below_minimum' THEN
      RAISE EXCEPTION 'product_below_minimum'
        USING
          ERRCODE = 'P0001',
          DETAIL = format(
            'item_index=%s product_id=%s minimum_quantity=%s',
            v_item_index,
            v_product_id,
            COALESCE(v_price.minimum_quantity::text, 'unknown')
          );
    END IF;

    IF v_price.public_price_status = 'unavailable' THEN
      RAISE EXCEPTION 'product_unavailable'
        USING
          ERRCODE = 'P0001',
          DETAIL = format(
            'item_index=%s product_id=%s',
            v_item_index,
            v_product_id
          );
    END IF;

    IF v_price.public_price_status NOT IN ('priced', 'request_quote') THEN
      RAISE EXCEPTION 'unsupported_public_price_status'
        USING
          ERRCODE = 'P0001',
          DETAIL = format(
            'item_index=%s product_id=%s status=%s',
            v_item_index,
            v_product_id,
            v_price.public_price_status
          );
    END IF;

    IF v_price.public_price_status = 'priced' THEN
      IF v_price.price_before_tax_mxn IS NULL
         OR v_price.price_before_tax_mxn <= 0
         OR v_price.is_valid_quantity IS DISTINCT FROM true
      THEN
        RAISE EXCEPTION 'invalid_authoritative_price'
          USING
            ERRCODE = 'P0001',
            DETAIL = format(
              'item_index=%s product_id=%s',
              v_item_index,
              v_product_id
            );
      END IF;

      v_line_subtotal :=
        round(v_price.price_before_tax_mxn * v_quantity, 2);

      v_total := v_total + v_line_subtotal;
    ELSE
      v_line_subtotal := NULL;
      v_has_request_quote := true;
      v_request_quote_count := v_request_quote_count + 1;
    END IF;

    IF v_price.pricing_generation_id IS NOT NULL THEN
      v_has_v2_generation := true;
    END IF;

    v_lines := v_lines || jsonb_build_array(
      jsonb_strip_nulls(
        jsonb_build_object(
          'line_number', v_item_index,
          'observacion', v_observation,
          'producto_id', v_product.id,
          'id_interno', v_product.id_interno,
          'nombre', COALESCE(
            NULLIF(v_product.datos_generales ->> 'nombre', ''),
            v_product.id_interno,
            'Producto'
          ),
          'sku', COALESCE(
            NULLIF(v_product.datos_generales ->> 'clave_producto', ''),
            NULLIF(v_product.sku_base, ''),
            v_product.id_interno
          ),
          'clave_producto', COALESCE(
            NULLIF(v_product.datos_generales ->> 'clave_producto', ''),
            NULLIF(v_product.sku_base, ''),
            v_product.id_interno
          ),
          'modelo_comercial', COALESCE(
            NULLIF(v_product.datos_generales ->> 'modelo_comercial', ''),
            NULLIF(v_product.datos_generales ->> 'nombre', ''),
            v_product.id_interno
          ),
          'descripcion', COALESCE(
            NULLIF(v_product.datos_generales ->> 'descripcion', ''),
            NULLIF(v_product.datos_generales ->> 'nombre', ''),
            v_product.id_interno
          ),
          'categoria_principal', v_product.categoria_principal,
          'color', v_color,
          'cantidad', v_quantity,
          'public_price_status', v_price.public_price_status,
          'precio_unitario_estimado', v_price.price_before_tax_mxn,
          'subtotal', v_line_subtotal,
          'currency', COALESCE(v_price.currency, 'MXN'),
          'minimum_quantity', v_price.minimum_quantity,
          'pricing_generation_id', v_price.pricing_generation_id,
          'requested_quantity', v_price.requested_quantity,
          'is_valid_quantity', v_price.is_valid_quantity,
          'personalizacion_solicitada_cliente', v_personalization,
          'personalizacion', COALESCE(
            NULLIF(v_personalization ->> 'label', ''),
            NULLIF(v_personalization ->> 'type', ''),
            'Por definir con asesor'
          ),
          'requiere_revision_tecnica', COALESCE(
            (v_personalization ->> 'requires_review')::boolean,
            true
          ),
          'entrega_estimada',
            NULLIF(v_product.datos_generales ->> 'entrega_estimada', ''),
          'personalizacion_publica',
            NULLIF(v_product.datos_generales ->> 'personalizacion_publica', '')
        )
      )
    );

    v_item_count := v_item_count + 1;
  END LOOP;

  IF v_has_v2_generation THEN
    v_pricing_mode := 'v2';
  END IF;

  IF v_has_request_quote THEN
    v_total := NULL;
  ELSE
    v_total := round(v_total, 2);
  END IF;

  INSERT INTO public.cotizaciones_leads (
    datos_cliente,
    articulos_cotizados,
    total_estimado,
    estado_cotizacion,
    assigned_to,
    public_request_id,
    public_request_fingerprint,
    public_submission,
    public_email_hash,
    public_phone_hash
  )
  VALUES (
    jsonb_build_object(
      'nombre', v_name,
      'empresa', v_company,
      'email', v_email,
      'telefono', v_phone,
      'formato_propuesta', v_quote_format,
      'modalidad_cotizacion',
        CASE v_quote_format
          WHEN 'individual' THEN 'INDIVIDUAL'
          ELSE 'KIT'
        END,
      'modalidad_cotizacion_label',
        CASE v_quote_format
          WHEN 'individual' THEN 'Cotizar por separado'
          ELSE 'Armar kit o paquete'
        END,
      'pricing_mode', v_pricing_mode,
      'public_request_id', p_request_id
    ),
    v_lines,
    v_total,
    'NUEVA',
    NULL,
    p_request_id,
    v_fingerprint,
    true,
    v_email_hash,
    v_phone_hash
  )
  RETURNING id INTO v_quote_id;

  RETURN QUERY
  SELECT
    v_quote_id,
    false,
    v_pricing_mode,
    v_total,
    v_item_count,
    v_request_quote_count;
END;
$function$;


COMMIT;
