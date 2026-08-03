-- Expand phase: backend seguro para cotizaciones públicas y catálogo V2.
-- Esta migración NO revoca todavía el INSERT público legacy para evitar una
-- interrupción antes de desplegar el frontend que consumirá el nuevo RPC.
-- NO publica releases, NO activa V2 y NO modifica precios certificados.

BEGIN;

-- ============================================================================
-- 1. Metadatos mínimos para idempotencia y rate limit
-- ============================================================================

ALTER TABLE public.cotizaciones_leads
  ADD COLUMN IF NOT EXISTS public_request_id uuid,
  ADD COLUMN IF NOT EXISTS public_request_fingerprint text,
  ADD COLUMN IF NOT EXISTS public_submission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_email_hash text,
  ADD COLUMN IF NOT EXISTS public_phone_hash text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.cotizaciones_leads'::regclass
      AND conname = 'cotizaciones_leads_public_request_contract_check'
  ) THEN
    ALTER TABLE public.cotizaciones_leads
      ADD CONSTRAINT cotizaciones_leads_public_request_contract_check
      CHECK (
        NOT public_submission
        OR (
          public_request_id IS NOT NULL
          AND public_request_fingerprint IS NOT NULL
          AND char_length(public_request_fingerprint) = 32
          AND public_email_hash IS NOT NULL
          AND char_length(public_email_hash) = 32
          AND public_phone_hash IS NOT NULL
          AND char_length(public_phone_hash) = 32
        )
      );
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS
  cotizaciones_leads_public_request_id_unique_idx
ON public.cotizaciones_leads (public_request_id)
WHERE public_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  cotizaciones_leads_public_email_rate_idx
ON public.cotizaciones_leads (public_email_hash, created_at DESC)
WHERE public_submission = true
  AND public_email_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS
  cotizaciones_leads_public_phone_rate_idx
ON public.cotizaciones_leads (public_phone_hash, created_at DESC)
WHERE public_submission = true
  AND public_phone_hash IS NOT NULL;

COMMENT ON COLUMN public.cotizaciones_leads.public_request_id IS
  'UUID idempotente generado por el cliente para una solicitud pública.';

COMMENT ON COLUMN public.cotizaciones_leads.public_request_fingerprint IS
  'Fingerprint del payload público normalizado para detectar reutilización conflictiva.';

COMMENT ON COLUMN public.cotizaciones_leads.public_submission IS
  'Indica que la fila fue creada mediante submit_public_quote_request.';

COMMENT ON COLUMN public.cotizaciones_leads.public_email_hash IS
  'Hash MD5 del correo normalizado, usado solo para rate limit.';

COMMENT ON COLUMN public.cotizaciones_leads.public_phone_hash IS
  'Hash MD5 del teléfono normalizado, usado solo para rate limit.';


-- ============================================================================
-- 1.1. Política transitoria: preservar el frontend legacy sin permitir que el
-- cliente falsifique metadatos del nuevo RPC, estado o asignación.
-- ============================================================================

DROP POLICY IF EXISTS "Inserción pública de cotizaciones"
ON public.cotizaciones_leads;

DROP POLICY IF EXISTS anon_insert_cotizaciones_leads
ON public.cotizaciones_leads;

DROP POLICY IF EXISTS legacy_public_insert_cotizaciones_leads
ON public.cotizaciones_leads;

DROP POLICY IF EXISTS staff_insert_cotizaciones_leads
ON public.cotizaciones_leads;

CREATE POLICY legacy_public_insert_cotizaciones_leads
ON public.cotizaciones_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public_submission = false
  AND public_request_id IS NULL
  AND public_request_fingerprint IS NULL
  AND public_email_hash IS NULL
  AND public_phone_hash IS NULL
  AND COALESCE(estado_cotizacion, 'NUEVA') = 'NUEVA'
  AND assigned_to IS NULL
);

CREATE POLICY staff_insert_cotizaciones_leads
ON public.cotizaciones_leads
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

COMMENT ON POLICY legacy_public_insert_cotizaciones_leads
ON public.cotizaciones_leads IS
  'Compatibilidad temporal con el frontend legacy. Impide falsificar metadatos del RPC, estado o asignación.';

