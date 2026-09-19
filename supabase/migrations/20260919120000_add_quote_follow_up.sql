-- Seguimiento programado para oportunidades recibidas desde el flujo público.
ALTER TABLE public.cotizaciones_leads
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cotizaciones_leads_next_follow_up
  ON public.cotizaciones_leads (next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

-- RPC de alcance mínimo: no abre UPDATE general sobre cotizaciones_leads.
CREATE OR REPLACE FUNCTION public.set_cotizacion_lead_follow_up(
  p_cotizacion_lead_id uuid,
  p_next_follow_up_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'staff_required';
  END IF;

  UPDATE public.cotizaciones_leads
  SET next_follow_up_at = p_next_follow_up_at
  WHERE id = p_cotizacion_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cotizacion_lead_not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_cotizacion_lead_follow_up(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_cotizacion_lead_follow_up(uuid, timestamptz) TO authenticated;
