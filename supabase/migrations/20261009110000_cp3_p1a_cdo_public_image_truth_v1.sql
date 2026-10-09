-- CP-3 P1-A: reconcile the five CDO public image references with
-- deterministic variant images already persisted for the same products.
-- No stock, pricing, mapping, scheduler, or provider data is changed.

BEGIN;

DO $$
DECLARE
  v_product_count integer;
  v_status_count integer;
BEGIN
  SELECT count(*)
  INTO v_product_count
  FROM public.productos_b2b
  WHERE id IN (
    '6c032c97-0930-4e61-9e92-2a5fe89251d1'::uuid,
    'a2ba99ab-d9bd-4832-b304-335d86ab7278'::uuid,
    'ec670e1e-3512-45f5-95db-7c93565b1cbf'::uuid,
    'b829c837-0466-40aa-9d5e-c21fec40fc58'::uuid,
    'e366a6df-6696-474d-af6c-78e673442201'::uuid
  );

  IF v_product_count <> 5 THEN
    RAISE EXCEPTION 'CP-3 P1-A: expected exactly five CDO products, found %', v_product_count;
  END IF;

  SELECT count(*)
  INTO v_status_count
  FROM (
    SELECT DISTINCT ON (s.producto_b2b_id) s.producto_b2b_id
    FROM public.producto_b2b_status s
    WHERE s.producto_b2b_id IN (
      '6c032c97-0930-4e61-9e92-2a5fe89251d1'::uuid,
      'a2ba99ab-d9bd-4832-b304-335d86ab7278'::uuid,
      'ec670e1e-3512-45f5-95db-7c93565b1cbf'::uuid,
      'b829c837-0466-40aa-9d5e-c21fec40fc58'::uuid,
      'e366a6df-6696-474d-af6c-78e673442201'::uuid
    )
    ORDER BY s.producto_b2b_id, s.updated_at DESC NULLS LAST, s.id DESC
  ) latest_status;

  IF v_status_count <> 5 THEN
    RAISE EXCEPTION 'CP-3 P1-A: expected one current status per CDO product, found %', v_status_count;
  END IF;
END
$$;

WITH patch(product_id, new_images) AS (
  VALUES
    ('6c032c97-0930-4e61-9e92-2a5fe89251d1'::uuid, '["https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/162/090/original/alt_promocional_publicitario-mochila_C578_negro_2_logo.jpg?1760634894","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/162/100/original/alt_promocional_publicitario-mochila_C578_azul_2_logo.jpg?1760634956","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/162/114/original/alt_promocional_publicitario-mochila_C578_rojo_2_logo.jpg?1760635001","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/162/124/original/alt_promocional_publicitario-mochila_C578_celeste_2_logo.jpg?1760635127","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/164/270/original/alt_promocional_publicitario-mochila_C578_verde_2_logo.jpg?1764369092","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/164/279/original/alt_promocional_publicitario-mochila_C578_verdemilitar_2_logo.jpg?1764369685"]'::jsonb),
    ('a2ba99ab-d9bd-4832-b304-335d86ab7278'::uuid, '["https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/098/657/original/promocional_publicitario_libreta_verde_T164_cerrada_logo.jpg?1668460699","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/098/665/original/promocional_publicitario_libreta_negro_T164_cerrada_logo.jpg?1668460750","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/098/677/original/promocional_publicitario_libreta_rojo_T164_cerrada_logo.jpg?1668460794","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/101/801/original/alt_promocional_publicitario_libreta_ecologica_T164_azul_logo.jpg?1672324994"]'::jsonb),
    ('ec670e1e-3512-45f5-95db-7c93565b1cbf'::uuid, '["https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/110/original/alt_promocional_publicitario_Vaso_acero_inoxidable_T702-nude_1_logo.jpg?1738086339","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/129/original/alt_promocional_publicitario_Vaso_acero_inoxidable_T702-rosa_1_logo.jpg?1738086414","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/146/original/alt_promocional_publicitario_Vaso_acero_inoxidable_T702-gris_1_logo.jpg?1738086495","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/189/original/alt_promocional_publicitario_Vaso_acero_inoxidable_T702-azul_1_logo.jpg?1738086682","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/195/original/alt_promocional_publicitario_Vaso_acero_inoxidable_T702-Negro_1_logo.jpg?1738086750","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/165/779/original/alt_promocional_publicitario_Vaso_acero_inoxidable_T702_verde_mexico_1_logo.jpg?1771622614"]'::jsonb),
    ('b829c837-0466-40aa-9d5e-c21fec40fc58'::uuid, '["https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/956/original/alt_promocional_publicitario_libreta_T723_plata_2_logo.jpg?1738694928","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/968/original/alt_promocional_publicitario_libreta_T723_negro_2_logo.jpg?1738695113","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/977/original/alt_promocional_publicitario_libreta_T723_navy_2_logo.jpg?1738695169","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/146/987/original/alt_promocional_publicitario_libreta_T723_rojo_2_logo.jpg?1738695239","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/156/021/original/alt_promocional_publicitario_libreta_T723_aqua_2_logo.jpg?1753305826","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/156/037/original/alt_promocional_publicitario_libreta_T723_rosa_2_logo.jpg?1753305919","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/156/053/original/alt_promocional_publicitario_libreta_T723_naranja_2_logo.jpg?1753305969","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/156/069/original/alt_promocional_publicitario_libreta_T723_amarillo_2_logo.jpg?1753306009","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/166/614/original/alt_promocional_publicitario_libreta_T723_verde_2_logo.jpg?1772801299"]'::jsonb),
    ('e366a6df-6696-474d-af6c-78e673442201'::uuid, '["https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/149/126/original/alt_-promocional_publicitario_vaso_plastico_T731_blanco_1_logo.jpg?1740686370","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/149/148/original/alt_-promocional_publicitario_vaso_plastico_T731_rojo_1_logo.jpg?1740686517","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/149/163/original/alt_-promocional_publicitario_vaso_plastico_T731_fucsia_1_logo.jpg?1740686575","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/149/180/original/alt_-promocional_publicitario_vaso_plastico_T731_royal_1_logo.jpg?1740686632","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/149/195/original/alt_-promocional_publicitario_vaso_plastico_T731_navy_1_logo.jpg?1740686692","https://d2jygl58194cng.cloudfront.net/product_images/pictures/000/149/212/original/alt_-promocional_publicitario_vaso_plastico_T731_negro_1_logo.jpg?1740686745"]'::jsonb)
), updated_products AS (
  UPDATE public.productos_b2b p
  SET imagenes = patch.new_images
  FROM patch
  WHERE p.id = patch.product_id
    AND p.imagenes IS DISTINCT FROM patch.new_images
  RETURNING p.id
), ranked_status AS (
  SELECT s.id, patch.product_id,
         row_number() OVER (PARTITION BY s.producto_b2b_id ORDER BY s.updated_at DESC NULLS LAST, s.id DESC) AS rn
  FROM public.producto_b2b_status s
  JOIN patch ON patch.product_id = s.producto_b2b_id
), updated_status AS (
  UPDATE public.producto_b2b_status s
  SET image_available = true,
      updated_at = now()
  FROM ranked_status r
  WHERE s.id = r.id
    AND r.rn = 1
    AND s.image_available IS DISTINCT FROM true
  RETURNING s.id
)
SELECT jsonb_build_object(
  'products_changed', (SELECT count(*)::int FROM updated_products),
  'status_changed', (SELECT count(*)::int FROM updated_status)
) AS cdo_p1a_patch;

COMMIT;