COMMENT ON POLICY staff_insert_cotizaciones_leads
ON public.cotizaciones_leads IS
  'Permite inserción administrativa únicamente a usuarios staff.';

-- ============================================================================
-- 2. RPC público idempotente con precio autoritativo
-- ============================================================================

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

REVOKE ALL ON FUNCTION
  public.submit_public_quote_request(uuid, jsonb, text, jsonb)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.submit_public_quote_request(uuid, jsonb, text, jsonb)
TO anon, authenticated;

COMMENT ON FUNCTION
  public.submit_public_quote_request(uuid, jsonb, text, jsonb)
IS
  'Crea cotizaciones públicas idempotentes. Recalcula productos, precios, subtotales y total en servidor; aplica rate limit por contacto.';

-- ============================================================================
-- 3. Catálogo sin N+1 con precio público autoritativo
-- ============================================================================

CREATE OR REPLACE FUNCTION public.catalog_search_products_v2(
  p_query text DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_collection_slug text DEFAULT NULL,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0,
  p_subcategory_slug text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  id_interno text,
  sku_base text,
  nombre text,
  descripcion text,
  imagenes jsonb,
  precio_desde_mxn numeric,
  public_price_status text,
  currency text,
  minimum_quantity integer,
  pricing_generation_id uuid,
  categoria_slug text,
  categoria_nombre text,
  subcategoria_slug text,
  subcategoria_nombre text,
  relevance numeric,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH params AS (
    SELECT
      public.normalize_catalog_text(COALESCE(p_query, '')) AS q,
      NULLIF(trim(p_category_slug), '') AS requested_category_slug,
      NULLIF(trim(p_subcategory_slug), '') AS requested_subcategory_slug,
      NULLIF(trim(p_collection_slug), '') AS collection_slug,
      greatest(least(COALESCE(p_limit, 24), 60), 1) AS safe_limit,
      greatest(COALESCE(p_offset, 0), 0) AS safe_offset
  ),
  matched_aliases AS (
    SELECT
      a.term,
      public.normalize_catalog_text(a.term) AS norm_term,
      a.expanded_terms,
      a.category_slug,
      a.boost
    FROM public.product_search_aliases AS a
    CROSS JOIN params AS p
    WHERE a.is_active = true
      AND p.q <> ''
      AND (
        p.q = public.normalize_catalog_text(a.term)
        OR p.q LIKE '%' || public.normalize_catalog_text(a.term) || '%'
        OR public.normalize_catalog_text(a.term) LIKE '%' || p.q || '%'
      )
  ),
  expanded_terms AS (
    SELECT
      ma.category_slug,
      ma.boost,
      public.normalize_catalog_text(ma.term) AS term
    FROM matched_aliases AS ma

    UNION ALL

    SELECT
      ma.category_slug,
      ma.boost,
      public.normalize_catalog_text(x.term) AS term
    FROM matched_aliases AS ma
    CROSS JOIN LATERAL unnest(ma.expanded_terms) AS x(term)
  ),
  expanded_query AS (
    SELECT
      p.q,
      p.requested_category_slug,
      p.requested_subcategory_slug,
      p.collection_slug,
      p.safe_limit,
      p.safe_offset,
      COALESCE(
        p.requested_category_slug,
        max(et.category_slug) FILTER (WHERE et.category_slug IS NOT NULL)
      ) AS effective_category_slug,
      COALESCE(max(et.boost), 1.00) AS alias_boost,
      array_remove(array_agg(DISTINCT et.term), NULL) AS terms
    FROM params AS p
    LEFT JOIN expanded_terms AS et
      ON true
    GROUP BY
      p.q,
      p.requested_category_slug,
      p.requested_subcategory_slug,
      p.collection_slug,
      p.safe_limit,
      p.safe_offset
  ),
  release_state AS (
    SELECT EXISTS (
      SELECT 1
      FROM public.catalog_price_v2_releases
      WHERE is_current = true
    ) AS has_current_release
  ),
  base_products AS (
    SELECT
      pp.id,
      pp.id_interno,
      pp.sku_base,
      COALESCE(
        pp.datos_generales ->> 'modelo_comercial',
        pp.datos_generales ->> 'nombre',
        pp.datos_generales ->> 'name',
        pp.datos_generales ->> 'title',
        pp.sku_base,
        pp.id_interno
      ) AS nombre,
      COALESCE(
        pp.datos_generales ->> 'descripcion',
        pp.datos_generales ->> 'description',
        ''
      ) AS descripcion,
      pp.imagenes,
      CASE
        WHEN rs.has_current_release THEN
          CASE
            WHEN cp.public_price_status = 'priced'
                 AND cp.price_before_tax_mxn > 0
            THEN round(cp.price_before_tax_mxn, 2)
            ELSE NULL::numeric
          END
        ELSE
          CASE
            WHEN pp.precio_desde_mxn > 0
            THEN round(pp.precio_desde_mxn, 2)
            ELSE NULL::numeric
          END
      END AS precio_desde_mxn,
      CASE
        WHEN rs.has_current_release THEN
          CASE
            WHEN cp.product_id IS NULL THEN 'unavailable'::text
            WHEN cp.public_price_status = 'priced'
                 AND cp.price_before_tax_mxn > 0
            THEN 'priced'::text
            WHEN cp.public_price_status IN ('request_quote', 'unavailable')
            THEN cp.public_price_status
            ELSE 'request_quote'::text
          END
        ELSE
          CASE
            WHEN pp.precio_desde_mxn > 0 THEN 'priced'::text
            ELSE 'request_quote'::text
          END
      END AS public_price_status,
      CASE
        WHEN rs.has_current_release THEN COALESCE(cp.currency, 'MXN')
        ELSE 'MXN'::text
      END AS currency,
      CASE
        WHEN rs.has_current_release THEN cp.minimum_quantity
        WHEN pp.precio_desde_mxn > 0 THEN 1
        ELSE NULL::integer
      END AS minimum_quantity,
      CASE
        WHEN rs.has_current_release THEN cp.generation_id
        ELSE NULL::uuid
      END AS pricing_generation_id,
      pc.slug AS categoria_slug,
      pc.name AS categoria_nombre,
      ps.slug AS subcategoria_slug,
      ps.name AS subcategoria_nombre,
      public.normalize_catalog_text(
        concat_ws(
          ' ',
          pp.id_interno,
          pp.sku_base,
          pp.categoria_principal,
          pp.datos_generales ->> 'clave_producto',
          pp.datos_generales ->> 'modelo_comercial',
          pp.datos_generales ->> 'nombre',
          pp.datos_generales ->> 'name',
          pp.datos_generales ->> 'title',
          pp.datos_generales ->> 'descripcion',
          pp.datos_generales ->> 'description',
          pp.datos_generales ->> 'material',
          pc.name,
          pc.slug,
          ps.name,
          ps.slug
        )
      ) AS search_text,
      public.normalize_catalog_text(
        concat_ws(
          ' ',
          pp.datos_generales ->> 'modelo_comercial',
          pp.datos_generales ->> 'nombre',
          pp.datos_generales ->> 'name',
          pp.datos_generales ->> 'title',
          pp.sku_base,
          pp.id_interno
        )
      ) AS name_text
    FROM public.productos_publicos AS pp
    JOIN public.product_category_assignments AS pca
      ON pca.producto_b2b_id = pp.id
    JOIN public.product_categories AS pc
      ON pc.id = pca.category_id
     AND pc.is_active = true
    LEFT JOIN public.product_subcategory_assignments AS psa
      ON psa.producto_b2b_id = pp.id
    LEFT JOIN public.product_subcategories AS ps
      ON ps.id = psa.subcategory_id
     AND ps.is_active = true
    CROSS JOIN release_state AS rs
    LEFT JOIN public.catalog_price_v2_current_prices AS cp
      ON cp.product_id = pp.id
    WHERE public.product_has_available_stock(pp.variantes) = true
  ),
  scored AS (
    SELECT
      bp.*,
      eq.q,
      eq.terms,
      eq.alias_boost,
      eq.effective_category_slug,
      (
        CASE
          WHEN eq.q = '' THEN 1
          WHEN bp.name_text = eq.q THEN 120
          WHEN bp.name_text LIKE eq.q || '%' THEN 100
          WHEN bp.name_text LIKE '%' || eq.q || '%' THEN 80
          WHEN bp.search_text LIKE '%' || replace(eq.q, ' ', '%') || '%'
            THEN 55
          ELSE 0
        END
        +
        COALESCE((
          SELECT max(
            CASE
              WHEN bp.name_text = t THEN 90
              WHEN bp.name_text LIKE t || '%' THEN 70
              WHEN bp.name_text LIKE '%' || t || '%' THEN 55
              WHEN bp.search_text LIKE '%' || replace(t, ' ', '%') || '%'
                THEN 35
              ELSE 0
            END
          )
          FROM unnest(eq.terms) AS t
        ), 0)
        +
        CASE
          WHEN eq.effective_category_slug IS NOT NULL
            AND bp.categoria_slug = eq.effective_category_slug
          THEN 35
          ELSE 0
        END
        +
        CASE
          WHEN eq.requested_subcategory_slug IS NOT NULL
            AND bp.subcategoria_slug = eq.requested_subcategory_slug
          THEN 25
          ELSE 0
        END
      ) * eq.alias_boost AS relevance
    FROM base_products AS bp
    CROSS JOIN expanded_query AS eq
    WHERE
      (
        eq.effective_category_slug IS NULL
        OR bp.categoria_slug = eq.effective_category_slug
      )
      AND (
        eq.requested_subcategory_slug IS NULL
        OR bp.subcategoria_slug = eq.requested_subcategory_slug
      )
      AND (
        eq.collection_slug IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.product_collection_assignments AS pca2
          JOIN public.product_collections AS pc2
            ON pc2.id = pca2.collection_id
          WHERE pca2.producto_b2b_id = bp.id
            AND pc2.slug = eq.collection_slug
            AND pc2.is_active = true
        )
      )
      AND (
        p_min_price IS NULL
        OR bp.precio_desde_mxn >= p_min_price
      )
      AND (
        p_max_price IS NULL
        OR bp.precio_desde_mxn <= p_max_price
      )
      AND (
        eq.q = ''
        OR bp.search_text LIKE '%' || replace(eq.q, ' ', '%') || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(eq.terms) AS t
          WHERE bp.search_text LIKE '%' || replace(t, ' ', '%') || '%'
        )
        OR (
          eq.effective_category_slug IS NOT NULL
          AND bp.categoria_slug = eq.effective_category_slug
        )
      )
  ),
  ranked AS (
    SELECT
      s.*,
      count(*) OVER () AS total_count
    FROM scored AS s
    WHERE s.relevance > 0
       OR s.q = ''
    ORDER BY
      CASE WHEN s.q = '' THEN 0 ELSE s.relevance END DESC,
      s.precio_desde_mxn ASC NULLS LAST,
      s.id ASC
    LIMIT (SELECT safe_limit FROM expanded_query)
    OFFSET (SELECT safe_offset FROM expanded_query)
  )
  SELECT
    r.id,
    r.id_interno,
    r.sku_base,
    r.nombre,
    r.descripcion,
    r.imagenes,
    r.precio_desde_mxn,
    r.public_price_status,
    r.currency,
    r.minimum_quantity,
    r.pricing_generation_id,
    r.categoria_slug,
    r.categoria_nombre,
    r.subcategoria_slug,
    r.subcategoria_nombre,
    r.relevance,
    r.total_count
  FROM ranked AS r;
$function$;

REVOKE ALL ON FUNCTION
  public.catalog_search_products_v2(
    text,
    text,
    text,
    numeric,
    numeric,
    integer,
    integer,
    text
  )
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.catalog_search_products_v2(
    text,
    text,
    text,
    numeric,
    numeric,
    integer,
    integer,
    text
  )
TO anon, authenticated;

COMMENT ON FUNCTION
  public.catalog_search_products_v2(
    text,
    text,
    text,
    numeric,
    numeric,
    integer,
    integer,
    text
  )
IS
  'Catálogo paginado con precio público, estado, moneda, MOQ y generación sin consultas N+1. Filtra, ordena y pagina con el precio autoritativo; mantiene legacy sin release current.';

COMMIT;
