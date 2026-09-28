# Despliegue controlado: analyze-commercial-image

## Estado verificado
- HEAD = `fbc69cf feat: add lovable commercial vision engine`.
- Existe `supabase/functions/analyze-commercial-image/index.ts`; sin bloque propio en `config.toml` (usa el valor por defecto, JWT validado en código).
- Modelo en código: `google/gemini-3.7-flash` (solicitado explícitamente; se conserva).

## Adaptación
Ninguna. El código ya es compatible con el runtime Cloud (`Deno.serve`, `npm:` imports, `LOVABLE_API_KEY` leída server-side, auth vía `getUser()`, CORS con allowlist). No se tocan archivos ni frontend, así que no habrá cambio Git.

## Pasos
1. Confirmar que `LOVABLE_API_KEY` existe (solo nombre, nunca el valor); si falta, provisionarla con la herramienta gestionada.
2. Desplegar solo `analyze-commercial-image`.
3. Verificar: despliegue sin errores, logs de arranque limpios, y una llamada OPTIONS/POST sin sesión que responda 401/403 (prueba que está activa sin invocar IA ni usar datos reales).
4. Detenerse y reportar: desplegada sí/no, status, modelo, cambios (ninguno), cambio Git (no), bloqueos.

## Notas
- Una prueba real de IA requiere sesión autenticada y un fixture QA; no se ejecuta en este paso.
- Riesgo conocido para el paso siguiente: el preview de Lovable (`*.lovable.app`) no está en la allowlist de CORS, solo los dominios propios y localhost.
