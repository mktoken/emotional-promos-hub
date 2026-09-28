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
  
EJECUTA AHORA. NO ME ENTREGUES OTRO PLAN.
  El plan anterior está aprobado.
  Realiza las acciones directamente en Emotional Promos Hub:
  1. Verifica que exista el secret gestionado LOVABLE_API_KEY.
     - No muestres su valor.
     - Si falta, créalo únicamente mediante el mecanismo gestionado de Lovable.
  2. Despliega EXCLUSIVAMENTE la Edge Function existente:
  analyze-commercial-image
  3. No modifiques código ni otros recursos.
  4. Una vez desplegada, verifica realmente:
  - que aparezca en Cloud → Edge functions;
  - status Active;
  - despliegue sin errores;
  - logs de arranque sin errores relevantes;
  - OPTIONS sin sesión;
  - POST sin sesión;
  - que POST sin sesión devuelva 401/403;
  - que esa prueba NO invoque Gemini.
  5. No ejecutes todavía el E2E visual autenticado.
  6. No hagas commit ni push.
  NO vuelvas a describir los pasos.
  EJECÚTALOS.
  Cuando hayas terminado, reporta únicamente:
  LOVABLE_API_KEY presente: sí/no
  Función desplegada: sí/no
  Nombre exacto:
  Status:
  Modelo:
  OPTIONS:
  POST sin sesión:
  Logs:
  Cambios de archivos: sí/no
  Cambio Git: sí/no
  Bloqueo restante: