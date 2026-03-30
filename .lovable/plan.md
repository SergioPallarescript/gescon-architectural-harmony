

## Plan: Personalización completa de emails con herramientas gestionadas

### Problema diagnosticado

El sistema actual tiene un fallo fundamental: **el auth-email-hook no está correctamente activado** en el sistema de autenticación. Por eso:
- El campo "From" muestra "TECTRA" (nombre antiguo por defecto) en lugar de "TEKTRA"
- El "Subject" aparece en inglés ("Confirm your email") — es la plantilla por defecto, no la personalizada
- El cuerpo tiene errores de codificación ("gesti��n")

Esto significa que las plantillas personalizadas en el código **no se están usando** para los emails de auth. El sistema cae al comportamiento por defecto.

### Solución

Usaremos las herramientas gestionadas de Lovable para reconstruir y activar correctamente todo el sistema de emails:

#### Paso 1: Re-scaffolding de plantillas Auth
- Ejecutar `scaffold_auth_email_templates` para regenerar correctamente el auth-email-hook con la integración adecuada al sistema gestionado
- Esto asegura que el hook esté correctamente registrado y activado

#### Paso 2: Personalización de plantillas
- Aplicar la marca TEKTRA a todas las plantillas
- Remitente visible: **TEKTRA : gestión integral de obra**
- Todos los textos en español
- Subjects en español
- Corregir los problemas de codificación de caracteres
- Botones negros (#000000) con texto blanco
- Tipografía Montserrat

#### Paso 3: Configurar invitaciones como App Email (correo propio)
- Ejecutar `scaffold_transactional_email` para crear la infraestructura de correos de la app
- Crear plantilla de invitación personalizada con nombre de proyecto dinámico
- Asunto: "🏗️ Invitación al proyecto: {{projectName}} en TEKTRA"
- Modificar el flujo de invitación en `ProjectDetail.tsx` para usar `send-transactional-email` en lugar del `inviteUserByEmail` de auth
- Crear página de cancelación de suscripción

#### Paso 4: Despliegue
- Desplegar `auth-email-hook` y `send-transactional-email`
- Verificar que los emails llegan correctamente

### Detalle técnico

**Archivos que se modificarán:**
- `supabase/functions/_shared/email-templates/` — 6 plantillas auth (regeneradas por herramienta + personalizadas)
- `supabase/functions/auth-email-hook/index.ts` — Regenerado por herramienta + personalizado
- `supabase/functions/_shared/transactional-email-templates/` — Nueva plantilla de invitación
- `supabase/functions/send-transactional-email/` — Nuevo edge function
- `src/pages/ProjectDetail.tsx` — Cambiar flujo de invitación a correo propio
- `supabase/functions/manage-project/index.ts` — Eliminar acción `send_invite_email` antigua
- Nueva página de cancelación de suscripción en la app

**Resultado esperado:**
- From: "TEKTRA : gestión integral de obra <noreply@tektra.es>"
- Subjects todos en español
- Sin errores de codificación
- Invitaciones como correo propio con nombre de proyecto dinámico

