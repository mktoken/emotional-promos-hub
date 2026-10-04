import { useEffect } from "react";
import { Link } from "react-router-dom";

const EFFECTIVE_DATE = "4 de octubre de 2026";

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-bold text-foreground mt-10 mb-3">{children}</h2>
);
const Ul = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-6 space-y-1">{items.map((i) => <li key={i}>{i}</li>)}</ul>
);
const Mail = () => (
  <a
    href="mailto:admin@unionize.com.mx"
    className="font-semibold text-primary underline break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
  >
    admin@unionize.com.mx
  </a>
);

const PrivacyNotice = () => {
  useEffect(() => {
    document.title = "Aviso de Privacidad | Promocionales Emocionales";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            to="/"
            className="text-sm font-semibold text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10 text-foreground/90 leading-relaxed break-words">
        <h1 className="text-3xl sm:text-4xl font-black text-foreground">Aviso de Privacidad</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Versión: PE-PRIVACY-V1 · Fecha efectiva: {EFFECTIVE_DATE}
        </p>

        <H2>1. Responsable</H2>
        <p>UNIONIZE S.A. DE C.V.</p>
        <p className="mt-2">
          Domicilio: Antonio M. Anza 48, Ciudad Satélite, Naucalpan, Estado de México, C.P. 53100, México.
        </p>

        <H2>2. Datos que pueden solicitarse</H2>
        <p className="mb-2">Para atender una solicitud de proyecto pueden solicitarse:</p>
        <Ul items={[
          "nombre;", "empresa o marca, opcional;", "correo electrónico o teléfono;", "objetivo del proyecto;",
          "cantidad estimada o indicación de que aún no se conoce;", "fecha objetivo o indicación de que aún no se conoce;",
          "ocasión;", "audiencia;", "presupuesto;", "ciudad;", "interés de producto o categoría;", "personalización;",
          "comentarios;", "metadatos técnicos necesarios para operar y proteger el sitio.",
        ]} />
        <p className="mt-2">No se solicitan datos personales sensibles, datos de pago ni archivos adjuntos en este formulario.</p>

        <H2>3. Finalidades primarias</H2>
        <p className="mb-2">Los datos se tratarán para:</p>
        <Ul items={[
          "recibir la solicitud;", "revisarla;", "determinar su viabilidad comercial;", "contactar a la persona solicitante;",
          "preparar información comercial o una cotización cuando resulte viable;", "realizar seguimiento interno de la solicitud.",
        ]} />
        <p className="mt-2">El envío de una solicitud no confirma una compra, pedido, producción, disponibilidad ni entrega.</p>

        <H2>4. Marketing</H2>
        <p>El marketing no forma parte de la solicitud de proyecto.</p>
        <p className="mt-2">No se utilizará el envío de la solicitud como autorización automática para comunicaciones comerciales.</p>

        <H2>5. Consentimiento</H2>
        <p>La persona solicitante deberá aceptar de forma separada el Aviso de Privacidad antes de enviar la solicitud, mediante el siguiente texto:</p>
        <blockquote className="mt-2 border-l-4 border-primary pl-4 italic">
          “He leído el Aviso de Privacidad y autorizo el uso de mis datos para revisar esta solicitud y contactarme sobre ella.”
        </blockquote>
        <p className="mt-2">La versión, URL y fecha/hora del consentimiento deberán conservarse junto con la solicitud cuando el flujo real sea implementado.</p>

        <H2>6. Revocación y limitación</H2>
        <p>La persona titular podrá solicitar la revocación del consentimiento o la limitación del uso de sus datos mediante el correo: <Mail /></p>

        <H2>7. Derechos ARCO</H2>
        <p>La persona titular podrá ejercer sus derechos de acceso, rectificación, cancelación u oposición mediante el correo: <Mail /></p>

        <H2>8. Encargados y proveedores tecnológicos</H2>
        <p className="mb-2">Para operar el sitio y atender solicitudes pueden utilizarse proveedores tecnológicos de:</p>
        <Ul items={[
          "base de datos, funciones server-side y almacenamiento operativo;", "hosting y runtime;",
          "seguridad y entrega de contenido;", "analítica técnica de disponibilidad y rendimiento.",
        ]} />

        <H2>9. Transferencias y procesamiento internacional</H2>
        <p>Puede existir procesamiento técnico fuera de México mediante infraestructura tecnológica o subencargados que presten servicios de hosting, base de datos, seguridad y entrega de contenido.</p>

        <H2>10. Cookies y almacenamiento técnico</H2>
        <p className="mb-2">El sitio puede utilizar las siguientes cookies:</p>
        <Ul items={[
          "session-id, para sesión de analítica técnica;", "__cf_bm, para seguridad y protección anti-bot;",
          "sidebar:state, para conservar una preferencia visual.",
        ]} />
        <p className="mt-2">Además de cookies, pueden utilizarse mecanismos de almacenamiento del navegador (localStorage y sessionStorage) para funciones técnicas, estado de sesión, navegación o funcionalidades internas.</p>

        <H2>11. Analítica técnica de hosting</H2>
        <p className="mb-2">El sitio carga analítica técnica de hosting mediante /~flock.js, que puede procesar:</p>
        <Ul items={[
          "URL y ruta;", "referrer;", "navegador/dispositivo;", "locale;", "país;", "identificador de sesión;", "métricas de rendimiento.",
        ]} />
        <p className="mt-2">No se afirma que esta analítica constituya publicidad conductual, perfilado comercial o atribución de marketing.</p>

        <H2>12. Seguridad y confidencialidad</H2>
        <p>Se aplicarán medidas técnicas y organizativas razonables para proteger la información contra acceso, pérdida, alteración o divulgación no autorizada.</p>

        <H2>13. Conservación</H2>
        <Ul items={[
          "Solicitudes no convertidas: 90 días desde la última actividad comercial.",
          "Registros técnicos o de seguridad: 30 días, salvo incidente, investigación o necesidad autorizada.",
          "Solicitudes convertidas: durante la relación comercial y los periodos exigidos por obligaciones legales o contables aplicables.",
          "Evidencia de consentimiento: durante el periodo aplicable a la solicitud o relación correspondiente.",
        ]} />

        <H2>14. Cambios al aviso</H2>
        <p>Cualquier modificación relevante se publicará con una nueva versión y fecha efectiva.</p>

        <H2>15. Contacto</H2>
        <p>Correo general y ARCO: <Mail /></p>
      </main>
    </div>
  );
};

export default PrivacyNotice;
